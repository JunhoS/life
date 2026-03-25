import express from 'express'
import db from '../db/db.js'
import { collectFinancials, collectAuditOpinions, saveCompanies, collectCorpCodes } from '../services/collector.js'
import { invalidateCache } from '../services/accountMapper.js'
import { rateLimiter, fetchCorpClsByMarket } from '../services/dartApi.js'

const router = express.Router()

// GET /collect/status — 수집 현황 및 API 할당량 확인
router.get('/status', (req, res) => {
  const progresses = db.prepare(
    "SELECT * FROM collection_progress ORDER BY updated_at DESC LIMIT 20"
  ).all()
  res.json({
    api_calls_today: rateLimiter.dailyUsed,
    remaining_today: rateLimiter.remainingToday,
    progresses,
  })
})

// POST /collect/companies — 상장사 목록 수집 (ZIP 파싱)
// DART corpCode.xml (ZIP) 다운로드 후 XML 파싱 필요
// adm-zip 라이브러리 없이 구현하려면: npm install adm-zip
router.post('/companies', async (req, res) => {
  try {
    // adm-zip 동적 import (선택적 의존성)
    let AdmZip
    try {
      const mod = await import('adm-zip')
      AdmZip = mod.default
    } catch {
      return res.status(501).json({
        message: 'adm-zip 패키지가 필요합니다. npm install adm-zip 후 재시도하세요.',
      })
    }

    const arrayBuffer = await collectCorpCodes()
    const zip = new AdmZip(Buffer.from(arrayBuffer))
    const xmlEntry = zip.getEntries().find((e) => e.entryName.endsWith('.xml'))
    if (!xmlEntry) return res.status(500).json({ message: 'ZIP 내 XML 파일을 찾을 수 없습니다.' })

    const xml = xmlEntry.getData().toString('utf8')

    // 간단한 XML 파싱 (DOMParser 없이 정규식)
    const corps = []
    const listMatch = xml.match(/<list>([\s\S]*?)<\/list>/g) || []
    for (const block of listMatch) {
      const get = (tag) => {
        const m = block.match(new RegExp(`<${tag}>([^<]*)</${tag}>`))
        return m ? m[1].trim() : null
      }
      const stock_code = get('stock_code')
      // 비상장 제외
      if (!stock_code || stock_code === ' ') continue

      corps.push({
        corp_code: get('corp_code'),
        corp_name: get('corp_name'),
        stock_code,
        corp_cls: get('corp_cls') || null,
        sector: null,
        ceo_name: null,
        established: null,
      })
    }

    saveCompanies(corps)
    res.json({ message: `${corps.length}개 상장사 저장 완료` })
  } catch (err) {
    res.status(500).json({ message: '기업 목록 수집 실패', error: err.message })
  }
})

// POST /collect/financials — 재무제표 배치 수집
// body: { year, report_code?, fs_div?, offset?, batch_size? }
// offset: 시작 인덱스 (기본 0), batch_size: 처리할 기업 수 (기본 전체)
// 예시: { year: 2024, offset: 0, batch_size: 1000 }   → 1~1000번
//       { year: 2024, offset: 1000, batch_size: 1000 } → 1001~2000번
router.post('/financials', async (req, res) => {
  const { year, report_code = '11011', fs_div = 'CFS', offset = 0, batch_size } = req.body
  if (!year) return res.status(400).json({ message: 'year 파라미터가 필요합니다.' })

  const batchDesc = batch_size
    ? `offset=${offset} ~ ${Number(offset) + Number(batch_size) - 1}`
    : `offset=${offset} ~ 끝`

  res.json({ message: `${year}년 재무제표 수집 시작 (${batchDesc}, 백그라운드 실행)` })

  collectFinancials({
    year: Number(year),
    reportCode: report_code,
    fsDiv: fs_div,
    offset: Number(offset),
    batchSize: batch_size != null ? Number(batch_size) : null,
  }).catch((err) => {
    console.error('[수집] 재무제표 오류:', err.message)
  })
})

// POST /collect/audit — 감사의견 배치 수집
router.post('/audit', async (req, res) => {
  const { year, report_code = '11011' } = req.body
  if (!year) return res.status(400).json({ message: 'year 파라미터가 필요합니다.' })

  res.json({ message: `${year}년 감사의견 수집 시작 (백그라운드 실행)` })

  collectAuditOpinions({ year: Number(year), reportCode: report_code }).catch((err) => {
    console.error('[수집] 감사의견 오류:', err.message)
  })
})

// POST /collect/corp-cls — 시장구분(Y/K/N) 배치 업데이트
// list.json으로 사업보고서 제출 기업을 시장별로 조회 → corps table corp_cls 갱신
router.post('/corp-cls', async (req, res) => {
  const { year = new Date().getFullYear() - 1 } = req.body
  res.json({ message: `${year}년 기준 시장구분 업데이트 시작 (백그라운드)` })

  ;(async () => {
    const stmtUpdate = db.prepare('UPDATE companies SET corp_cls = ? WHERE corp_code = ?')
    const updateMany = db.transaction((rows) => { for (const r of rows) stmtUpdate.run(r.cls, r.corp_code) })

    // corp_code 없이 list.json은 3개월 제한 → 분기별로 나눠 조회
    const y = String(year)
    const quarters = [
      { bgn: `${y}0101`, end: `${y}0331` },
      { bgn: `${y}0401`, end: `${y}0630` },
      { bgn: `${y}0701`, end: `${y}0930` },
      { bgn: `${y}1001`, end: `${y}1231` },
    ]

    let totalUpdated = 0
    const seen = new Set()
    for (const cls of ['Y', 'K', 'N', 'E']) {
      for (const { bgn, end } of quarters) {
        let page = 1, hasMore = true
        while (hasMore) {
          try {
            const data = await fetchCorpClsByMarket(cls, bgn, end, page)
            if (!data.list?.length || data.status !== '000') { hasMore = false; break }
            const newRows = data.list.filter((r) => !seen.has(r.corp_code))
            newRows.forEach((r) => seen.add(r.corp_code))
            if (newRows.length) updateMany(newRows.map((r) => ({ cls, corp_code: r.corp_code })))
            totalUpdated += newRows.length
            hasMore = data.list.length === 100
            page++
          } catch (e) {
            console.error(`[corp_cls] ${cls} ${bgn} p${page} 오류:`, e.message)
            hasMore = false
          }
        }
      }
    }
    console.log(`[corp_cls] 업데이트 완료: ${totalUpdated}건`)
  })().catch((e) => console.error('[corp_cls] 오류:', e.message))
})

// GET /collect/unmapped — 미매핑 계정과목 목록
router.get('/unmapped', (req, res) => {
  const rows = db.prepare(
    'SELECT * FROM unmapped_accounts ORDER BY occurrence_count DESC LIMIT 100'
  ).all()
  res.json(rows)
})

// POST /collect/mapping — 계정과목 매핑 추가
router.post('/mapping', (req, res) => {
  const { standard_code, standard_name, dart_account } = req.body
  if (!standard_code || !standard_name || !dart_account) {
    return res.status(400).json({ message: 'standard_code, standard_name, dart_account 모두 필요합니다.' })
  }
  try {
    db.prepare(
      'INSERT OR IGNORE INTO account_mapping (standard_code, standard_name, dart_account) VALUES (?, ?, ?)'
    ).run(standard_code, standard_name, dart_account)
    invalidateCache()
    res.json({ message: '매핑 추가 완료' })
  } catch (err) {
    res.status(500).json({ message: '매핑 추가 실패', error: err.message })
  }
})

export default router
