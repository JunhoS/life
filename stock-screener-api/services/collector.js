import db from '../db/db.js'
import {
  fetchCorpCodeZip,
  fetchFinancials,
  fetchAuditOpinion,
  rateLimiter,
  DartDailyLimitError,
} from './dartApi.js'
import { getStandardCode, recordUnmapped, parseAmount } from './accountMapper.js'

// ── 회사 목록 수집 ─────────────────────────────────────────────────
// DART는 전체 고유번호를 ZIP(XML) 파일로 제공. 파싱을 위해 adm-zip 대신
// 직접 구현하면 의존성이 늘어나므로, 여기서는 구조만 정의하고
// 실제 ZIP 파싱은 routes/collect.js에서 처리하거나 추후 라이브러리 추가.
export async function collectCorpCodes() {
  const zipBuffer = await fetchCorpCodeZip()
  return zipBuffer  // 호출자가 ZIP 파싱 후 saveCompanies()를 호출
}

const stmtUpsertCompany = db.prepare(`
  INSERT INTO companies (corp_code, corp_name, stock_code, corp_cls, sector, ceo_name, established, updated_at)
  VALUES (@corp_code, @corp_name, @stock_code, @corp_cls, @sector, @ceo_name, @established, datetime('now'))
  ON CONFLICT(corp_code) DO UPDATE SET
    corp_name   = excluded.corp_name,
    stock_code  = excluded.stock_code,
    corp_cls    = excluded.corp_cls,
    sector      = excluded.sector,
    ceo_name    = excluded.ceo_name,
    established = excluded.established,
    updated_at  = datetime('now')
`)

export const saveCompanies = db.transaction((companies) => {
  for (const c of companies) stmtUpsertCompany.run(c)
})

// ── 재무 / 감사의견 배치 수집 ─────────────────────────────────────────
const CHUNK_SIZE = 100  // 한 번에 처리할 종목 수 (일일 9,500건 / 30개 계정 가정)

export async function collectFinancials({ year, reportCode = '11011', fsDiv = 'CFS', progressId = null, offset = 0, batchSize = null } = {}) {
  const allCorps = db.prepare(
    "SELECT corp_code FROM companies WHERE stock_code IS NOT NULL AND stock_code != '' ORDER BY corp_code"
  ).all()

  // offset/batchSize로 처리 범위 제한
  const corps = batchSize != null
    ? allCorps.slice(Number(offset), Number(offset) + Number(batchSize))
    : allCorps.slice(Number(offset))

  // task_type에 offset 인코딩 → 배치별 독립 진행 관리
  const taskType = `financial:${offset}`
  const progress = getOrCreateProgress({ task_type: taskType, fiscal_year: year, total_corps: allCorps.length, progressId })
  const startIdx = getResumeIndex(corps, progress.last_corp_code)

  console.log(`[수집] 재무제표 시작 — ${year}년 | 배치 ${corps.length}건 (전체 ${allCorps.length}건 중 offset=${offset}) | ${startIdx}번부터 이어서`)

  for (let i = startIdx; i < corps.length; i += CHUNK_SIZE) {
    if (rateLimiter.isDailyLimitReached()) {
      updateProgress(progress.id, { status: 'paused', last_corp_code: corps[i]?.corp_code })
      console.log('[수집] 일일 한도 도달 → 수집 일시정지')
      return { status: 'paused', processedCount: i }
    }

    const chunk = corps.slice(i, i + CHUNK_SIZE)
    for (const { corp_code } of chunk) {
      try {
        const data = await fetchFinancials(corp_code, year, reportCode, fsDiv)
        if (data.list) saveFinancials(corp_code, year, reportCode, fsDiv, data.list, data.corp_cls)
        logCollection({ task_type: taskType, corp_code, status: 'success' })
      } catch (err) {
        if (err instanceof DartDailyLimitError) {
          updateProgress(progress.id, { status: 'paused', last_corp_code: corp_code })
          return { status: 'paused', processedCount: i }
        }
        logCollection({ task_type: taskType, corp_code, status: 'fail', error_msg: err.message })
      }
      updateProgress(progress.id, { processed_corps: i + 1, last_corp_code: corp_code })
    }
  }

  updateProgress(progress.id, { status: 'done', last_corp_code: null })
  console.log(`[수집] 재무제표 완료 — ${year}년`)
  return { status: 'done', processedCount: corps.length }
}

