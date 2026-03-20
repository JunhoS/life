import express from 'express'
import db from '../db/db.js'

const router = express.Router()

// GET /financials/:corpCode — 특정 기업 재무제표 목록
router.get('/:corpCode', (req, res) => {
  const { corpCode } = req.params
  const { year, report_code = '11011', fs_div = 'CFS' } = req.query

  const wheres = ['corp_code = ?', 'report_code = ?', 'fs_div = ?']
  const params = [corpCode, report_code, fs_div]

  if (year) {
    wheres.push('fiscal_year = ?')
    params.push(Number(year))
  }

  try {
    const rows = db.prepare(`
      SELECT fiscal_year, account_name, standard_code,
             CAST(amount AS TEXT) AS amount, currency
      FROM financials
      WHERE ${wheres.join(' AND ')}
      ORDER BY fiscal_year DESC, account_name
    `).all(...params)

    res.json(rows)
  } catch (err) {
    res.status(500).json({ message: '재무제표 조회 실패', error: err.message })
  }
})

// GET /financials/:corpCode/summary — 주요 재무 지표 요약 (연도별)
router.get('/:corpCode/summary', (req, res) => {
  const { corpCode } = req.params
  const { fs_div = 'CFS' } = req.query

  try {
    const rows = db.prepare(`
      SELECT
        fiscal_year,
        MAX(CASE WHEN standard_code = 'REVENUE'       THEN CAST(amount AS TEXT) END) AS revenue,
        MAX(CASE WHEN standard_code = 'OP_INCOME'     THEN CAST(amount AS TEXT) END) AS op_income,
        MAX(CASE WHEN standard_code = 'NET_INCOME'    THEN CAST(amount AS TEXT) END) AS net_income,
        MAX(CASE WHEN standard_code = 'TOTAL_ASSETS'  THEN CAST(amount AS TEXT) END) AS total_assets,
        MAX(CASE WHEN standard_code = 'TOTAL_LIAB'    THEN CAST(amount AS TEXT) END) AS total_liab,
        MAX(CASE WHEN standard_code = 'TOTAL_EQUITY'  THEN CAST(amount AS TEXT) END) AS total_equity,
        MAX(CASE WHEN standard_code = 'CFO'           THEN CAST(amount AS TEXT) END) AS cfo
      FROM financials
      WHERE corp_code = ? AND fs_div = ?
        AND standard_code IN ('REVENUE','OP_INCOME','NET_INCOME','TOTAL_ASSETS','TOTAL_LIAB','TOTAL_EQUITY','CFO')
      GROUP BY fiscal_year
      ORDER BY fiscal_year DESC
      LIMIT 5
    `).all(corpCode, fs_div)

    res.json(rows)
  } catch (err) {
    res.status(500).json({ message: '재무 요약 조회 실패', error: err.message })
  }
})

export default router
