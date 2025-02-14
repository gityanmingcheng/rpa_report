<script setup lang="ts">
import { ref, inject, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox, ElTable, ElTableColumn, ElPagination, ElButton, ElPopconfirm, ElTooltip } from 'element-plus'
import 'element-plus/dist/index.css'
import { ElSelect, ElOption } from 'element-plus'

interface Setting {
  _id: string
  _key: string
  option: string[]
  created_at: string
  updated_at: string
}

const backendPort = inject('backendPort', ref<number | null>(null))
const settings = ref<Setting[]>([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const currentSetting = ref<Setting | null>(null)

// 表单数据
const settingKey = ref('')
const settingOptions = ref<string[]>(['']) // 初始化一个空选项
const templateFields = ref<string[]>([])
const refreshing = ref(false)
const parseText = ref('')

const currentPage = ref(1)
const pageSize = ref(10)
const loading = ref(false)

// 计算当前页的数据
const currentPageData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return settings.value.slice(start, end)
})

// 获取设置列表
const fetchSettings = async () => {
  if (!backendPort.value) {
    ElMessage.warning('后端服务未连接')
    return
  }

  try {
    const response: any = await window.electron.serverApi.request(
      backendPort.value,
      'GET',
      '/api/set',
      null
    )

    if (response.code === 200 && Array.isArray(response.data)) {
      settings.value = response.data
    } else {
      ElMessage.error('获取设置列表失败')
    }
  } catch (error) {
    console.error('获取设置列表失败:', error)
    ElMessage.error('获取设置列表失败：' + (error instanceof Error ? error.message : String(error)))
  }
}

// 获取模板字段列表
const fetchTemplateFields = async () => {

    console.log('开始获取模板字段列表...')
  if (!backendPort.value) return
  console.log('开始获取模板字段列表22...')
  try {
    const response: any = await window.electron.serverApi.request(
      backendPort.value,
      'GET',
      '/api/file/getTemHeader',
      null
    )

    if (response.ok && Array.isArray(response.data)) {
      templateFields.value = response.data
    } else {
      ElMessage.error('获取模板字段失败')
    }
  } catch (error) {
    console.error('获取模板字段失败:', error)
    ElMessage.error('获取模板字段失败：' + (error instanceof Error ? error.message : String(error)))
  }
}

// 打开对话框
const openDialog = (setting?: Setting) => {
    if(templateFields.value.length === 0){
      fetchTemplateFields()
    }

  if (setting) {
    // 编辑模式
    isEdit.value = true
    currentSetting.value = setting
    settingKey.value = setting._key
    settingOptions.value = [...setting.option]
  } else {
    // 新增模式
    isEdit.value = false
    currentSetting.value = null
    settingKey.value = ''
    settingOptions.value = ['']
  }
  dialogVisible.value = true
}

// 组件挂载时获取数据
onMounted(async () => {
  await fetchTemplateFields()
  await fetchSettings()
})

// 添加选项
const addOption = () => {
  settingOptions.value.push('')
}

// 删除选项
const removeOption = (index: number) => {
  settingOptions.value.splice(index, 1)
}

// 表单验证
const formValid = computed(() => {
  return (
    settingKey.value.trim() !== '' &&
    settingOptions.value.length > 0 &&
    settingOptions.value.every((opt) => opt.trim() !== '')
  )
})

// 处理提交
const handleSubmit = async () => {
  if (!formValid.value) {
    ElMessage.warning('请填写完整的设置信息')
    return
  }

  if (!backendPort.value) {
    ElMessage.error('后端服务未连接')
    return
  }

  const submitData = {
    _key: settingKey.value,
    option: settingOptions.value.filter((opt) => opt.trim() !== '')
  }

  if (isEdit.value && currentSetting.value) {
    submitData._id = currentSetting.value._id
  }

  try {
    const response: any = await window.electron.serverApi.request(
      backendPort.value,
      'POST',
      '/api/set',
      submitData
    )

    if (response.code === 200) {
      ElMessage.success('保存成功')
      await fetchSettings()
      handleClose()
    } else {
      ElMessage.error(response.message || '保存失败')
    }
  } catch (error) {
    console.error('保存设置失败:', error)
    ElMessage.error('保存失败：' + (error instanceof Error ? error.message : String(error)))
  }
}

// 关闭对话框
const handleClose = () => {
  dialogVisible.value = false
  settingKey.value = ''
  settingOptions.value = ['']
}

