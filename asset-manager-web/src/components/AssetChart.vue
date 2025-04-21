<template>
    <div>
      <h2>📊 자산 비중</h2>
      <Doughnut v-if="chartData" :data="chartData" :options="chartOptions" />
      <div v-else>자산 정보가 없습니다.</div>
    </div>
  </template>
  
  <script setup>
  import { computed } from 'vue'
  import { Doughnut } from 'vue-chartjs'
  import {
    Chart as ChartJS,
    Title,
    Tooltip,
    Legend,
    ArcElement,
  } from 'chart.js'
  import { usePortfolioStore } from '@/stores/portfolio'
  
  // Chart.js 등록
  ChartJS.register(Title, Tooltip, Legend, ArcElement)
  
  const portfolio = usePortfolioStore()
  
  // 자산 종류별 합계 계산
  const groupedAssets = computed(() => {
    const result = {}
    portfolio.assets.forEach(asset => {
      if (!result[asset.type]) result[asset.type] = 0
      result[asset.type] += asset.amount
    })
    return result
  })
  
  // 차트 데이터 구성
  const chartData = computed(() => {
    const labels = Object.keys(groupedAssets.value)
    const data = Object.values(groupedAssets.value)
  
    if (labels.length === 0) return null
  
    return {
      labels,
      datasets: [
        {
          label: '자산 비중',
          data,
          backgroundColor: ['#42b983', '#eab308', '#f97316', '#3b82f6'],
        },
      ],
    }
  })
  
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
      },
    },
  }
  </script>
  
  <style scoped>
  canvas {
    max-width: 500px;
    margin: auto;
  }
  </style>
  