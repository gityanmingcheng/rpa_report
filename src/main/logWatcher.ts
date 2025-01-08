import { watch, FSWatcher, statSync, existsSync } from 'fs'
import { createReadStream } from 'fs'
import { createInterface } from 'readline'
import { BrowserWindow } from 'electron'

export class LogWatcher {
  private watchers: Map<string, FSWatcher> = new Map()
  private lastPositions: Map<string, number> = new Map()
  private mainWindow: BrowserWindow
  private watcherId: string

  constructor(mainWindow: BrowserWindow, watcherId: string) {
    this.mainWindow = mainWindow
    this.watcherId = watcherId
  }

  async start(logPath: string) {
    try {
      // 先停止当前观察者的监控
      this.stop()

      if (!existsSync(logPath)) {
        throw new Error(`日志文件不存在: ${logPath}`)
      }

      const stats = statSync(logPath)
      if (!stats.isFile()) {
        throw new Error('指定的路径不是文件')
      }

      // 首次加载整个文件
      const initialStream = createReadStream(logPath, { encoding: 'utf8' })
      const initialRl = createInterface({
        input: initialStream,
        crlfDelay: Infinity
      })

      for await (const line of initialRl) {
        if (line.trim()) {
          this.mainWindow.webContents.send('log-update', {
            watcherId: this.watcherId,
            line
          })
        }
      }

      this.lastPositions.set(logPath, stats.size)

      // 监听文件变化
      const watcher = watch(logPath, { encoding: 'utf8' }, async (eventType) => {
        if (eventType === 'change') {
          try {
            const lastPosition = this.lastPositions.get(logPath) || 0
            const stream = createReadStream(logPath, {
              start: lastPosition,
              encoding: 'utf8'
            })

            const rl = createInterface({
              input: stream,
              crlfDelay: Infinity
            })

            for await (const line of rl) {
              if (line.trim()) {
                this.mainWindow.webContents.send('log-update', {
                  watcherId: this.watcherId,
                  line
                })
              }
            }

            const newStats = statSync(logPath)
            this.lastPositions.set(logPath, newStats.size)
          } catch (error: unknown) {
            this.mainWindow.webContents.send('log-error', {
              watcherId: this.watcherId,
              error: `文件读取错误: ${(error as Error).message}`
            })
          }
        }
      })

      this.watchers.set(logPath, watcher)
    } catch (error: unknown) {
      this.mainWindow.webContents.send('log-error', {
        watcherId: this.watcherId,
        error: `启动监控失败: ${(error as Error).message}`
      })
    }
  }

  stop() {
    for (const watcher of this.watchers.values()) {
      watcher.close()
    }
    this.watchers.clear()
    this.lastPositions.clear()
  }
}
