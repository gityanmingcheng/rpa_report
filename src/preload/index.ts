import { contextBridge, ipcRenderer } from 'electron'

// 添加接口定义
interface BackendRobot {
  id: string
  name: string
  status: string
  last_active: string
}

// 原有的代码...

contextBridge.exposeInMainWorld('electronAPI', {
  // 现有的 API...

  // 添加日志相关的方法
  startLogWatch: (logPath: string) => ipcRenderer.send('start-log-watch', logPath),
  stopLogWatch: () => ipcRenderer.send('stop-log-watch'),
  onLogUpdate: (callback: (data: { watcherId: string; line: string }) => void) => {
    ipcRenderer.on('log-update', (_event, data) => callback(data))
  },
  removeLogListener: () => {
    ipcRenderer.removeAllListeners('log-update')
  },
  onLogError: (callback) => ipcRenderer.on('log-error', (_event, error) => callback(error))
})

contextBridge.exposeInMainWorld('electron', {
  getLogPath: (isError: boolean) => ipcRenderer.invoke('get-log-path', isError),
  onBackendReady: (callback: (port: number) => void) => {
    ipcRenderer.on('backend-ready', (_event, port) => callback(port))
  },
  onBackendClosed: (callback: () => void) => {
    ipcRenderer.on('backend-closed', () => callback())
  },
  serverApi: {
    request: (port: number, method: string, path: string, data?: unknown) =>
      ipcRenderer.invoke('server-request', { port, method, path, data })
  },
  // 添加文件选择方法
  selectFilePath: () => ipcRenderer.invoke('select-file-path'),
  readSystemConfig: () => ipcRenderer.invoke('read-system-config'),
  saveSystemConfig: (content: string) => ipcRenderer.invoke('save-system-config', content)
})

// 暴露 electron API 到渲染进程
contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    invoke: (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args)
  }
})

// 更新类型声明
declare global {
  interface Window {
    electron: {
      getLogPath: (isError: boolean) => Promise<string>
      onBackendReady: (callback: (port: number) => void) => void
      onBackendClosed: (callback: () => void) => void
      serverApi: {
        request: <T>(
          port: number,
          method: 'GET' | 'POST' | 'PUT' | 'DELETE',
          path: string,
          data?: unknown
        ) => Promise<T>
      }
      selectFilePath: () => Promise<string | null>
      readSystemConfig: () => Promise<string>
      saveSystemConfig: (content: string) => Promise<boolean>
    }
    // ... 其他类型定义保持不变
  }
}

// 导出接口以供其他文件使用
export type { BackendRobot }
