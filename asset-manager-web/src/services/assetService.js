import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:3001',
})

export const createAsset = (asset) => api.post('/assets', asset)
export const getAssets = () => api.get('/assets')
