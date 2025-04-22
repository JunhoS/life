import express from 'express'
import db from '../db/db.js'

const router = express.Router()

// 자산 추가 (INSERT)
router.post('/', (req, res) => {
  const { type, amount, currency } = req.body
  if (!type || !amount) {
    return res.status(400).json({ message: '필수 필드 누락' })
  }

  const stmt = db.prepare(`
    INSERT INTO assets (type, amount, currency) 
    VALUES (?, ?, ?)
  `)
  const result = stmt.run(type, amount, currency)

  const insertedAsset = {
    id: result.lastInsertRowid,
    type,
    amount,
    currency,
  }

  res.status(201).json({ message: '자산 추가됨', asset: insertedAsset })
})

// 자산 목록 조회 (SELECT)
router.get('/', (req, res) => {
  const { type } = req.query
  let query = 'SELECT * FROM assets_master'
  const params = []

  if (type) {
    query += ' WHERE type = ?'
    params.push(type)
  }

  try {
    const stmt = db.prepare(query)
    const rows = stmt.all(...params)
    res.json(rows)
  } catch (err) {
    console.error('자산 조회 실패:', err)
    res.status(500).json({ message: '자산 조회 중 오류 발생' })
  }
})

export default router