export async function collectAuditOpinions({ year, reportCode = '11011', progressId = null } = {}) {
  const corps = db.prepare(
    "SELECT corp_code FROM companies WHERE stock_code IS NOT NULL AND stock_code != '' ORDER BY corp_code"
  ).all()

  const progress = getOrCreateProgress({ task_type: 'audit', fiscal_year: year, total_corps: corps.length, progressId })
  const startIdx = getResumeIndex(corps, progress.last_corp_code)

  console.log(`[수집] 감사의견 시작 — ${year}년 | 대상 ${corps.length}건 | ${startIdx}번부터 이어서`)

  for (let i = startIdx; i < corps.length; i++) {
    if (rateLimiter.isDailyLimitReached()) {
      updateProgress(progress.id, { status: 'paused', last_corp_code: corps[i]?.corp_code })
      console.log('[수집] 일일 한도 도달 → 수집 일시정지')
      return { status: 'paused', processedCount: i }
    }

    const { corp_code } = corps[i]
    try {
      // fetchAuditOpinion = 공시목록(list.json) 조회
      // 감사의견 텍스트는 DART JSON API로 직접 제공되지 않으므로
      // 공시 접수번호(rcept_no)만 저장하고, 의견 텍스트는 추후 문서 파싱 방식으로 확장
      const data = await fetchAuditOpinion(corp_code, year, reportCode)
      if (data.list?.length) saveAuditOpinion(corp_code, year, data.list[0])
      logCollection({ task_type: 'audit', corp_code, status: 'success' })
    } catch (err) {
      if (err instanceof DartDailyLimitError) {
        updateProgress(progress.id, { status: 'paused', last_corp_code: corp_code })
        return { status: 'paused', processedCount: i }
      }
      logCollection({ task_type: 'audit', corp_code, status: 'fail', error_msg: err.message })
    }
    updateProgress(progress.id, { processed_corps: i + 1, last_corp_code: corp_code })
  }

  updateProgress(progress.id, { status: 'done', last_corp_code: null })
  console.log(`[수집] 감사의견 완료 — ${year}년`)
  return { status: 'done', processedCount: corps.length }
}

// ── 저장 ────────────────────────────────────────────────────────────
const stmtUpsertFinancial = db.prepare(`
  INSERT INTO financials (corp_code, fiscal_year, report_code, account_name, standard_code, amount, currency, fs_div)
  VALUES (@corp_code, @fiscal_year, @report_code, @account_name, @standard_code, @amount, @currency, @fs_div)
  ON CONFLICT(corp_code, fiscal_year, report_code, account_name, fs_div) DO UPDATE SET
    standard_code = excluded.standard_code,
    amount        = excluded.amount
`)

const stmtUpdateCorpCls = db.prepare(
  "UPDATE companies SET corp_cls = ? WHERE corp_code = ? AND (corp_cls IS NULL OR corp_cls = '')"
)

const saveFinancials = db.transaction((corp_code, year, report_code, fs_div, list, corp_cls) => {
  // fnlttSinglAcntAll 응답에 corp_cls 포함 → companies 테이블에 반영
  if (corp_cls) stmtUpdateCorpCls.run(corp_cls, corp_code)

  for (const item of list) {
    const standard_code = getStandardCode(item.account_nm)
    if (!standard_code) recordUnmapped(item.account_nm, corp_code)

    stmtUpsertFinancial.run({
      corp_code,
      fiscal_year: year,
      report_code,
      account_name: item.account_nm,
      standard_code,
      amount: parseAmount(item.thstrm_amount),
      currency: 'KRW',
      fs_div,
    })
  }
})

