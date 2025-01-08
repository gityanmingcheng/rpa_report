<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<script setup lang="ts">
import { ref, inject, onMounted, computed } from 'vue'
import { ElDialog, ElMessage, ElMessageBox } from 'element-plus'
import 'element-plus/dist/index.css'

interface Config {
  _id: string
  name: string
  created_at: string
  updated_at: string
  mappings: FieldMapping[]
}

interface FieldMapping {
  templateField: string
  userField: string
}

const backendPort = inject('backendPort', ref<number | null>(null))
// const backendPort = ref(8080)
const configs = ref<Config[]>([])
const dialogVisible = ref(false)
const configName = ref('')
const parseText = ref('')
const isEdit = ref(false)
const currentConfig = ref<Config | null>(null)
const templateFields = ref<string[]>([])
const previewVisible = ref(false)

// 区分列表预览和编辑预览的状态
const listPreviewVisible = ref(false)
const editPreviewVisible = ref(false)
const previewConfig = ref<Config | null>(null)

const filePath = ref<string>('')
const isDragging = ref(false)
const uploadStatus = ref<'idle' | 'uploading' | 'success' | 'error'>('idle')

const refreshing = ref(false)

// 获取配置列表
const fetchConfigs = async () => {
  if (!backendPort.value) return

  try {
    console.log('开始获取配置列表...')
    const response = await window.electron.serverApi.request(
      backendPort.value,
      'GET',
      '/api/data',
      null
    )

    // console.log('获取配置列表响应:', response)
    if (response.ok && Array.isArray(response.data)) {
      configs.value = response.data
    } else {
      ElMessage.error('获取配置列表失败')
    }
  } catch (error) {
    console.error('获取配置列表失败:', error)
    ElMessage.error('获取配置列表失败：' + (error instanceof Error ? error.message : String(error)))
  }
}

// 获取模板字段列表
const fetchTemplateFields = async () => {
  if (!backendPort.value) return

  try {
    console.log('开始获取模板字段...')
    const response = await window.electron.serverApi.request(
      backendPort.value,
      'GET',
      '/api/file/getTemHeader',
      null
    )

    // console.log('获取模板字段响应:', response)
    if (response.ok && Array.isArray(response.data)) {
      templateFields.value = response.data
      // 初始化字段映射
      fieldMappings.value = templateFields.value.map((field) => ({
        templateField: field,
        userField: ''
      }))
    } else {
      ElMessage.error('获取模板字段失败')
    }
  } catch (error) {
    console.error('获取模板字段失败:', error)
    ElMessage.error('获取模板字段失败：' + (error instanceof Error ? error.message : String(error)))
  }
}

// 初始化 fieldMappings
const fieldMappings = ref<FieldMapping[]>([])

// 打开对话框
const openDialog = (config?: Config) => {
  if (config) {
    
    // 编辑模式
    isEdit.value = true
    currentConfig.value = config
    configName.value = config.name
    filePath.value = ''
    fieldMappings.value = [...config.mappings]
  } else {
    // 新增模式
    isEdit.value = false
    currentConfig.value = null
    configName.value = ''
    filePath.value = ''
    // 使用当前模板字段初始化
    fieldMappings.value = templateFields.value.map((field) => ({
      templateField: field,
      userField: ''
    }))
  }
  if (templateFields.value.length < 1) {
    fetchTemplateFields()
  }
  dialogVisible.value = true
}

// 组件挂载时获取数据
onMounted(async () => {
  console.log('组件挂载，开始初始化...')
  await fetchTemplateFields()
  await fetchConfigs()
})

// 关闭对话框时重置状态
const handleClose = () => {
  dialogVisible.value = false
  configName.value = ''
  parseText.value = ''
  // 重置为初始模板字段
  fieldMappings.value = templateFields.value.map((field) => ({
    templateField: field,
    userField: ''
  }))
}

