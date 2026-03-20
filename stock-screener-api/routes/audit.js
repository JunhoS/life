import express from 'express'
import db from '../db/db.js'

const router = express.Router()

// GET /audit/alerts — 비적정 또는 계속기업 불확실성 종목 목록
// /:corpCode 보다 먼저 선언해야 라우트 충돌 방지
router.get('/alerts', (req, res) => {
  const { fiscal_year, page = 1, limit = 50 } = req.query
  const year = Number(fiscal_year) || new Date().getFullYear() - 1
  const offset = (Number(page) - 1) * Number(limit)

  try {
    const total = db.prepare(`
      SELECT COUNT(*) AS total
      FROM audit_opinions ao
      JOIN companies c ON ao.corp_code = c.corp_code
      WHERE ao.fiscal_year = ?
        AND (ao.opinion_type != '적정' OR ao.going_concern = 1)
    `).get(year).total

    const rows = db.prepare(`
      SELECT c.corp_code, c.corp_name, c.stock_code, c.corp_cls,
             ao.opinion_type, ao.going_concern, ao.auditor_name, ao.fiscal_year
      FROM audit_opinions ao
      JOIN companies c ON ao.corp_code = c.corp_code
      WHERE ao.fiscal_year = ?
        AND (ao.opinion_type != '적정' OR ao.going_concern = 1)
      ORDER BY ao.opinion_type, c.corp_name
      LIMIT ? OFFSET ?
    `).all(year, Number(limit), offset)

    res.json({ total, page: Number(page), limit: Number(limit), fiscal_year: year, data: rows })
  } catch (err) {
    res.status(500).json({ message: '감사의견 알림 조회 실패', error: err.message })
  }
})

// GET /audit/:corpCode — 특정 기업 감사의견 이력
router.get('/:corpCode', (req, res) => {
  const { corpCode } = req.params
  try {
    const rows = db.prepare(`
      SELECT fiscal_year, auditor_name, opinion_type, going_concern,
             opinion_text, emphasis_text, created_at
      FROM audit_opinions
      WHERE corp_code = ?
      ORDER BY fiscal_year DESC
    `).all(corpCode)
    res.json(rows)
  } catch (err) {
    res.status(500).json({ message: '감사의견 조회 실패', error: err.message })
  }
})

export default router
