import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:3001',  // 백엔드 API 주소
  headers: {
    'Content-Type': 'application/json',
  }
})

export default api