// 优化预览数据格式
const formatMappings = (mappings: FieldMapping[]) => {
  return mappings
    .filter((m) => m.templateField && m.userField) // 过滤掉未完成的映射
    .map((m) => `${m.userField} ==> ${m.templateField}`)
}

// 生成预览数据
const previewData = computed(() => {
  return {
    name: configName.value,
    mappings: formatMappings(fieldMappings.value)
  }
})

// 表单验证状态
const formValid = computed(() => {
  return configName.value.trim() !== ''
})

// 处理提交
const handleSubmit = async () => {
  // 表单验证
  if (!formValid.value) {
    ElMessage.warning('请输入配置名称')
    return
  }

  if (!backendPort.value) {
    ElMessage.error('后端服务未连接')
    return
  }

  // 过滤掉未完成的映射
  const validMappings = fieldMappings.value.filter(
    (mapping) => mapping.templateField && mapping.userField
  )

  const submitData = {
    name: configName.value,
    mappings: validMappings.map((mapping) => ({
      templateField: String(mapping.templateField),
      userField: String(mapping.userField)
    }))
  }

  if (isEdit.value && currentConfig.value) {
    submitData._id = String(currentConfig.value._id)
  }

  try {
    const serializedData = JSON.stringify(submitData)
    console.log('提交的数据:', serializedData)

    const response = await window.electron.serverApi.request(
      backendPort.value,
      'POST',
      '/api/data',
      JSON.parse(serializedData)
    )

    if (response.message) {
      ElMessage.success('保存成功')
      await fetchConfigs()
      handleClose()
    }
  } catch (error) {
    console.error('提交的数据:', submitData)
    ElMessage.error('保存失败：' + (error instanceof Error ? error.message : String(error)))
  }
}

// 列表页预览配置
const showListPreview = (config: Config) => {
  previewConfig.value = config
  listPreviewVisible.value = true
}

// 编辑页预览配置
const showEditPreview = () => {
  editPreviewVisible.value = true
}

// 格式化预览数据
const getPreviewData = (config: Config | null) => {
  if (!config) return null
  return {
    name: config.name,
    mappings: formatMappings(config.mappings)
  }
}

// 关闭列表预览
const closeListPreview = () => {
  listPreviewVisible.value = false
  previewConfig.value = null
}

// 关闭编辑预览
const closeEditPreview = () => {
  editPreviewVisible.value = false
}

// 添加新的映射字段
const addMapping = () => {
  if (!fieldMappings.value) {
    fieldMappings.value = [] // 确保数组已初始化
  }
  fieldMappings.value.push({
    templateField: '',
    userField: ''
  })
}

// 切换预览显示
const togglePreview = () => {
  previewVisible.value = !previewVisible.value
}

