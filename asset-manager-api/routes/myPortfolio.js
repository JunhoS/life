import express from 'express'
import db from '../db/db.js'

const router = express.Router()

// 📌 GET /my-portfolio
router.get('/', (req, res) => {
  const query = `
    SELECT 
      mp.id,
      mp.asset_id,
      am.name,
      am.type,
      am.symbol,
      mp.target_ratio,
      mp.latest_price,
      mp.quantity,
      mp.updated_at
    FROM my_portfolio mp
    JOIN assets_master am ON mp.asset_id = am.id
    ORDER BY mp.updated_at DESC
  `
  try {
    const stmt = db.prepare(query)
    const rows = stmt.all()
    res.json(rows)
  } catch (err) {
    console.error('포트폴리오 조회 오류:', err)
    res.status(500).json({ message: '조회 실패' })
  }
})

// 📌 POST /my-portfolio
router.post('/', (req, res) => {
  const { asset_id, target_ratio, latest_price, quantity } = req.body

  if (!asset_id || target_ratio === undefined) {
    return res.status(400).json({ message: 'asset_id와 target_ratio는 필수입니다' })
  }

  try {
    const upsert = db.prepare(`
      INSERT INTO my_portfolio (asset_id, target_ratio, latest_price, quantity)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(asset_id) DO UPDATE SET 
        target_ratio = excluded.target_ratio,
        latest_price = excluded.latest_price,
        quantity = excluded.quantity,
        updated_at = CURRENT_TIMESTAMP
    `)
    upsert.run(asset_id, target_ratio, latest_price, quantity)

    res.status(201).json({ message: '포트폴리오 저장 완료' })
  } catch (err) {
    console.error('포트폴리오 저장 오류:', err)
    res.status(500).json({ message: '저장 실패' })
  }
})

export default router
