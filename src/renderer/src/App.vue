<script setup lang="ts">
import { ref, onMounted, provide } from 'vue'
import LogViewer from './components/LogViewer.vue'
import ConfigTable from './components/ConfigTable.vue'
import FileUploader from './components/FileUploader.vue'

const activeTab = ref('robot')

const normalLogPath = ref('')
const errorLogPath = ref('')
const updateLogPaths = async () => {
  try {
    console.log('渲染进程: 开始更新日志路径...')
    normalLogPath.value = await window.electron.getLogPath(false)
    errorLogPath.value = await window.electron.getLogPath(true)
  } catch (error) {
    console.error('渲染进程: 获取日志路径失败:', error)
  }
}

const backendPort = ref<number | null>(null)
const backendStatus = ref<'连接中' | '已连接' | '已断开'>('连接中')
const lastKnownPort = ref<number | null>(
  // 从 localStorage 读取上次保存的端口
  Number(localStorage.getItem('lastKnownPort')) || null
)

// 提供给子组件使用
provide('backendPort', backendPort)
provide('backendStatus', backendStatus)

// 优化后的后端状态检查函数
const checkBackendStatus = async () => {
  try {
    const portToTry = backendPort.value || lastKnownPort.value
    if (!portToTry) {
      backendStatus.value = '连接中'
      return
    }
    if (backendStatus.value == '已连接'){
      return
    }
    const response = await window.electron.serverApi.request(portToTry, 'GET', '/', null)

    if (response) {
      backendStatus.value = '已连接'
      backendPort.value = portToTry
      lastKnownPort.value = portToTry
      // 保存成功连接的端口到 localStorage
      localStorage.setItem('lastKnownPort', portToTry.toString())
    }
  } catch (error) {
    console.warn('后端连接检查失败:', error)
    // 如果当前端口检查失败，且与最后已知端口不同，尝试最后已知端口
    if (backendPort.value !== lastKnownPort.value && lastKnownPort.value) {
      try {
        const response = await window.electron.serverApi.request(
          lastKnownPort.value,
          'GET',
          '/',
          null
        )
        if (response) {
          backendStatus.value = '已连接'
          backendPort.value = lastKnownPort.value
          return
        }
      } catch (retryError) {
        console.warn('尝试最后已知端口也失败:', retryError)
      }
    }
    backendStatus.value = '已断开'
  }
}

// 监听后端就绪事件
window.electron.onBackendReady((port: number) => {
  console.log('收到后端端口:', port)
  backendPort.value = port
  lastKnownPort.value = port
  // 保存新的端口到 localStorage
  localStorage.setItem('lastKnownPort', port.toString())
  backendStatus.value = '已连接'
})

// 监听后端关闭事件 - 可以选择移除或修改这个处理器
window.electron.onBackendClosed(() => {
  console.log('收到后端关闭信号')
  // 不立即清除端口和状态，而是触发一次状态检查
  checkBackendStatus()
})

onMounted(async () => {
  console.log('渲染进程: 组件已挂载，准备更新日志路径...')
  await updateLogPaths()

  // 每分钟更新一次路径
  setInterval(async () => {
    console.log('渲染进程: 定时更新日志路径...')
    await updateLogPaths()
  }, 60000)

  // 增加初始状态检查
  await checkBackendStatus()
  // 调整检查间隔，可以根据需要调整频率
  setInterval(checkBackendStatus, 3000)
})
</script>

<template>
  <div class="app-container">
    <div class="tab-container">
      <div
        v-for="tab in ['robot', 'log', 'config']"
        :key="tab"
        :class="['tab-item', { active: activeTab === tab }]"
        @click="activeTab = tab"
      >
        <span class="tab-icon">
          {{ tab === 'robot' ? '🤖' : tab === 'log' ? '📋' : '⚙️' }}
        </span>
        <span class="tab-text">
          {{ tab === 'robot' ? '机器人' : tab === 'log' ? '日志' : '配置' }}
        </span>
      </div>
    </div>

    <div class="content-container">
      <div v-show="activeTab === 'robot'" class="table-container">

        <FileUploader />
      </div>

      <div v-show="activeTab === 'log'" class="log-container">
        <LogViewer :default-log-path="normalLogPath" />
      </div>

      <!-- <div v-show="activeTab === 'errlog'" class="log-container">
        <ErrLogViewer :default-log-path="errorLogPath" />
      </div> -->

      <div v-show="activeTab === 'config'" class="table-container">
        <ConfigTable />
      </div>
    </div>
  </div>
</template>

<style>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  background: #f0f2f5;
}

.tab-container {
  display: flex;
  background: #001529;
  padding: 0 20px;
  height: 48px;
}

.tab-item {
  padding: 0 24px;
  cursor: pointer;
  user-select: none;
  height: 48px;
  line-height: 48px;
  color: rgba(255, 255, 255, 0.65);
  transition: all 0.3s;
  position: relative;
}

.tab-item:hover {
  color: #fff;
}

.tab-item.active {
  color: #fff;
  background: #1890ff;
}

.content-container {
  flex: 1;
  padding: 16px;
  overflow: hidden;
}

.table-container {
  height: calc(100vh - 80px);
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.log-container {
  height: calc(100vh - 80px);
  background: #1e1e1e;
  border-radius: 4px;
  overflow: hidden;
}
</style>
