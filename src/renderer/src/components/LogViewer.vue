<template>
  <div class="log-viewer">
    <div class="controls">
      <input v-model="logPath" readonly class="log-path-input" />
      <button :disabled="isWatching" @click="startWatching">开始监控</button>
      <button :disabled="!isWatching" @click="stopWatching">停止监控</button>
      <button
        @click="toggleAutoRefresh"
        :class="{ 'active': autoRefresh }"
        :disabled="!isWatching"
      >
        {{ autoRefresh ? '自动刷新中' : '自动刷新已关闭' }}
      </button>
      <select
        v-model="refreshRate"
        :disabled="!isWatching || !autoRefresh"
      >
        <option :value="5000">5秒</option>
        <option :value="10000">10秒</option>
      </select>
    </div>
    <div ref="logContent" class="log-content" @scroll="handleScroll">
      <div v-for="(line, index) in logLines" :key="index">
        {{ line }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted, nextTick, watch, onMounted } from 'vue'

const props = defineProps<{
  defaultLogPath: string
}>()

const logPath = ref('')
const logLines = ref<string[]>([])
const isWatching = ref(false)
const logContent = ref<HTMLElement | null>(null)
const userScrolling = ref(false)
const autoRefresh = ref(true)  // 控制是否自动刷新
const refreshRate = ref(5000)   // 刷新间隔，默认3秒
const refreshTimer = ref<number | null>(null)

// 监听 defaultLogPath 的变化
watch(
  () => props.defaultLogPath,
  (newPath) => {
    if (newPath) {
      logPath.value = newPath
    }
  },
  { immediate: true }
)

// 监听 defaultLogPath 的变化
watch(
  () => props.defaultLogPath,
  (newPath) => {
    console.log('监听触发：', { newPath, currentPath: logPath.value })

    // 确保有日志路径时才开始监控
    if (logPath.value) {
      console.log('开始监控日志:', logPath.value)
      // 清空之前的日志
      logLines.value = []
      // 先停止之前的监控
      stopWatching()
      // 开始新的监控
      startWatching()
    }
  },
  { immediate: true }
)

const startWatching = () => {
  if (!logPath.value) return
  // 清空之前的日志数据
  logLines.value = []
  isWatching.value = true
  window.electronAPI.startLogWatch({ logPath: logPath.value, watcherId: 'normal' })
}

const stopWatching = () => {
  if (isWatching.value) {
    console.log('停止监控')
    isWatching.value = false
    window.electronAPI.stopLogWatch()
  }
}

// 为每个日志查看器创建唯一的更新处理函数
const updateHandler = (data: { watcherId: string; line: string }) => {
  if (data.watcherId === 'normal') {
    // 处理可能的多行内容
    const lines = data.line.split(/\r?\n/)
    lines.forEach(line => {
      if (line.trim()) {  // 忽略空行
        logLines.value.push(line)
      }
    })

    // 限制显示的行数，防止内存占用过大
    if (logLines.value.length > 1000) {
      logLines.value = logLines.value.slice(-1000)
    }

    nextTick(() => {
      if (!userScrolling.value && logContent.value) {
        logContent.value.scrollTop = logContent.value.scrollHeight
      }
    })
  }
}

// 组件挂载时添加监听器
window.electronAPI.onLogUpdate(updateHandler)

// 监听 logLines 的变化
watch(logLines, async () => {
  await nextTick()
  if (!userScrolling.value && logContent.value) {
    logContent.value.scrollTop = logContent.value.scrollHeight
  }
})

// 处理用户滚动事件
const handleScroll = () => {
  if (logContent.value) {
    const { scrollTop, scrollHeight, clientHeight } = logContent.value
    userScrolling.value = scrollTop + clientHeight < scrollHeight
  }
}

// 自动刷新功能
const startAutoRefresh = () => {
  if (!refreshTimer.value && autoRefresh.value) {
    refreshTimer.value = window.setInterval(() => {
      if (isWatching.value) {
        // 先停止监控
        stopWatching()
        // 延迟一小段时间后重新开始监控
        setTimeout(() => {
          startWatching()
        }, 100)
      }
    }, refreshRate.value)
  }
}

// 停止自动刷新
const stopAutoRefresh = () => {
  if (refreshTimer.value) {
    clearInterval(refreshTimer.value)
    refreshTimer.value = null
  }
}

// 切换自动刷新状态
const toggleAutoRefresh = () => {
  autoRefresh.value = !autoRefresh.value
  if (autoRefresh.value) {
    startAutoRefresh()
  } else {
    stopAutoRefresh()
  }
}

// 监听刷新率变化
watch(refreshRate, () => {
  if (autoRefresh.value) {
    stopAutoRefresh()
    startAutoRefresh()
  }
})

// 监听监控状态变化
watch(isWatching, (newValue) => {
  if (newValue && autoRefresh.value) {
    startAutoRefresh()
  } else if (!newValue) {
    stopAutoRefresh()
  }
})

// 组件挂载时启动自动刷新
onMounted(() => {
  if (isWatching.value) {
    startAutoRefresh()
  }
})

// 组件销毁时清理
onUnmounted(() => {
  stopAutoRefresh()
  stopWatching()
  // 清理数据
  logLines.value = []
  userScrolling.value = false
})
</script>

<style scoped>
.log-viewer {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px;
}

.controls {
  margin-bottom: 16px;
  display: flex;
  gap: 8px;
  align-items: center;
}

.log-path-input {
  flex: 1;
  min-width: 300px;
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background-color: #f5f5f5;
  cursor: text;
  user-select: text;
}

button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  background: #1890ff;
  color: white;
  cursor: pointer;
}

button:disabled {
  background: #d9d9d9;
  cursor: not-allowed;
}

.log-content {
  flex: 1;
  overflow-y: auto;
  background: #1e1e1e;
  color: #fff;
  padding: 12px;
  font-family: monospace;
  white-space: pre-wrap;
  user-select: text;
  cursor: text;
}

.log-content div {
  user-select: text;
  line-height: 1.5;
  padding: 2px 0;
}

button.active {
  background: #52c41a;
}

select {
  padding: 8px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  margin-left: 8px;
}
</style>