// 删除设置
const deleteSetting = async (id: string) => {
  if (!backendPort.value) {
    ElMessage.error('后端服务未连接')
    return
  }

  try {
    loading.value = true
    await ElMessageBox.confirm('确定要删除这条设置吗？删除后无法恢复。', '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    const response: any = await window.electron.serverApi.request(
      backendPort.value,
      'GET',
      `/api/set/delete/${id}`,
      null
    )

    if (response.code === 200) {
      ElMessage.success('删除成功')
      await fetchSettings()
    } else {
      ElMessage.error(response.message || '删除失败')
    }
  } catch (error) {
    if (error === 'cancel') return
    console.error('删除设置失败:', error)
    ElMessage.error('删除失败：' + (error instanceof Error ? error.message : String(error)))
  } finally {
    loading.value = false
  }
}

// 刷新列表
const refreshList = async () => {
  if (!backendPort.value || refreshing.value) return

  try {
    refreshing.value = true
    await fetchSettings()
    ElMessage.success('刷新成功')
  } catch (error) {
    console.error('刷新列表失败:', error)
    ElMessage.error('刷新失败：' + (error instanceof Error ? error.message : String(error)))
  } finally {
    refreshing.value = false
  }
}

// 解析文本数据
const parseTextToOptions = () => {
  if (!parseText.value.trim()) {
    ElMessage.warning('请先输入要解析的文本')
    return
  }

  const text = parseText.value.trim()
  let items: string[] = []

  // 判断数据格式并解析
  if (text.includes('-')) {
    // 格式2: 保持原样，按换行分割
    items = text.split('\n')
      .filter(line => line.trim())
      .map(line => line.trim())
  } else {
    // 格式1: 使用制表符或空格分隔的文本
    items = text.split(/[\t\s]+/).filter(item => item.trim())
  }

  // 更新选项
  if (items.length > 0) {
    settingOptions.value = items
    parseText.value = '' // 清空解析文本框
    ElMessage.success(`成功解析 ${items.length} 个选项`)
  } else {
    ElMessage.warning('未能解析出有效数据')
  }
}

// 处理页码改变
const handleCurrentChange = (val: number) => {
  currentPage.value = val
}

// 处理每页条数改变
const handleSizeChange = (val: number) => {
  pageSize.value = val
  currentPage.value = 1 // 重置到第一页
}

// 计算序号
const calculateIndex = (index: number) => {
  return (currentPage.value - 1) * pageSize.value + index + 1
}
</script>

<template>
  <div class="setting-table">
    <div class="header">
      <h2>设置管理</h2>
      <div class="header-buttons">
        <button class="refresh-btn" :disabled="refreshing || !backendPort" @click="refreshList">
          <span class="btn-icon" :class="{ rotating: refreshing }">🔄</span>
          {{ refreshing ? '刷新中...' : '刷新列表' }}
        </button>
        <button class="add-btn" @click="() => openDialog()">
          <span class="btn-icon">+</span>
          新增设置
        </button>
      </div>
    </div>

    <el-table
      :data="currentPageData"
      style="width: 100%"
      :height="400"
      border
      v-loading="loading"
    >
      <el-table-column
        type="index"
        label="序号"
        width="70"
        align="center"
        :index="calculateIndex"
      />
      <el-table-column prop="_key" label="关键字段" width="200" />
      <el-table-column label="选项值" min-width="300">
        <template #default="{ row }">
          <el-tooltip
            v-if="row.option.length > 0"
            :content="row.option.join(', ')"
            placement="top"
            :show-after="500"
          >
            <div class="options-preview">
              {{ row.option.slice(0, 3).join(', ') }}
              <span v-if="row.option.length > 3">
                (共{{ row.option.length }}项)...
              </span>
            </div>
          </el-tooltip>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" width="180">
        <template #default="{ row }">
          {{ new Date(row.created_at).toLocaleString() }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button
            size="small"
            type="primary"
            @click="openDialog(row)"
          >
            修改
          </el-button>
          <el-popconfirm
            title="确定要删除这条记录吗？"
            @confirm="deleteSetting(row._id)"
          >
            <template #reference>
              <el-button
                size="small"
                type="danger"
              >
                删除
              </el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination-container">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="settings.length"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑设置' : '新增设置'"
      width="500px"
      :close-on-click-modal="false"
      :before-close="handleClose"
    >
      <div class="dialog-content">
        <div class="form-group">
          <label class="form-label required">关键字段</label>
          <el-select
            v-model="settingKey"
            filterable
            placeholder="请选择关键字段"
            class="form-select"
            :style="{ width: '100%' }"
          >
            <el-option
              v-for="field in templateFields"
              :key="field"
              :label="field"
              :value="field"
            />
          </el-select>
        </div>

        <div class="form-group">
          <label class="form-label required">选项配置</label>
          <div class="parse-area">
            <el-input
              type="textarea"
              v-model="parseText"
              :rows="4"
              placeholder="请粘贴要解析的文本数据"
            />
            <el-button type="primary" @click="parseTextToOptions">解析数据</el-button>
          </div>
          <div class="options-container">
            <div class="options-header">
              <span>选项值</span>
              <span class="header-spacer"></span>
            </div>
            <div class="options-body">
              <div v-for="(option, index) in settingOptions" :key="index" class="option-item">
                <input
                  v-model="settingOptions[index]"
                  type="text"
                  class="form-input"
                  placeholder="请输入选项值"
                />
                <button
                  type="button"
                  class="remove-option-btn"
                  @click="removeOption(index)"
                  :disabled="settingOptions.length === 1"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
          <button type="button" class="add-option-btn" @click="addOption">
            <span class="btn-icon">+</span>
            添加选项
          </button>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <button class="cancel-btn" @click="handleClose">取消</button>
          <button class="submit-btn" :disabled="!formValid" @click="handleSubmit">确定</button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
/* 复用 ConfigTable 的基础样式 */
.setting-table {
  width: 100%;
  height: 100%;
  padding: 16px;
  overflow: auto;
}

/* 表格样式 */
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

/* 头部样式 */
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
}

