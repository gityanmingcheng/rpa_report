import { defineConfig } from 'vite'

export default defineConfig({
  // server: {
  //   proxy: {
  //     '/api': {
  //       target: 'http://127.0.0.1:60042',  // 后端服务器地址
  //       changeOrigin: true,  // 修改请求头中的Origin字段
  //       // rewrite: (path) => path.replace(/^\/api/, ''),  // 重写路径
  //       // rewrite: (path) => path,  // 重写路径
  //     }
  //   }
  // },
  server: {
    host: '0.0.0.0',
    port: '8000',
    proxy: {
      '/api': {
        //获取数据的服务器地址设置
        target: 'http://127.0.0.1:60042',
        //需要代理跨域
        changeOrigin: true,
        //路径重写
        // rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
