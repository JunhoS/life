import 'dotenv/config'
import express from 'express'
import cors from 'cors'

import companiesRouter  from './routes/companies.js'
import financialsRouter from './routes/financials.js'
import auditRouter      from './routes/audit.js'
import screeningRouter  from './routes/screening.js'
import collectRouter    from './routes/collect.js'

const app = express()
const PORT = process.env.PORT || 3002

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: '주식 스크리닝 API 서버 실행 중', port: PORT })
})

app.use('/companies',  companiesRouter)
app.use('/financials', financialsRouter)
app.use('/audit',      auditRouter)
app.use('/screening',  screeningRouter)
app.use('/collect',    collectRouter)

app.listen(PORT, () => {
  console.log(`✅ 주식 스크리닝 API 실행 중: http://localhost:${PORT}`)
  console.log('  DART_API_KEY:', process.env.DART_API_KEY ? '✅ 설정됨' : '❌ 미설정 (.env 확인 필요)')
})
