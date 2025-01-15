import './assets/main.css'

import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'

const app = createApp(App)
app.use(ElementPlus)

// 初始化神策
if (window.sensors) {
  window.sensors.init({
    server_url: 'your-server-url',
    is_track_single_page: true, // 单页面应用配置
    show_log: process.env.NODE_ENV === 'development', // 开发环境打印日志
  })

  // 设置公共属性
  window.sensors.registerPage({
    platform: 'electron',
    app_version: '1.0.0',
  })
}

app.mount('#app')