const stmtUpsertAudit = db.prepare(`
  INSERT INTO audit_opinions (corp_code, fiscal_year, auditor_name, opinion_type, opinion_text, emphasis_text, going_concern)
  VALUES (@corp_code, @fiscal_year, @auditor_name, @opinion_type, @opinion_text, @emphasis_text, @going_concern)
  ON CONFLICT(corp_code, fiscal_year) DO UPDATE SET
    auditor_name  = excluded.auditor_name,
    opinion_type  = excluded.opinion_type,
    opinion_text  = excluded.opinion_text,
    emphasis_text = excluded.emphasis_text,
    going_concern = excluded.going_concern
`)

function saveAuditOpinion(corp_code, year, item) {
  // list.json(공시목록) 응답: report_nm 필드에 보고서명 포함
  // 의견 텍스트는 현재 미지원 (DART JSON API 미제공)
  // → rcept_no를 opinion_text에 임시 저장해두고 추후 문서 파싱 시 활용
  const reportName = item.report_nm ?? ''
  const rceptNo    = item.rcept_no ?? ''

  stmtUpsertAudit.run({
    corp_code,
    fiscal_year: year,
    auditor_name: null,
    opinion_type: null,         // 문서 파싱 없이는 알 수 없음
    opinion_text: rceptNo,      // 접수번호 임시 저장
    emphasis_text: reportName,
    going_concern: 0,
  })
}

function normalizeOpinionType(raw) {
  if (!raw) return null
  if (raw.includes('적정')) return '적정'
  if (raw.includes('한정')) return '한정'
  if (raw.includes('부적정')) return '부적정'
  if (raw.includes('의견거절') || raw.includes('거절')) return '의견거절'
  return null
}

// ── 진행 상태 헬퍼 ──────────────────────────────────────────────────
function getOrCreateProgress({ task_type, fiscal_year, total_corps, progressId }) {
  if (progressId) {
    const row = db.prepare('SELECT * FROM collection_progress WHERE id = ?').get(progressId)
    if (row && row.status === 'paused') return row
  }
  // 동일 배치(task_type + fiscal_year)의 paused 작업이 있으면 이어받기
  const existing = db.prepare(
    "SELECT * FROM collection_progress WHERE task_type = ? AND fiscal_year = ? AND status = 'paused' ORDER BY id DESC LIMIT 1"
  ).get(task_type, fiscal_year)
  if (existing) return existing

  const result = db.prepare(
    'INSERT INTO collection_progress (task_type, fiscal_year, total_corps) VALUES (?, ?, ?)'
  ).run(task_type, fiscal_year, total_corps)
  return db.prepare('SELECT * FROM collection_progress WHERE id = ?').get(result.lastInsertRowid)
}

const stmtUpdateProgress = db.prepare(`
  UPDATE collection_progress SET
    processed_corps = COALESCE(@processed_corps, processed_corps),
    last_corp_code  = COALESCE(@last_corp_code, last_corp_code),
    status          = COALESCE(@status, status),
    api_calls_today = @api_calls_today,
    updated_at      = datetime('now')
  WHERE id = @id
`)

function updateProgress(id, { processed_corps, last_corp_code, status } = {}) {
  stmtUpdateProgress.run({
    id,
    processed_corps: processed_corps ?? null,
    last_corp_code: last_corp_code ?? null,
    status: status ?? null,
    api_calls_today: rateLimiter.dailyUsed,
  })
}

function getResumeIndex(corps, lastCorpCode) {
  if (!lastCorpCode) return 0
  const idx = corps.findIndex((c) => c.corp_code === lastCorpCode)
  return idx === -1 ? 0 : idx + 1
}

const stmtLog = db.prepare(
  'INSERT INTO collection_logs (task_type, corp_code, status, error_msg) VALUES (@task_type, @corp_code, @status, @error_msg)'
)

function logCollection({ task_type, corp_code, status, error_msg = null }) {
  stmtLog.run({ task_type, corp_code, status, error_msg })
}
