import express from 'express'
import db from '../db/db.js'
import { collectFinancials, collectAuditOpinions, saveCompanies, collectCorpCodes } from '../services/collector.js'
import { invalidateCache } from '../services/accountMapper.js'
import { rateLimiter } from '../services/dartApi.js'

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
router.post('/financials', async (req, res) => {
  const { year, report_code = '11011', fs_div = 'CFS' } = req.body
  if (!year) return res.status(400).json({ message: 'year 파라미터가 필요합니다.' })

  res.json({ message: `${year}년 재무제표 수집 시작 (백그라운드 실행)` })

  // 응답 후 백그라운드 실행 (Express 5에서는 async 라우트 에러 자동 처리됨)
  collectFinancials({ year: Number(year), reportCode: report_code, fsDiv: fs_div }).catch((err) => {
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
