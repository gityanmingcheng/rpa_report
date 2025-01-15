<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<script setup lang="ts">
import { ref, inject, computed, onMounted } from 'vue'

const backendPort = inject('backendPort', ref<number | null>(null))
const backendStatus = inject('backendStatus', ref<'连接中' | '已连接' | '已断开'>('连接中'))
const uploadStatus = ref<'idle' | 'uploading' | 'success' | 'error'>('idle')
const uploadResult = ref<string | string[] | null>(null)
const uploadCount = ref<number | null>(0)
const filePath = ref<string>('')
const isDragging = ref(false)

// 添加 TypeScript 类型声明
declare global {
  interface Window {
    sensors: any;
  }
}

const initSensors = (retryCount = 0) => {
  console.log('尝试初始化神策...', retryCount)
  
  if (retryCount >= 3) {
    console.error('神策初始化失败，已达到最大重试次数')
    return
  }

  try {
    if (window.sensorsDataAnalytic201505) {
      window.sensors = window.sensorsDataAnalytic201505
      window.sensors.init({
        server_url: 'https://shence8006.ygibao.com/sa?project=KHFW',
        autoTrack: true,
        show_log: true,
        is_debug: true,
        send_type: 'beacon'
      })
      console.log('神策初始化成功')
    } else {
      // 如果 SDK 未加载，延迟后重试
      setTimeout(() => {
        initSensors(retryCount + 1)
      }, 1000)
    }
  } catch (error) {
    console.error('神策初始化出错:', error)
    // 发生错误时也重试
    setTimeout(() => {
      initSensors(retryCount + 1)
    }, 1000)
  }
}

// 组件挂载时初始化
onMounted(() => {
  initSensors()
})

const selectFile = async () => {
  try {
    const selectedPath = await window.electron.selectFilePath()
    if (selectedPath) {
      if (!/\.(xls|xlsx)$/i.test(selectedPath)) {
        uploadStatus.value = 'error'
        uploadResult.value = '请选择 Excel 文件 (xls/xlsx 格式)'
        // 清空文件路径
        filePath.value = ''
        return
      }
      uploadStatus.value = 'idle'
      uploadResult.value = ''
      filePath.value = selectedPath
    }
  } catch (error) {
    console.error('选择文件失败:', error)
    // 发生错误时也清空文件路径
    filePath.value = ''
    uploadStatus.value = 'error'
    uploadResult.value = '选择文件失败: ' + (error instanceof Error ? error.message : String(error))
  }
}

// 添加一个清理方法
const clearFileInput = () => {
  filePath.value = ''
  uploadResult.value = null
  uploadStatus.value = 'idle'
}

interface UploadResponse {
  message: string
  success: boolean
}

const trackEvent = (eventName: string, properties: Record<string, any>) => {
  try {
    if (window.sensors && typeof window.sensors.track === 'function') {
      window.sensors.track(eventName, {
        ...properties,
        timestamp: new Date().getTime()
      }, (success: boolean) => {
        if (success) {
          console.log('埋点上报成功:', eventName, properties)
        } else {
          console.error('埋点上报失败:', eventName, properties)
        }
      })
    }
  } catch (error) {
    console.error('埋点调用失败:', error)
  }
}

const handleSubmit = async () => {
  if (!backendPort.value || !filePath.value) {
    return
  }

  try {


    uploadStatus.value = 'uploading'
    console.log('开始提交文件:', filePath.value)
    const response: any = await window.electron.serverApi.request<UploadResponse>(
      backendPort.value,
      'POST',
      '/api/file/transExcel',
      { path: filePath.value }
    )
    console.log('提交结果:', response)
    uploadStatus.value = response.success ? 'success' : 'error'
    uploadResult.value = response.data.datalist
    uploadCount.value = response.data.count
    // 使用封装的埋点函数
    trackEvent('c_rap_useEvent', {
      file_path: filePath.value,
      status: backendStatus.value,
      count: response.data.count,
    })
  } catch (error) {
    console.error('提交失败:', error)
    uploadStatus.value = 'error'
    uploadResult.value = '提交失败: ' + (error instanceof Error ? error.message : String(error))
    // 使用封装的埋点函数
    trackEvent('c_rap_useEvent', {
      file_path: filePath.value,
      status: backendStatus.value,
      message: '提交失败',
    })
  }
}

const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  isDragging.value = false

  const files = event.dataTransfer?.files
  if (files && files.length > 0) {
    const file = files[0]
    if (!/\.(xls|xlsx)$/i.test(file.name)) {
      uploadStatus.value = 'error'
      uploadResult.value = '请选择 Excel 文件 (xls/xlsx 格式)'
      // 清空文件路径
      filePath.value = ''
      return
    }
    filePath.value = file.path
    uploadStatus.value = 'idle'
    uploadResult.value = ''
  }
}

