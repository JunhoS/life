import api from './apiInstance'  // 기존 axios 인스턴스 재사용

export const createAsset = (asset) => api.post('/assets', asset)
export const getAssets = () => api.get('/assets')

export const fetchAssets = (type = 'stock') => {
  return api.get('/assets', { params: { type } })
}
