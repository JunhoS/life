<template>
    <div>
      <AssetGrid />
      <!-- <AssetForm />
      <AssetList />
      <AssetChart /> -->
    </div>
  </template>

  <script setup>
  import { onMounted } from 'vue'
  import { usePortfolioStore } from '@/stores/portfolio'
  import AssetForm from '@/components/AssetForm.vue'
  import AssetList from '@/components/AssetList.vue'
  import AssetChart from '@/components/AssetChart.vue'
  import AssetGrid from '@/components/AssetGrid.vue'
  
  const portfolio = usePortfolioStore()
  
  onMounted(() => {
    portfolio.fetchAssets()
  })
  </script>
  