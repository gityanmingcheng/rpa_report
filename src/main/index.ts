import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { LogWatcher } from './logWatcher'
import { ChildProcess, spawn } from 'child_process'
import { existsSync } from 'fs'
import { statSync } from 'fs'
import { execSync } from 'child_process'
import { apiService } from './api/apiService'
import { readFile, writeFile } from 'fs/promises'

// 在文件顶部声明 mainWindow
let mainWindow: BrowserWindow | null = null
let backendProcess: ChildProcess | null = null

function startBackendService(): void {
  try {
    const backendPath = getBackendExecutablePath()
    console.log('准备启动后端服务:', backendPath)

    // 检查文件权限
    try {
      const stats = statSync(backendPath)
      const isExecutable = (stats.mode & 0o111) !== 0
      console.log('文件权限:', stats.mode.toString(8))

      if (!isExecutable) {
        console.warn('文件可能没有执行权限，尝试添加执行权限')
        // 在 macOS/Linux 上添加执行权限
        if (process.platform !== 'win32') {
          execSync(`chmod +x "${backendPath}"`)
        }
      }
    } catch (error) {
      console.error('检查文件权限失败:', error)
    }

    // const configPath = join(
    //   app.getAppPath(),
    //   'resources',
    //   'backend',
    //   process.platform,
    //   'flask_config.json'
    // )

    // 启动后端进程
    backendProcess = spawn(backendPath, [], {
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
      // 添加 encoding 选项
      stdio: ['pipe', 'pipe', 'pipe']
    })

    // 设置输出流的编码
    if (backendProcess.stdout) {
      backendProcess.stdout.setEncoding('utf-8')
    }
    if (backendProcess.stderr) {
      backendProcess.stderr.setEncoding('utf-8')
    }

    // 监听后端进程输出，等待端口配置写入
    backendProcess.stdout?.on('data', (data) => {
      const output = data.toString()
      console.log('原始后端输出:', output)

      // 使用正则表达式匹配端口号
      const portMatch = output.match(/Flask port: (\d+)/)
      if (portMatch) {
        const port = parseInt(portMatch[1])
        console.log('检测到后端端口:', port)

        if (mainWindow) {
          console.log('准备发送端口到渲染进程:', port)
          mainWindow.webContents.send('backend-ready', port)
          console.log('已发送端口到渲染进程')
        } else {
          console.log('主窗口未就绪')
        }
      }
    })

    backendProcess.stderr?.on('data', (data) => {
      const error = data.toString()
      // 只过滤掉特定的开发服务器警告
      if (error.includes('WARNING: This is a development server')) {
        return
      }
      console.error('后端错误:', error)
    })

    backendProcess.on('close', (code) => {
      console.log('后端进程退出，代码:', code)
      backendProcess = null
      // 通知渲染进程后端已关闭
      if (mainWindow) {
        mainWindow.webContents.send('backend-closed')
      }
    })
  } catch (error) {
    console.error('启动后端服务失败:', error)
  }
}

function stopBackendService(): void {
  if (backendProcess) {
    console.log('正在关闭后端服务...')

    try {
      // Windows 环境下使用 taskkill 强制结束进程树
      if (process.platform === 'win32') {
        const pid = backendProcess.pid
        if (pid) {
          // 使用 /T 参数终止进程树，/F 强制终止
          require('child_process').execSync(`taskkill /pid ${pid} /T /F`)
        }
      } else {
        // 非 Windows 环境使用 kill
        backendProcess.kill('SIGTERM')

        // 给一个短暂的超时，如果进程还在运行，则强制终止
        setTimeout(() => {
          if (backendProcess) {
            backendProcess.kill('SIGKILL')
          }
        }, 1000)
      }
    } catch (error) {
      console.error('终止后端进程时出错:', error)
    } finally {
      backendProcess = null
    }
  }
}

