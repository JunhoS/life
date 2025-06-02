import api from './apiInstance'  // 기존 axios 인스턴스 재사용

export const addToPortfolioAPI = (data) => {
  return api.post('/my-portfolio', data)
}

export const fetchPortfolioAPI = () => {
  return api.get('/my-portfolio')
}
