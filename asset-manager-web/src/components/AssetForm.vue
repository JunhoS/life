<template>
    <form @submit.prevent="handleSubmit" class="form">
      <div>
        <label>자산 종류</label>
        <select v-model="type" required>
          <option value="">선택하세요</option>
          <option value="주식">주식</option>
          <option value="채권">채권</option>
          <option value="금">금</option>
          <option value="현금">현금</option>
        </select>
      </div>
  
      <div>
        <label>금액</label>
        <input type="number" v-model.number="amount" required />
      </div>
  
      <div>
        <label>통화</label>
        <input type="text" v-model="currency" placeholder="예: KRW, USD" />
      </div>
  
      <button type="submit">추가</button>
    </form>
  </template>
  
  <script setup>
  import { ref } from 'vue'
  import { usePortfolioStore } from '@/stores/portfolio'
  
  const portfolio = usePortfolioStore()
  
  const type = ref('')
  const amount = ref(0)
  const currency = ref('')
  
  const handleSubmit = () => {
    portfolio.addAsset({
      type: type.value,
      amount: amount.value,
      currency: currency.value,
    })
  
    // 입력 초기화
    type.value = ''
    amount.value = 0
    currency.value = ''
  }
  </script>
  
  <style scoped>
  .form {
    margin-bottom: 2rem;
  }
  .form label {
    display: block;
    font-weight: bold;
    margin-top: 0.5rem;
  }
  .form input,
  .form select {
    width: 100%;
    padding: 0.5rem;
    margin-bottom: 0.5rem;
  }
  </style>
  