// 添加一个清理函数，在应用退出时调用
function cleanup() {
  stopBackendService()
  // 确保等待一段时间后再退出应用
  setTimeout(() => {
    app.quit()
  }, 1000)
}

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    title: 'RPA',
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.setTitle('RPA')

  const normalLogWatcher = new LogWatcher(mainWindow, 'normal')
  const errorLogWatcher = new LogWatcher(mainWindow, 'error')
  mainWindow?.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow?.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  ipcMain.on('start-log-watch', (_event, { logPath, watcherId }) => {
    if (watcherId === 'normal') {
      normalLogWatcher.start(logPath)
    } else if (watcherId === 'error') {
      errorLogWatcher.start(logPath)
    }
  })

  ipcMain.on('stop-log-watch', (_event, watcherId) => {
    if (watcherId === 'normal') {
      normalLogWatcher.stop()
    } else if (watcherId === 'error') {
      errorLogWatcher.stop()
    }
  })

  // 启动后端服务
  startBackendService()

  // 监听窗口关闭事件
  mainWindow.on('closed', () => {
    stopBackendService()
    mainWindow = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  app.commandLine.appendSwitch('no-sandbox')
  app.commandLine.appendSwitch('ignore-certificate-errors')
  console.log(getBackendExecutablePath())
  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  cleanup()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  cleanup()
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getBackendExecutablePath(): string {
  const platform = process.platform // 'win32', 'darwin', 'linux'
  const isDev = process.env.NODE_ENV === 'development'

  const baseDir = isDev
    ? join(app.getAppPath(), 'resources', 'backend')
    : join(process.resourcesPath, 'backend')

  const executableName = platform === 'win32' ? 'app.exe' : 'app'
  const executablePath = join(baseDir, platform, executableName)

  console.log('后端可执行文件名:', executableName)
  console.log('后端可执行文件路径:', executablePath)
  console.log('当前环境:', process.env.NODE_ENV)
  console.log('app.getAppPath():', app.getAppPath())
  console.log('process.resourcesPath:', process.resourcesPath)

  if (!existsSync(executablePath)) {
    throw new Error(`后端可执行文件不存在: ${executablePath}`)
  }

  return executablePath
}

// 添加新的 IPC 处理器
ipcMain.handle('get-log-path', (_, isError: boolean) => {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const fileName = isError ? `${year}-${month}-${day}_error.log` : `${year}-${month}-${day}.log`

  const baseDir =
    process.env.NODE_ENV === 'development'
      ? join(app.getAppPath(), 'resources', 'backend')
      : join(process.resourcesPath, 'backend')

  const fullPath = join(baseDir, process.platform, 'logs', fileName)
  console.log('主进程: 生成的日志路径:', fullPath)

  return fullPath
})

// 添加新的 IPC 处理器
ipcMain.handle('fetch-robots', async (_, port: number) => {
  try {
    return await apiService.sendRequest({
      port,
      method: 'GET',
      path: '/'
    })
  } catch (error) {
    console.error('获取机器人数据失败:', error)
    throw error
  }
})

// 添加新的 IPC 处理器
ipcMain.handle('fetch-configs', async () => {
  try {
    // 这里替换为实际的获取配置列表的逻辑
    return [
      {
        name: '配置1',
        createTime: '2024-03-20 10:00:00',
        updateTime: '2024-03-20 15:30:00',
        status: 'active'
      }
      // ... 更多配置项
    ]
  } catch (error) {
    console.error('获取配置列表失败:', error)
    throw error
  }
})

// 添加新的 IPC 处理器
ipcMain.handle('select-file-path', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile']
  })
  return result.canceled ? null : result.filePaths[0]
})

// 添加 server-request 处理器
ipcMain.handle('server-request', async (_, params) => {
  try {
    const response = await apiService.sendRequest(params)
    return response
  } catch (error) {
    console.error('API 请求失败:', error)
    throw error
  }
})

// 获取系统配置文件路径
function getSystemConfigPath(): string {
  const isDev = process.env.NODE_ENV === 'development'
  const baseDir = isDev
    ? join(app.getAppPath(), 'resources', 'backend')
    : join(process.resourcesPath, 'backend')

  return join(baseDir, process.platform, 'system.ini')
}

// 添加读取系统配置的处理器
ipcMain.handle('read-system-config', async () => {
  try {
    const configPath = getSystemConfigPath()
    const content = await readFile(configPath, 'utf-8')
    return content
  } catch (error) {
    console.error('读取系统配置失败:', error)
    throw error
  }
})

// 添加保存系统配置的处理器
ipcMain.handle('save-system-config', async (_, content: string) => {
  try {
    const configPath = getSystemConfigPath()
    await writeFile(configPath, content, 'utf-8')
    return true
  } catch (error) {
    console.error('保存系统配置失败:', error)
    throw error
  }
})
