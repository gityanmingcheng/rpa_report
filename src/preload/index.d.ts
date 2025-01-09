import { ElectronAPI as BaseElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: unknown
  }
}

interface ElectronAPI extends BaseElectronAPI {
  getLogPath: (isError: boolean) => Promise<string>
  onLogError: (callback: (error: string) => void) => void
  onBackendStarted: (callback: (port: number) => void) => void
  onBackendClosed: (callback: () => void) => void
  fetchRobots: (port: number) => Promise<BackendRobot[]>
  readSystemConfig: () => Promise<string>
  saveSystemConfig: (content: string) => Promise<boolean>
  requestLogUpdate: (logPath: string, watcherId: string) => Promise<void>
}
