/**
 * Editor store — console log entries
 */

export type LogLevel = 'info' | 'warn' | 'error'

export interface LogEntry {
  id: number
  level: LogLevel
  message: string
  timestamp: number
  nodeId?: string
  nodeName?: string
}

let _id = 1

function createConsoleStore() {
  let logs = $state<LogEntry[]>([])

  const addLog = (level: LogLevel, message: string, meta?: Pick<LogEntry, 'nodeId' | 'nodeName'>) => {
    logs = [
      ...logs,
      {
        id: _id++,
        level,
        message,
        timestamp: Date.now(),
        ...meta,
      },
    ]
    // Keep last 500 entries
    if (logs.length > 500) {
      logs = logs.slice(-500)
    }
  }

  return {
    get logs() { return logs },

    info(message: string, meta?: Pick<LogEntry, 'nodeId' | 'nodeName'>) {
      addLog('info', message, meta)
    },
    warn(message: string, meta?: Pick<LogEntry, 'nodeId' | 'nodeName'>) {
      addLog('warn', message, meta)
      console.warn(`[BeoEngine] ${message}`)
    },
    error(message: string, meta?: Pick<LogEntry, 'nodeId' | 'nodeName'>) {
      addLog('error', message, meta)
      console.error(`[BeoEngine] ${message}`)
    },
    clear() {
      logs = []
    },
  }
}

export const engineConsole = createConsoleStore()