// 删除配置
const deleteConfig = async (id: string) => {
  try {
    // 显示确认对话框
    await ElMessageBox.confirm('确定要删除这条配置吗？删除后无法恢复。', '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    // 用户确认后，调用删除接口
    const response: any = await window.electron.serverApi.request(
      backendPort.value,
      'GET',
      `/api/data/delete/${id}`,
      null
    )

    if (response.ok) {
      ElMessage.success('删除成功')
      await fetchConfigs() // 刷新列表
    } else {
      ElMessage.error(response.message || '删除失败')
    }
  } catch (error) {
    if (error === 'cancel') {
      return // 用户取消删除
    }
    console.error('删除配置失败:', error)
    ElMessage.error('删除失败：' + (error instanceof Error ? error.message : String(error)))
  }
}

// 选择文件
const selectFile = async () => {
  try {
    const selectedPath = await window.electron.selectFilePath()
    if (selectedPath) {
      if (!/\.(xls|xlsx)$/i.test(selectedPath)) {
        ElMessage.warning('请选择 Excel 文件 (xls/xlsx 格式)')
        return
      }
      uploadStatus.value = 'idle'
      filePath.value = selectedPath
    }
  } catch (error) {
    console.error('选择文件失败:', error)
    ElMessage.error('选择文件失败：' + (error instanceof Error ? error.message : String(error)))
  }
}

// 处理文件拖拽
const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  isDragging.value = false
  const file = event.dataTransfer?.files[0]
  if (file) {
    if (!/\.(xls|xlsx)$/i.test(file.path)) {
      ElMessage.warning('请选择 Excel 文件 (xls/xlsx 格式)')
      return
    }
    uploadStatus.value = 'idle'
    filePath.value = file.path
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

// 计算字符串相似度 (Levenshtein Distance)
const calculateSimilarity = (str1: string, str2: string): number => {
  const s1 = str1.toLowerCase()
  const s2 = str2.toLowerCase()

  // 完全相同
  if (s1 === s2) return 1

  // 包含关系
  if (s1.includes(s2) || s2.includes(s1)) return 0.8

  // 去除空格后相同
  const t1 = s1.replace(/\s+/g, '')
  const t2 = s2.replace(/\s+/g, '')
  if (t1 === t2) return 0.9

  // 计算编辑距离
  const matrix = Array(s1.length + 1)
    .fill(null)
    .map(() => Array(s2.length + 1).fill(null))

  for (let i = 0; i <= s1.length; i++) matrix[i][0] = i
  for (let j = 0; j <= s2.length; j++) matrix[0][j] = j

  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      )
    }
  }

  // 计算相似度得分 (0-1之间)
  return 1 - matrix[s1.length][s2.length] / Math.max(s1.length, s2.length)
}

// 智能匹配模板字段
const autoMatchTemplateFields = (headers: string[]) => {
  const result: FieldMapping[] = headers.map((header) => {
    let bestMatch = ''
    let bestScore = 0

    // 遍历模板字段找到最佳匹配
    templateFields.value.forEach((template) => {
      const score = calculateSimilarity(header, template)
      if (score > bestScore && score > 0.6) {
        // 设置最小匹配阈值
        bestScore = score
        bestMatch = template
      }
    })

    return {
      templateField: bestMatch,
      userField: header
    }
  })

  // 处理重复匹配
  const usedTemplates = new Set<string>()
  result.forEach((mapping) => {
    if (mapping.templateField && usedTemplates.has(mapping.templateField)) {
      mapping.templateField = '' // 如果模板字段已被使用，清空该匹配
    } else if (mapping.templateField) {
      usedTemplates.add(mapping.templateField)
    }
  })

  return result
}

// 解析Excel表头
const parseExcelHeaders = async () => {
  if (!filePath.value) {
    ElMessage.warning('请先选择Excel文件')
    return
  }

  try {
    uploadStatus.value = 'uploading'
    const response: any = await window.electron.serverApi.request(
      backendPort.value,
      'POST',
      '/api/file/parse_excel',
      {
        path: filePath.value,
        header: 0
      }
    )

    if (response.ok && Array.isArray(response.data)) {
      // 自动匹配并更新字段映射
      fieldMappings.value = autoMatchTemplateFields(response.data)

      uploadStatus.value = 'success'
      ElMessage.success('解析成功并已自动匹配字段')

      // 显示匹配结果统计
      const matchedCount = fieldMappings.value.filter((m) => m.templateField).length
      if (matchedCount > 0) {
        ElMessage.info(`自动匹配了 ${matchedCount}/${response.data.length} 个字段`)
      }
    } else {
      uploadStatus.value = 'error'
      ElMessage.error(response.message || '解析失败')
    }
  } catch (error) {
    console.error('解析Excel失败:', error)
    uploadStatus.value = 'error'
    ElMessage.error('解析失败：' + (error instanceof Error ? error.message : String(error)))
  }
}

const systemConfigVisible = ref(false)
const systemConfigContent = ref('')
const configSaving = ref(false)

// 打开系统配置
const openSystemConfig = async () => {
  try {
    const content = await window.electron.readSystemConfig()
    systemConfigContent.value = content
    systemConfigVisible.value = true
  } catch (error) {
    ElMessage.error('读取系统配置失败：' + (error instanceof Error ? error.message : String(error)))
  }
}

