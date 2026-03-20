import express from 'express'
import db from '../db/db.js'

const router = express.Router()

// GET /companies — 상장사 목록 (페이징, 검색)
router.get('/', (req, res) => {
  const { q, corp_cls, sector, page = 1, limit = 50 } = req.query
  const offset = (Number(page) - 1) * Number(limit)

  const wheres = ["stock_code IS NOT NULL AND stock_code != ''"]
  const params = []

  if (q) {
    wheres.push('(corp_name LIKE ? OR stock_code LIKE ?)')
    params.push(`%${q}%`, `%${q}%`)
  }
  if (corp_cls) {
    wheres.push('corp_cls = ?')
    params.push(corp_cls)
  }
  if (sector) {
    wheres.push('sector LIKE ?')
    params.push(`%${sector}%`)
  }

  const where = `WHERE ${wheres.join(' AND ')}`

  try {
    const total = db.prepare(`SELECT COUNT(*) AS total FROM companies ${where}`).get(...params).total
    const rows = db.prepare(`
      SELECT corp_code, corp_name, stock_code, corp_cls, sector, ceo_name, established
      FROM companies ${where}
      ORDER BY corp_name
      LIMIT ? OFFSET ?
    `).all(...params, Number(limit), offset)

    res.json({ total, page: Number(page), limit: Number(limit), data: rows })
  } catch (err) {
    res.status(500).json({ message: '기업 목록 조회 실패', error: err.message })
  }
})

// GET /companies/:corpCode — 기업 상세
router.get('/:corpCode', (req, res) => {
  const { corpCode } = req.params
  const company = db.prepare('SELECT * FROM companies WHERE corp_code = ?').get(corpCode)
  if (!company) return res.status(404).json({ message: '기업을 찾을 수 없습니다.' })
  res.json(company)
})

export default router
