<template>
  <div id="app">
    <nav class="nav">
      <router-link to="/">📊 대시보드</router-link> |
      <router-link to="/assets">💰 자산</router-link>
    </nav>

    <main>
      <router-view />
    </main>
  </div>
</template>

<script setup>
</script>

<style>
.nav {
  padding: 1rem;
  background: #f0f2f5;
  border-bottom: 1px solid #ddd;
}

.nav a {
  margin: 0 0.5rem;
  text-decoration: none;
  color: #333;
}

.nav a.router-link-active {
  font-weight: bold;
  color: #42b983;
}
</style>
