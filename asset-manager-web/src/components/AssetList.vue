<template>
    <div>
      <h2>📋 자산 목록</h2>
      <ul>
        <li v-for="(asset, index) in portfolio.assets" :key="index">
          {{ asset.type }} - {{ asset.amount }} {{ asset.currency || '' }}
        </li>
      </ul>
      <div v-if="portfolio.assets.length === 0">자산이 없습니다.</div>
    </div>
  </template>
  
  <script setup>
  import { usePortfolioStore } from '@/stores/portfolio'
  
  const portfolio = usePortfolioStore()
  </script>
  