/* 按钮样式 */
.refresh-btn,
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

.refresh-btn {
  background: #faad14;
  color: white;
}

.add-btn {
  background: #1890ff;
  color: white;
}

.btn-icon {
  font-size: 14px;
}

.rotating {
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

/* 表单样式 */
.form-group {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

.form-label.required::after {
  content: "*";
  color: #f56c6c;
  margin-left: 4px;
}

/* 覆盖 Element Plus 默认样式，使其与你的设计保持一致 */
:deep(.el-select) {
  width: 100%;
}

:deep(.el-input__wrapper) {
  background-color: var(--el-fill-color-blank);
}

:deep(.el-select .el-input__wrapper) {
  box-shadow: 0 0 0 1px #dcdfe6 inset;
}

:deep(.el-select .el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px var(--el-border-color-hover) inset;
}

/* 选项列表样式 */
.options-list {
  margin-bottom: 12px;
}

.options-container {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  margin-top: 8px;
}

.options-header {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background-color: #f5f7fa;
  border-bottom: 1px solid #dcdfe6;
  font-weight: 500;
  color: #606266;
}

.header-spacer {
  width: 32px; /* 与删除按钮宽度对应 */
}

.options-body {
  max-height: 300px; /* 设置最大高度 */
  overflow-y: auto;
  padding: 8px;
}

.option-item {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.option-item:last-child {
  margin-bottom: 0;
}

.form-input {
  flex: 1;
  padding: 8px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 14px;
}

.form-input:focus {
  outline: none;
  border-color: #409eff;
}

.remove-option-btn {
  padding: 8px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  color: #666;
  min-width: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.remove-option-btn:hover {
  color: #f56c6c;
  border-color: #f56c6c;
}

.remove-option-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

/* 自定义滚动条样式 */
.options-body::-webkit-scrollbar {
  width: 6px;
}

.options-body::-webkit-scrollbar-thumb {
  background-color: #c0c4cc;
  border-radius: 3px;
}

.options-body::-webkit-scrollbar-track {
  background-color: #f5f7fa;
}

/* 操作按钮样式 */
.action-buttons {
  display: flex;
  gap: 8px;
}

.edit-btn,
.delete-btn {
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.edit-btn {
  background: #1890ff;
  color: white;
}

.delete-btn {
  background: #ff4d4f;
  color: white;
}

/* 选项预览样式 */
.options-preview {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 对话框底部按钮 */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}

.cancel-btn,
.submit-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.cancel-btn {
  background: #f0f0f0;
  color: #595959;
}

.submit-btn {
  background: #1890ff;
  color: white;
}

.submit-btn:disabled {
  background: #d9d9d9;
  cursor: not-allowed;
}

.no-data {
  text-align: center;
  color: #999;
  padding: 24px;
}

.parse-area {
  margin-bottom: 16px;
  display: flex;
  gap: 8px;
}

.parse-area .el-textarea {
  flex: 1;
}

.add-option-btn {
  width: 100%;
  padding: 8px;
  background: #52c41a;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

:deep(.el-table) {
  --el-table-border-color: #dcdfe6;
  --el-table-header-bg-color: #f5f7fa;
}

:deep(.el-table__header-wrapper) {
  background-color: var(--el-table-header-bg-color);
}

:deep(.el-button) {
  margin-right: 8px;
}

:deep(.el-button:last-child) {
  margin-right: 0;
}

:deep(.el-table .el-table__cell.is-center) {
  text-align: center;
}
</style> 