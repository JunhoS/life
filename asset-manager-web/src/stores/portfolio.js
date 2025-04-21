import { defineStore } from 'pinia'
import { getAssets, createAsset as apiCreateAsset } from '@/services/assetService'

export const usePortfolioStore = defineStore('portfolio', {
  state: () => ({
    assets: [],
  }),
  actions: {
    async fetchAssets() {
      try {
        const res = await getAssets()
        this.assets = res.data
      } catch (err) {
        console.error('자산 불러오기 실패:', err)
      }
    },
    async addAsset(asset) {
      try {
        const res = await apiCreateAsset(asset)
        this.assets.push(res.data.asset) // 서버에서 추가된 자산 반환됨
      } catch (err) {
        console.error('자산 추가 실패:', err)
      }
    },
  },
})
