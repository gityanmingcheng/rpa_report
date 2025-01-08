<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { BackendRobot } from '../../../preload'

interface Robot {
  id: number
  name: string
  status: string
  lastActive: string
}

const robots = ref<Robot[]>([])
const backendPort = ref<number | null>(null)
const backendStatus = ref<'连接中' | '已连接' | '已断开'>('连接中')

// 定期从后端获取机器人状态
const fetchInterval = ref<ReturnType<typeof setInterval> | null>(null)

const fetchRobots = async () => {
  console.log('backendPort.value==', backendPort.value)
  if (!backendPort.value) {
    console.warn('后端端口未就绪')
    return
  }

  try {
    // const data = await window.electron.fetchRobots(backendPort.value)
    const data = {}
    console.log('获取到机器人数据:', data)

    // 确保数据始终是数组
    const backendRobots = Array.isArray(data) ? data : ([data] as BackendRobot[])

    robots.value = backendRobots.map(
      (robot): Robot => ({
        id: parseInt(robot.id),
        name: robot.name,
        status: robot.status,
        lastActive: robot.last_active
      })
    )
  } catch (error) {
    console.error('获取机器人数据失败:', error)
    backendStatus.value = '已断开'
  }
}

// 监听主进程发送的后端就绪事件
window.electron.onBackendReady((port: number) => {
  console.log('收到后端端口:', port)
  backendPort.value = port
  backendStatus.value = '已连接'
  // 立即获取机器人数据
  fetchRobots()
})

// 监听后端关闭事件
window.electron.onBackendClosed(() => {
  console.log('后端服务已关闭')
  backendStatus.value = '已断开'
  backendPort.value = null
})

onMounted(() => {
  console.log('RobotTable 组件已挂载')
  // 确认事件监听器已设置
  console.log('正在设置后端就绪事件监听器...')
  window.electron.onBackendReady((port: number) => {
    console.log('收到后端端口:', port)
    backendPort.value = port
    backendStatus.value = '已连接'
    // 立即获取机器人数据
    fetchRobots()
  })
  console.log('后端就绪事件监听器已设置')

  // 初始化获取数据
  fetchRobots()

  // 设置定期获取数据的间隔（5秒）
  fetchInterval.value = setInterval(fetchRobots, 5000)
})

onUnmounted(() => {
  console.log('组件卸载，清理事件监听器...')
  if (fetchInterval.value) {
    clearInterval(fetchInterval.value)
    fetchInterval.value = null
  }
})
</script>

<template>
  <div class="robot-table">
    <div class="status-bar">
      后端状态: {{ backendStatus }}
      <span v-if="backendPort">(端口: {{ backendPort }})</span>
    </div>
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>名称</th>
          <th>状态</th>
          <th>最后活动时间</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="robot in robots" :key="robot.id">
          <td>{{ robot.id }}</td>
          <td>{{ robot.name }}</td>
          <td>
            <span :class="['status-indicator', robot.status.toLowerCase()]">
              {{ robot.status }}
            </span>
          </td>
          <td>{{ robot.lastActive }}</td>
        </tr>
        <tr v-if="robots.length === 0">
          <td colspan="4" class="no-data">
            {{ backendStatus === '已断开' ? '后端服务未连接' : '暂无数据' }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.robot-table {
  height: 100%;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  overflow: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 16px;
  text-align: left;
  border-bottom: 1px solid #f0f0f0;
}

th {
  background-color: #fafafa;
  font-weight: 600;
  color: #262626;
}

tr:hover {
  background-color: #fafafa;
}

td {
  color: #595959;
}

.status-bar {
  padding: 8px 16px;
  background-color: #fafafa;
  border-bottom: 1px solid #f0f0f0;
  font-size: 14px;
  color: #595959;
}

.status-indicator {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
}

.status-indicator.在线 {
  background-color: #f6ffed;
  color: #52c41a;
  border: 1px solid #b7eb8f;
}

.status-indicator.离线 {
  background-color: #fff1f0;
  color: #ff4d4f;
  border: 1px solid #ffa39e;
}

.no-data {
  text-align: center;
  color: #999;
  padding: 32px 0;
}
</style>
