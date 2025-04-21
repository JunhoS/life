import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

// 🔥 Pinia 추가
import { createPinia } from 'pinia'

const app = createApp(App)

app.use(createPinia())  // ✅ Pinia 등록
app.use(router)
app.mount('#app')
