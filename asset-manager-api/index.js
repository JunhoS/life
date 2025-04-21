import express from 'express'
import cors from 'cors'
import assetsRouter from './routes/assets.js'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

app.use('/assets', assetsRouter) // 자산 API 연결

app.listen(PORT, () => {
  console.log(`✅ API 서버 실행 중: http://localhost:${PORT}`)
})

app.get('/', (req, res) => {
    res.send('✅ 백엔드 서버가 정상적으로 실행 중입니다.')
})