interface Window {
  electronAPI: {
    onLogError(arg0: (error: string) => void): unknown
    startLogWatch: ({ logPath: stringe, watcherId: string }) => void
    stopLogWatch: () => void
    onLogUpdate: (callback: ({ watcherId: string, line: string }) => void) => void
    removeLogListener: () => void
  }
}
