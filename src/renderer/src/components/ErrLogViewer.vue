<template>
  <div class="log-viewer">
    <div class="controls">
      <input v-model="logPath" readonly class="log-path-input" />
      <button :disabled="isWatching" @click="startWatching">开始监控</button>
      <button :disabled="!isWatching" @click="stopWatching">停止监控</button>
    </div>
    <div ref="logContent" class="log-content">
      <div v-for="(line, index) in logLines" :key="index">
        {{ line }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted, nextTick, watch } from 'vue'

const props = defineProps<{
  defaultLogPath: string
}>()

const logPath = ref('')
const logLines = ref<string[]>([])
const isWatching = ref(false)
const logContent = ref<HTMLElement | null>(null)

// 监听 defaultLogPath 的变化
watch(
  () => props.defaultLogPath,
  (newPath) => {
    if (newPath) {
      logPath.value = newPath
      logLines.value = []
      // 自动开始监控
      stopWatching()
      startWatching()
    }
  },
  { immediate: true }
)

const startWatching = () => {
  if (!logPath.value) return
  isWatching.value = true
  window.electronAPI.startLogWatch({ logPath: logPath.value, watcherId: 'error' })
}

const stopWatching = () => {
  if (isWatching.value) {
    console.log('错误日志：停止监控')
    isWatching.value = false
    window.electronAPI.stopLogWatch()
  }
}

// 为错误日志查看器创建唯一的更新处理函数
const updateHandler = (data: { watcherId: string; line: string }) => {
  if (data.watcherId === 'error') {
    logLines.value.push(data.line)
    nextTick(() => {
      if (logContent.value) {
        logContent.value.scrollTop = logContent.value.scrollHeight
      }
    })
  }
}

// 组件挂载时添加监听器
window.electronAPI.onLogUpdate(updateHandler)

// 组件销毁时清理监听器
onUnmounted(() => {
  window.electronAPI.removeLogListener()
  stopWatching()
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
</style>
