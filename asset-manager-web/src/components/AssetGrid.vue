<template>
    <div>
      <h2 class="text-xl font-bold mb-4">📋 자산 목록 (주식)</h2>
  
      <table class="table-auto w-full border-collapse border border-gray-300">
        <thead class="bg-gray-100">
          <tr>
            <th class="border p-2">이름</th>
            <th class="border p-2">자산군</th>
            <th class="border p-2">심볼</th>
            <th class="border p-2">설명</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="asset in assets" :key="asset.id">
            <td class="border p-2">{{ asset.name }}</td>
            <td class="border p-2">{{ asset.type }}</td>
            <td class="border p-2">{{ asset.symbol }}</td>
            <td class="border p-2">{{ asset.description }}</td>
          </tr>
        </tbody>
      </table>
  
      <div v-if="assets.length === 0" class="text-center text-gray-500 mt-4">
        조회된 자산이 없습니다.
      </div>
    </div>
  </template>
  
  <script setup>
  import { onMounted, ref } from 'vue'
  import { fetchAssets } from '@/services/assetService'
  
  const assets = ref([])
  
  onMounted(async () => {
    try {
      const res = await fetchAssets('stock')
      assets.value = res.data
    } catch (err) {
      console.error('자산 조회 실패:', err)
    }
  })
  </script>
  