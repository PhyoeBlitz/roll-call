import CryptoJS from "crypto-js";

const SECRET_KEY = import.meta.env.VITE_SECRET_KEY;

function minifyAttendees(items: Attendee[]): any[] {
  return items.map(a => ({
    i: a.employeeId,
    n: a.name,
    k: a.kana,
    g: a.group,
    c: a.nationality,
    a: a.attending,
    t: a.checkedAt
  }));
}

function restoreAttendees(minified: any[]): Attendee[] {
  return minified.map(m => ({
    employeeId: m.i,
    name: m.n,
    kana: m.k,
    group: m.g,
    nationality: m.c,
    attending: m.a,
    checkedAt: m.t
  }));
}

function encryptData(data: any): string {
  return CryptoJS.AES.encrypt(JSON.stringify(data), SECRET_KEY).toString();
}

function decryptData(ciphertext: string): any {
  const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
  const decrypted = bytes.toString(CryptoJS.enc.Utf8);
  return JSON.parse(decrypted);
}

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

// Public page column visibility settings
export type PublicColumns = {
  employeeId?: boolean
  name?: boolean
  kana?: boolean
  group?: boolean
  nationality?: boolean
  attending?: boolean
}

export type PublicSettings = {
  showList: boolean
  publicColumns: PublicColumns
}

export const defaultSettings: PublicSettings = {
  showList: true,
  publicColumns: {
    employeeId: true,
    name: true,
    kana: true,
    group: true,
    nationality: true,
    attending: true,
  }
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
      console.log('WebSocket connected')
      resolve(wsConnection!)
    }

    wsConnection.onerror = (error) => {
      wsReady = false
      console.error('WebSocket connection error:', error)
      reject(new Error('WebSocket connection failed'))
    }

    wsConnection.onclose = (event) => {
      wsReady = false
      wsConnection = null
      if (event.code !== 1000) {
        console.warn(`WebSocket closed unexpectedly: ${event.code} ${event.reason}`)
      }
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
          if (msg.type === 'attendees' && typeof msg.data === 'string') {
            ws.removeEventListener('message', handleMessage)
            resolve(restoreAttendees(decryptData(msg.data)))
          }
        } catch { }
      }
      ws.addEventListener('message', handleMessage)
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'load' }))
        } else {
          ws.removeEventListener('message', handleMessage)
          resolve([])
        }
      }, 100)
      setTimeout(() => {
        ws.removeEventListener('message', handleMessage)
        resolve([])
      }, 5000)
    })
  } catch {
    return []
  }
}

export async function saveAttendees(items: Attendee[]) {

  // Send to server via WebSocket
  try {
    const ws = await getWebSocket()
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'save', data: encryptData(minifyAttendees(items)) }))
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
          if (msg && msg.type === 'attendees' && typeof msg.data === 'string') {
            onMessage(restoreAttendees(decryptData(msg.data)))
          }
        } catch { }
      }
      ws.onclose = () => {
        if (!closed) {
          // retry after a short delay
          retryTimer = window.setTimeout(connect, 3000)
        }
      }
      ws.onerror = () => {
        try { ws && ws.close() } catch { }
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
    try { ws && ws.close() } catch { }
  }
}