const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  isDragging.value = true
}

const handleDragLeave = (event: DragEvent) => {
  event.preventDefault()
  isDragging.value = false
}

// 格式化上传结果
const formattedUploadResult = computed(() => {
  if (uploadResult.value) {
    if (Array.isArray(uploadResult.value)) {
      return uploadResult.value.join('\n')
    }
    return uploadResult.value
  }
  return ''
})

// 处理焦点事件
const handleFocus = (event: FocusEvent) => {
  const textarea = event.target as HTMLTextAreaElement
  textarea.select() // 选中内容
}


// 模拟的上传函数
</script>

<template>
  <div class="file-uploader">
    <div class="status-bar">
      后端状态: {{ backendStatus }}
      <span v-if="backendPort">(端口: {{ backendPort }})</span>
    </div>

    <div class="upload-container">
      <div class="description">
        <h3>批量案件格式转换工具</h3>
        <ul>
          <li>支持批量处理案件信息的格式转换</li>
          <li>仅支持 Excel 文件格式 (xls/xlsx)</li>
          <li>请确保表格格式符合模板要求</li>
          <li>处理完成后将生成标准格式的结果文件</li>
        </ul>
      </div>

      <div
        class="input-group"
        :class="{ dragging: isDragging }"
        @drop="handleDrop"
        @dragover="handleDragOver"
        @dragleave="handleDragLeave"
      >
        <input
          v-model="filePath"
          type="text"
          placeholder="请选择或拖拽 Excel 文件 (xls/xlsx 格式)"
          readonly
          class="file-input"
        />
        <button class="select-btn" :disabled="uploadStatus === 'uploading'" @click="selectFile">
          选择文件
        </button>
        <button
          class="submit-btn"
          :disabled="!filePath || uploadStatus === 'uploading' || backendStatus !== '已连接'"
          @click="handleSubmit"
        >
          {{ uploadStatus === 'uploading' ? '处理中...' : '开始处理' }}
        </button>
      </div>

      <div v-if="uploadResult" :class="['upload-result', uploadStatus]">
        <textarea
          v-model="formattedUploadResult"
          readonly
          class="upload-result-textarea"
          @focus="handleFocus"
        ></textarea>
      </div>
    </div>
  </div>
</template>

<style scoped>
.file-uploader {
  height: 100%;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  overflow: auto;
}

.status-bar {
  padding: 8px 16px;
  background-color: #fafafa;
  border-bottom: 1px solid #f0f0f0;
  font-size: 14px;
  color: #595959;
}

.upload-container {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.input-group {
  display: flex;
  gap: 8px;
  padding: 8px;
  border: 2px dashed transparent;
  border-radius: 4px;
  transition: all 0.3s;
}

.input-group:hover {
  border-color: #d9d9d9;
}

.input-group.dragging {
  border-color: #1890ff;
  background-color: rgba(24, 144, 255, 0.05);
}

.file-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 14px;
  background-color: #fff;
  cursor: default;
}

input:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

button {
  padding: 8px 16px;
  background-color: #1890ff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
}

button:hover:not(:disabled) {
  background-color: #40a9ff;
}

button:disabled {
  background-color: #d9d9d9;
  cursor: not-allowed;
}

.upload-result {
  padding: 12px;
  border-radius: 4px;
  font-size: 14px;
}

.upload-result.success {
  background-color: #f6ffed;
  border: 1px solid #b7eb8f;
  color: #52c41a;
}

.upload-result.error {
  background-color: #fff1f0;
  border: 1px solid #ffa39e;
  color: #ff4d4f;
}

.select-btn {
  background-color: #52c41a;
}

.select-btn:hover:not(:disabled) {
  background-color: #73d13d;
}

.submit-btn {
  background-color: #1890ff;
}

.submit-btn:hover:not(:disabled) {
  background-color: #40a9ff;
}

.description {
  background-color: #f5f5f5;
  padding: 16px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.description h3 {
  color: #1890ff;
  margin: 0 0 12px 0;
  font-size: 16px;
}

.description ul {
  margin: 0;
  padding-left: 20px;
  color: #595959;
  font-size: 14px;
}

.description li {
  margin-bottom: 8px;
  line-height: 1.5;
}

.description li:last-child {
  margin-bottom: 0;
}

.upload-result-textarea {
  width: 100%;
  height: 100px; /* 设置合适的高度 */
  border: none;
  background: transparent;
  resize: none; /* 禁止调整大小 */
  outline: none; /* 去掉聚焦时的边框 */
  font-family: monospace; /* 使用等宽字体 */
  color: inherit; /* 继承父元素的颜色 */
}
</style>
