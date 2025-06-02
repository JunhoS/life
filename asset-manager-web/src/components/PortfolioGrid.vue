<template>
    <div>
      <h2 class="text-xl font-bold mb-4">🎯 나의 포트폴리오</h2>
  
      <table class="table-auto w-full border-collapse border border-gray-300">
        <thead class="bg-gray-100">
          <tr>
            <th class="border p-2">자산명</th>
            <th class="border p-2">심볼</th>
            <th class="border p-2">목표 비율 (%)</th>
            <th class="border p-2">수량</th>
            <th class="border p-2">최신 단가</th>
            <th class="border p-2">최종 수정일</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in portfolio" :key="item.id">
            <td class="border p-2">{{ item.name }}</td>
            <td class="border p-2">{{ item.symbol }}</td>
            <td class="border p-2">{{ item.target_ratio }}</td>
            <td class="border p-2">{{ item.quantity }}</td>
            <td class="border p-2">{{ item.latest_price }}</td>
            <td class="border p-2">{{ formatDate(item.updated_at) }}</td>
          </tr>
        </tbody>
      </table>
  
      <div v-if="portfolio.length === 0" class="text-center text-gray-500 mt-4">
        포트폴리오에 담긴 자산이 없습니다.
      </div>
    </div>
  </template>
  
  <script setup>
  import { onMounted, ref } from 'vue'
  import { fetchPortfolioAPI } from '@/services/portfolioService'
  
  const portfolio = ref([])
  
  onMounted(async () => {
    try {
      const res = await fetchPortfolioAPI()
      portfolio.value = res.data
    } catch (err) {
      console.error('포트폴리오 조회 실패:', err)
    }
  })
  
  const formatDate = (dateStr) => {
    return dateStr ? dateStr.split('T')[0] : ''
  }
  </script>
  