// 保存系统配置
const saveSystemConfig = async () => {
  if (!systemConfigContent.value.trim()) {
    ElMessage.warning('配置内容不能为空')
    return
  }

  try {
    configSaving.value = true
    await window.electron.saveSystemConfig(systemConfigContent.value)
    ElMessage.success('保存成功')
    systemConfigVisible.value = false
  } catch (error) {
    ElMessage.error('保存失败：' + (error instanceof Error ? error.message : String(error)))
  } finally {
    configSaving.value = false
  }
}

const textareaRef = ref<HTMLTextAreaElement | null>(null)

// 处理滚动同步
const handleScroll = (e: Event) => {
  const textarea = e.target as HTMLTextAreaElement
  const lineNumbers = textarea.previousElementSibling as HTMLElement
  if (lineNumbers) {
    lineNumbers.scrollTop = textarea.scrollTop
  }
}

// 刷新列表
const refreshList = async () => {
  if (!backendPort.value || refreshing.value) return
  
  try {
    refreshing.value = true
    await fetchConfigs() // 重新获取配置列表
    ElMessage.success('刷新成功')
  } catch (error) {
    console.error('刷新列表失败:', error)
    ElMessage.error('刷新失败：' + (error instanceof Error ? error.message : String(error)))
  } finally {
    refreshing.value = false
  }
}
</script>

