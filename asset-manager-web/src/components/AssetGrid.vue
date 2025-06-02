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
          <th class="border p-2">액션</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="asset in assets" :key="asset.id">
          <td class="border p-2">{{ asset.name }}</td>
          <td class="border p-2">{{ asset.type }}</td>
          <td class="border p-2">{{ asset.symbol }}</td>
          <td class="border p-2">{{ asset.description }}</td>
          <td class="border p-2">
            <button @click="openModal(asset)" class="bg-blue-500 text-white px-2 py-1 rounded">
              추가
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-if="assets.length === 0" class="text-center text-gray-500 mt-4">
      조회된 자산이 없습니다.
    </div>
  </div>

  <!-- 모달 -->
  <div v-if="showModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
    <div class="bg-white p-6 rounded shadow w-80">
      <h3 class="text-lg font-bold mb-4">{{ selectedAsset.name }} 추가</h3>
      
      <label>목표 비중 (%)</label>
      <input type="number" v-model.number="targetRatio" class="border p-2 w-full mb-3" />

      <label>수량</label>
      <input type="number" v-model.number="quantity" class="border p-2 w-full mb-4" />

      <div class="flex justify-end space-x-2">
        <button @click="confirmAdd" class="bg-blue-500 text-white px-4 py-2 rounded">확인</button>
        <button @click="closeModal" class="bg-gray-300 px-4 py-2 rounded">취소</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { fetchAssets } from '@/services/assetService'
import { addToPortfolioAPI } from '@/services/portfolioService'

const assets = ref([])

const showModal = ref(false)
const selectedAsset = ref({})
const targetRatio = ref(10)
const quantity = ref(1)

onMounted(async () => {
  const res = await fetchAssets('stock')
  assets.value = res.data
})

const openModal = (asset) => {
  selectedAsset.value = asset
  targetRatio.value = 10   // 기본값
  quantity.value = 1
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
}

const confirmAdd = async () => {
  try {
    await addToPortfolioAPI({
      asset_id: selectedAsset.value.id,
      target_ratio: targetRatio.value,
      latest_price: 100000,   // 임시값
      quantity: quantity.value
    })
    alert(`${selectedAsset.value.name}이(가) 포트폴리오에 추가되었습니다!`)
    closeModal()
  } catch (err) {
    console.error('추가 실패:', err)
    alert('추가 중 오류 발생')
  }
}
</script>
