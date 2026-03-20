import express from 'express'
import { runScreening } from '../services/screening.js'

const router = express.Router()

// GET /screening — 조건부 스크리닝
// Query params:
//   fiscal_year, corp_cls, sector
//   opinion (적정|한정|부적정|의견거절), going_concern (0|1)
//   min_REVENUE, max_REVENUE (원 단위)
//   min_OP_INCOME, min_OP_INCOME_RATIO (%)
//   max_DEBT_RATIO (%)
//   min_REVENUE_GROWTH (%, 전년 대비)
//   page, limit
router.get('/', (req, res) => {
  try {
    const result = runScreening(req.query)
    res.json(result)
  } catch (err) {
    res.status(500).json({ message: '스크리닝 실패', error: err.message })
  }
})

export default router