<template>
  <div class="config-table">
    <div class="header">
      <h2>配置管理</h2>
      <div class="header-buttons">
        <button 
          class="refresh-btn" 
          @click="refreshList"
          :disabled="refreshing || !backendPort"
        >
          <span class="btn-icon" :class="{ 'rotating': refreshing }">
            🔄
          </span>
          {{ refreshing ? '刷新中...' : '刷新列表' }}
        </button>
        <button class="config-btn" @click="openSystemConfig">
          <span class="btn-icon">⚙️</span>
          系统配置
        </button>
        <button class="add-btn" @click="() => openDialog()">
          <span class="btn-icon">+</span>
          新增模板
        </button>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>配置名称</th>
          <th>创建时间</th>
          <th>修改时间</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="config in configs" :key="config._id">
          <td>{{ config.name }}</td>
          <td>{{ new Date(config.created_at).toLocaleString() }}</td>
          <td>{{ new Date(config.updated_at).toLocaleString() }}</td>
          <td>
            <div class="action-buttons">
              <button class="edit-btn" @click="() => openDialog(config)">修改</button>
              <button class="preview-btn small" @click="() => showListPreview(config)">
                <span class="preview-icon">👁预览</span>
              </button>
              <button class="delete-btn" @click="() => deleteConfig(config._id)">删除</button>
            </div>
          </td>
        </tr>
        <tr v-if="configs.length === 0">
          <td colspan="4" class="no-data">暂无数据</td>
        </tr>
      </tbody>
    </table>

    <!-- 列表页预览遮罩层 -->
    <div v-if="listPreviewVisible" class="preview-overlay" @click="closeListPreview">
      <div class="preview-content" @click.stop>
        <div class="preview-header">
          <h3>配置预览</h3>
          <button class="close-preview-btn" @click="closeListPreview">×</button>
        </div>
        <pre class="preview-json">{{ JSON.stringify(getPreviewData(previewConfig), null, 2) }}</pre>
      </div>
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑配置' : '新增配置'"
      width="90%"
      :close-on-click-modal="false"
      :before-close="handleClose"
    >
      <div class="dialog-conten">
        <div class="form-group">
          <div class="form-item">
            <label class="form-label required">配置名称</label>
            <div class="form-content">
              <input
                v-model="configName"
                type="text"
                class="form-input"
                :class="{ invalid: !formValid && configName === '' }"
                placeholder="请输入配置名称"
                required
              />
            </div>
          </div>
        </div>

        <div class="form-group">
          <label>Excel文件</label>
          <div
            class="file-upload-section"
            :class="{ dragging: isDragging }"
            @drop="handleDrop"
            @dragover="handleDragOver"
            @dragleave="handleDragLeave"
          >
            <div class="file-input-group">
              <input
                v-model="filePath"
                type="text"
                class="file-path-input"
                placeholder="请选择或拖拽Excel文件"
                readonly
              />
              <button
                type="button"
                class="select-file-btn"
                :disabled="uploadStatus === 'uploading'"
                @click="selectFile"
              >
                选择文件
              </button>
            </div>
            <button
              type="button"
              class="parse-btn"
              @click="parseExcelHeaders"
              :disabled="!filePath || uploadStatus === 'uploading'"
            >
              {{ uploadStatus === 'uploading' ? '解析中...' : '解析表头' }}
            </button>
          </div>
        </div>

        <div class="mapping-section">
          <div class="mapping-header">
            <h4>字段映射配置</h4>
            <div class="mapping-actions">
              <button type="button" class="preview-btn" @click="showEditPreview">
                <span class="preview-icon">👁</span>
                预览
              </button>
              <button type="button" class="add-mapping-btn" @click="addMapping">
                <span class="add-icon">+</span>
                添加字段
              </button>
            </div>
          </div>

          <!-- 预览遮罩层 -->
          <div v-if="editPreviewVisible" class="preview-overlay" @click="closeEditPreview">
            <div class="preview-content" @click.stop>
              <div class="preview-header">
                <h3>映射预览</h3>
                <button class="close-preview-btn" @click="closeEditPreview">×</button>
              </div>
              <pre class="preview-json">{{ JSON.stringify(previewData, null, 2) }}</pre>
            </div>
          </div>

          <div class="mapping-list">
            <div v-for="(mapping, index) in fieldMappings" :key="index" class="mapping-item">
              <input
                v-model="mapping.userField"
                type="text"
                class="user-field"
                placeholder="请输入字段名称"
              />
              <span class="mapping-arrow">→</span>
              <select v-model="mapping.templateField" class="template-field-select">
                <option value="">请选择模板字段</option>
                <option
                  v-for="field in templateFields"
                  :key="field"
                  :value="field"
                  :disabled="fieldMappings.some((m) => m !== mapping && m.templateField === field)"
                >
                  {{ field }}
                </option>
              </select>
              <button
                type="button"
                class="remove-mapping-btn"
                @click="fieldMappings.splice(index, 1)"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <button class="cancel-btn" @click="handleClose">取消</button>
          <button class="submit-btn" :disabled="!formValid" @click="handleSubmit">确定</button>
        </div>
      </template>
    </el-dialog>

    <!-- 系统配置对话框 -->
    <el-dialog
      v-model="systemConfigVisible"
      title="系统配置"
      width="90%"
      :close-on-click-modal="false"
      class="system-config-dialog"
    >
      <div class="system-config-editor">
        <div class="editor-header">
          <div class="header-info">
            <span class="header-title">配置文件编辑</span>
            <span class="header-desc">system.ini</span>
          </div>
          <div class="warning-box">
            <span class="warning-icon">⚠️</span>
            <span class="warning-text">修改配置后需要重启应用才能生效</span>
          </div>
        </div>
        <div class="editor-container">
          <div class="line-numbers">
            <div v-for="i in systemConfigContent.split('\n').length" :key="i" class="line-number">
              {{ i }}
            </div>
          </div>
          <textarea
            v-model="systemConfigContent"
            class="config-textarea"
            spellcheck="false"
            placeholder="正在加载配置..."
            @scroll="handleScroll"
            ref="textareaRef"
          ></textarea>
        </div>
        <div class="editor-footer">
          <span class="footer-info">行数: {{ systemConfigContent.split('\n').length }}</span>
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <button class="cancel-btn" @click="systemConfigVisible = false">
            <span class="btn-icon">✕</span>
            取消
          </button>
          <button class="submit-btn" :disabled="configSaving" @click="saveSystemConfig">
            <span class="btn-icon">{{ configSaving ? '⌛' : '💾' }}</span>
            {{ configSaving ? '保存中...' : '保存' }}
          </button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.config-table {
  width: 100%;
  height: 100%;
  padding: 16px;
  overflow: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 16px;
}

