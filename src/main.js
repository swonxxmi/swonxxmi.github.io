

import { createApp } from 'vue'
import App from '../src/views/GameHome.vue'
import router from './router'

createApp(App)
  .use(router)
  .mount('#app')
