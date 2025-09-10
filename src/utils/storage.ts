const KEY = 'rollcall.attendees'

export type Attendee = {
  employeeId: string; // 社員番号 (primary key)
  name: string; // 氏名
  kana?: string; // 読み仮名
  group?: string; // 所属グループ
  nationality?: string; // 国籍
  attending: boolean
  // notattending removed — use attending=false to indicate not attending
  checkedAt?: string // ISO timestamp when marked attending
}

// WebSocket-based data operations
let wsConnection: WebSocket | null = null
let wsReady = false

function getWebSocket(): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    if (wsConnection && wsReady) {
      resolve(wsConnection)
      return
    }

    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:4000/rollcall-ws'
    wsConnection = new WebSocket(wsUrl)
    
    wsConnection.onopen = () => {
      wsReady = true
      resolve(wsConnection!)
    }
    
    wsConnection.onerror = () => {
      wsReady = false
      reject(new Error('WebSocket connection failed'))
    }
    
    wsConnection.onclose = () => {
      wsReady = false
      wsConnection = null
    }
  })
}

export async function loadAttendees(): Promise<Attendee[]> {
  try {
    const ws = await getWebSocket()
    
    return new Promise((resolve) => {
      const handleMessage = (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === 'attendees' && Array.isArray(msg.data)) {
            ws.removeEventListener('message', handleMessage)
            resolve(msg.data as Attendee[])
          }
        } catch {}
      }
      
      ws.addEventListener('message', handleMessage)
      
      // Wait a bit more to ensure connection is fully ready
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'load' }))
        } else {
          // Connection not ready, use fallback
          ws.removeEventListener('message', handleMessage)
          try {
            const raw = localStorage.getItem(KEY)
            resolve(raw ? JSON.parse(raw) as Attendee[] : [])
          } catch {
            resolve([])
          }
        }
      }, 100)
      
      // Timeout fallback
      setTimeout(() => {
        ws.removeEventListener('message', handleMessage)
        // Fallback to localStorage
        try {
          const raw = localStorage.getItem(KEY)
          resolve(raw ? JSON.parse(raw) as Attendee[] : [])
        } catch {
          resolve([])
        }
      }, 5000)
    })
  } catch {
    // Fallback to localStorage
    try {
      const raw = localStorage.getItem(KEY)
      return raw ? JSON.parse(raw) as Attendee[] : []
    } catch {
      return []
    }
  }
}

export async function saveAttendees(items: Attendee[]) {
  // Always update localStorage first
  try {
    localStorage.setItem(KEY, JSON.stringify(items))
  } catch {}

  // Send to server via WebSocket
  try {
    const ws = await getWebSocket()
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'save', data: items }))
    }
  } catch {
    // ignore WebSocket errors - localStorage is the fallback
  }
}

// WebSocket subscription for real-time updates (optional)
export type Unsubscribe = () => void
export function subscribeAttendees(onMessage: (items: Attendee[]) => void): Unsubscribe {
  let ws: WebSocket | null = null
  let closed = false
  let retryTimer: number | null = null

  const connect = () => {
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:4000/rollcall-ws'
    try {
      ws = new WebSocket(wsUrl)
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data as string)
          if (msg && msg.type === 'attendees' && Array.isArray(msg.data)) {
            onMessage(msg.data as Attendee[])
          }
        } catch {}
      }
      ws.onclose = () => {
        if (!closed) {
          // retry after a short delay
          retryTimer = window.setTimeout(connect, 3000)
        }
      }
      ws.onerror = () => {
        try { ws && ws.close() } catch {}
      }
    } catch {
      // schedule retry if constructor throws
      if (!closed) retryTimer = window.setTimeout(connect, 3000)
    }
  }

  connect()

  return () => {
    closed = true
    if (retryTimer) {
      window.clearTimeout(retryTimer)
      retryTimer = null
    }
    try { ws && ws.close() } catch {}
  }
}