th,
td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #f0f0f0;
}

th {
  background: #fafafa;
  font-weight: 500;
  color: #262626;
}

td {
  color: #595959;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.status-badge.active {
  background: #e6f7ff;
  color: #1890ff;
}

.status-badge.inactive {
  background: #fff1f0;
  color: #ff4d4f;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.header h2 {
  margin: 0;
  font-size: 18px;
  color: #262626;
}

.header-buttons {
  display: flex;
  gap: 12px;
  align-items: center;
}

.config-btn,
.add-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.config-btn {
  background: #faad14;
  color: white;
}

.config-btn:hover {
  background: #ffc53d;
}

.add-btn {
  background: #1890ff;
  color: white;
}

.add-btn:hover {
  background: #40a9ff;
}

.btn-icon {
  font-size: 14px;
  display: inline-flex;
  align-items: center;
}

/* 响应式调整 */
@media (max-width: 576px) {
  .header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .header-buttons {
    width: 100%;
  }

  .config-btn,
  .add-btn {
    flex: 1;
    justify-content: center;
  }
}

.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.dialog {
  background: white;
  border-radius: 8px;
  width: 500px;
  height: 700px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.dialog-header h3 {
  margin: 0;
  font-size: 16px;
  color: #262626;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #999;
}

.dialog-content {
  padding: 16px;
  flex: 1;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 16px;
}

.form-item {
  display: flex;
  align-items: center;
  gap: 16px;
}

.form-label {
  width: 80px;
  flex-shrink: 0;
  text-align: right;
  color: #262626;
}

.form-content {
  flex: 1;
}

.form-content input {
  width: 100%;
  padding: 8px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
}

.form-content input:focus {
  border-color: #40a9ff;
  outline: none;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.dialog-footer {
  padding: 16px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  background: white;
  position: sticky;
  bottom: 0;
}

.cancel-btn,
.submit-btn {
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.cancel-btn {
  background: white;
  border: 1px solid #d9d9d9;
}

.submit-btn {
  background: #1890ff;
  color: white;
  border: none;
}

.submit-btn:hover {
  background: #40a9ff;
}

.mapping-section {
  margin-top: 20px;
  max-height: 300px;
  overflow-y: auto;
}

.mapping-section h4 {
  margin: 0 0 12px 0;
  color: #262626;
  font-size: 14px;
}

.mapping-list {
  border: 1px solid #f0f0f0;
  border-radius: 4px;
  padding: 8px;
}

.mapping-item {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  padding: 8px;
  background: #fafafa;
  border-radius: 4px;
}

.user-field,
.template-field-select {
  flex: 1;
  min-width: 200px;
  max-width: 300px;
  padding: 6px 8px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  height: 32px;
  box-sizing: border-box;
}

.mapping-arrow {
  flex: none;
  color: #8c8c8c;
  font-weight: bold;
  padding: 0 8px;
}

.remove-mapping-btn {
  flex: none;
  width: 32px;
  height: 32px;
  padding: 0;
  background: none;
  border: none;
  color: #ff4d4f;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.3s;
}

.remove-mapping-btn:hover {
  color: #ff7875;
}

.template-field-select {
  appearance: none;
  background: #fff
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23999' d='M6 8L1 3h10z'/%3E%3C/svg%3E")
    no-repeat right 8px center;
  padding-right: 24px;
}

.parse-section {
  display: flex;
  gap: 8px;
}

.parse-input {
  flex: 1;
  padding: 8px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  resize: vertical;
  min-height: 80px;
}

.parse-btn {
  padding: 8px 16px;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  align-self: flex-start;
}

.edit-btn {
  padding: 4px 8px;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.3s;
}

.edit-btn:hover {
  background: #40a9ff;
}

.no-data {
  text-align: center;
  color: #999;
  padding: 32px;
}

/* 调整 Element Plus Dialog 的样式 */
:deep(.el-dialog) {
  border-radius: 8px;
}

:deep(.el-dialog__header) {
  margin: 0;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
}

:deep(.el-dialog__body) {
  padding: 16px;
  max-height: 60vh;
  overflow-y: auto;
}

:deep(.el-dialog__footer) {
  padding: 16px;
  border-top: 1px solid #f0f0f0;
}

.mapping-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.mapping-header h4 {
  margin: 0;
  color: #262626;
  font-size: 14px;
}

.add-mapping-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.3s;
}

.add-mapping-btn:hover {
  background: #40a9ff;
}

.add-icon {
  font-size: 14px;
  font-weight: bold;
}

.mapping-item {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  padding: 8px;
  background: #fafafa;
  border-radius: 4px;
}

.user-field {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
}

.mapping-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.preview-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  background: #52c41a;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.3s;
}

.preview-btn:hover {
  background: #73d13d;
}

.preview-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000; /* 确保在 el-dialog 之上 */
}

