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
  const stmt = db.prepare('SELECT * FROM assets ORDER BY created_at DESC')
  const rows = stmt.all()
  res.json(rows)
})

export default router