.preview-content {
  position: relative;
  z-index: 2001; /* 确保在遮罩层之上 */
  background: white;
  border-radius: 8px;
  width: 500px;
  max-height: 80vh;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.preview-header h3 {
  margin: 0;
  font-size: 16px;
  color: #262626;
}

.close-preview-btn {
  background: none;
  border: none;
  font-size: 20px;
  color: #999;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
}

.preview-json {
  margin: 0;
  padding: 16px;
  background: #fafafa;
  overflow: auto;
  max-height: calc(80vh - 60px);
  font-family: monospace;
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
}

.action-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
}

.edit-btn {
  padding: 4px 8px;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.preview-btn.small {
  padding: 4px 8px;
  background: #52c41a;
  height: auto;
  font-size: 12px;
  min-width: auto;
}

.preview-btn.small .preview-icon {
  margin: 0;
}

.preview-json {
  margin: 0;
  padding: 16px;
  background: #fafafa;
  overflow: auto;
  max-height: calc(80vh - 60px);
  font-family: monospace;
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
}

/* 优化预览内容的样式 */
.preview-json {
  color: #333;
}

.preview-content {
  min-width: 400px;
  max-width: 600px;
  width: auto;
}

.delete-btn {
  padding: 4px 8px;
  background: #ff4d4f;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background-color 0.3s;
}

.delete-btn:hover {
  background: #ff7875;
}

.delete-btn:active {
  background: #d9363e;
}

/* 禁用状态 */
.delete-btn:disabled {
  background: #ffccc7;
  cursor: not-allowed;
}

.file-upload-section {
  border: 2px dashed #d9d9d9;
  border-radius: 4px;
  padding: 16px;
  transition: all 0.3s;
  background: #fafafa;
}

.file-upload-section.dragging {
  border-color: #1890ff;
  background: #e6f7ff;
}

.file-input-group {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.file-path-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: white;
  cursor: default;
  font-size: 14px;
}

.select-file-btn {
  padding: 8px 16px;
  background: #52c41a;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
}

.select-file-btn:hover:not(:disabled) {
  background: #73d13d;
}

.select-file-btn:disabled {
  background: #d9d9d9;
  cursor: not-allowed;
}

.parse-btn {
  width: 100%;
  padding: 8px 16px;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
}

.parse-btn:hover:not(:disabled) {
  background: #40a9ff;
}

.parse-btn:disabled {
  background: #d9d9d9;
  cursor: not-allowed;
}

.form-label.required::after {
  content: '*';
  color: #ff4d4f;
  margin-left: 4px;
}

.form-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  transition: all 0.3s;
}

.form-input:hover {
  border-color: #40a9ff;
}

.form-input:focus {
  border-color: #1890ff;
  outline: none;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.form-input.invalid {
  border-color: #ff4d4f;
}

.form-input.invalid:hover,
.form-input.invalid:focus {
  border-color: #ff7875;
  box-shadow: 0 0 0 2px rgba(255, 77, 79, 0.2);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 16px;
}

.cancel-btn,
.submit-btn {
  padding: 8px 16px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  transition: all 0.3s;
}

.cancel-btn {
  background: #f0f0f0;
  color: #595959;
}

.cancel-btn:hover {
  background: #d9d9d9;
}

.submit-btn {
  background: #1890ff;
  color: white;
}

.submit-btn:hover:not(:disabled) {
  background: #40a9ff;
}

.submit-btn:disabled {
  background: #d9d9d9;
  cursor: not-allowed;
}

.system-config-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.hint {
  font-size: 12px;
  color: #faad14;
}

.config-textarea {
  width: 100%;
  min-height: 300px;
  padding: 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-family: monospace;
  font-size: 14px;
  line-height: 1.5;
  resize: vertical;
  white-space: pre;
  tab-size: 4;
}

.config-textarea:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.system-config-dialog :deep(.el-dialog__header) {
  border-bottom: 1px solid #f0f0f0;
  margin-right: 0;
  padding: 16px 20px;
}

.system-config-dialog :deep(.el-dialog__body) {
  padding: 0;
}

.system-config-editor {
  display: flex;
  flex-direction: column;
  height: 70vh;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-title {
  font-size: 14px;
  font-weight: 500;
  color: #262626;
}

.header-desc {
  font-size: 12px;
  color: #8c8c8c;
  background: #f5f5f5;
  padding: 2px 8px;
  border-radius: 4px;
}

.warning-box {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #fffbe6;
  padding: 6px 12px;
  border-radius: 4px;
  border: 1px solid #ffe58f;
}

.warning-icon {
  font-size: 14px;
}

.warning-text {
  font-size: 12px;
  color: #faad14;
}

.editor-container {
  display: flex;
  flex: 1;
  overflow: hidden;
  background: #fff;
  border: 1px solid #f0f0f0;
  margin: 20px;
  border-radius: 4px;
}

.line-numbers {
  padding: 12px 8px;
  background: #fafafa;
  border-right: 1px solid #f0f0f0;
  text-align: right;
  color: #bfbfbf;
  font-family: monospace;
  font-size: 14px;
  line-height: 1.5;
  overflow-y: hidden;
  user-select: none;
}

.line-number {
  padding: 0 8px;
}

.config-textarea {
  flex: 1;
  padding: 12px;
  border: none;
  font-family: 'Fira Code', monospace;
  font-size: 14px;
  line-height: 1.5;
  resize: none;
  white-space: pre;
  tab-size: 4;
  color: #262626;
  background: #fff;
}

.config-textarea:focus {
  outline: none;
}

.editor-footer {
  padding: 8px 20px;
  background: #fafafa;
  border-top: 1px solid #f0f0f0;
}

.footer-info {
  font-size: 12px;
  color: #8c8c8c;
}

.dialog-footer {
  padding: 16px 20px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  border-top: 1px solid #f0f0f0;
}

.cancel-btn,
.submit-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 14px;
}

.btn-icon {
  font-size: 14px;
}

.cancel-btn {
  background: #f5f5f5;
  color: #595959;
}

.cancel-btn:hover {
  background: #e8e8e8;
}

.submit-btn {
  background: #1890ff;
  color: white;
}

.submit-btn:hover:not(:disabled) {
  background: #40a9ff;
}

.submit-btn:disabled {
  background: #d9d9d9;
  cursor: not-allowed;
}

.refresh-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #52c41a;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
}

.refresh-btn:hover:not(:disabled) {
  background: #73d13d;
}

.refresh-btn:disabled {
  background: #d9d9d9;
  cursor: not-allowed;
}

.btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn-icon.rotating {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
