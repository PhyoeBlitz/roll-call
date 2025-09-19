const fs = require('fs')
const path = require('path')
const http = require('http')
const crypto = require('crypto')
const { WebSocketServer } = require('ws')

const DATA_FILE = path.join(__dirname, 'data.json')

// Rate limiting
const clientLimits = new Map()
const RATE_LIMIT = 1000 // messages per minute
const RATE_WINDOW = 60 * 60000 // 60 minutes

function readData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8')
    return JSON.parse(raw)
  } catch {
    return { attendees: '', publicSettings: '' }
  }
}

function writeData(obj) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(obj, null, 2), 'utf8')
}

// Security helpers
function getClientId(ws, request) {
  return crypto.createHash('md5').update(
    (request.socket.remoteAddress || '') + 
    (request.headers['user-agent'] || '')
  ).digest('hex')
}

function checkRateLimit(clientId) {
  const now = Date.now()
  const clientData = clientLimits.get(clientId) || { count: 0, resetTime: now + RATE_WINDOW }
  
  if (now > clientData.resetTime) {
    clientData.count = 1
    clientData.resetTime = now + RATE_WINDOW
  } else {
    clientData.count++
  }
  
  clientLimits.set(clientId, clientData)
  return clientData.count <= RATE_LIMIT
}

function isValidMessage(msg) {
  try {
    if (!msg || typeof msg !== 'object') {
      console.log('無効なメッセージ: オブジェクトではありません')
      return false
    }
    if (msg.type === 'load' || msg.type === 'loadSettings') {
      return true
    }
    if (msg.type === 'save') {
      if (typeof msg.data !== 'string') {
        console.log('無効な保存メッセージ: データが暗号化文字列ではありません')
        return false
      }
      return true
    }
    if (msg.type === 'saveSettings') {
      if (typeof msg.data !== 'string') {
        console.log('無効な設定保存メッセージ: データが暗号化文字列ではありません')
        return false
      }
      return true
    }
    return false
  } catch (err) {
    console.error('メッセージ検証エラー:', err, msg)
    return false
  }
}

// HTTP endpoints removed - using WebSocket only

// create HTTP server for WebSocket only
const server = http.createServer()
const wss = new WebSocketServer({ server, path: '/rollcall-ws' })

// ---
wss.on('connection', (ws, request) => {
  const clientId = getClientId(ws, request)
  console.log(`クライアント接続: ${clientId}`)

  // send initial payloads
  try {
    const data = readData()
    ws.send(JSON.stringify({ type: 'attendees', data: data.attendees || [] }))
    ws.send(JSON.stringify({ type: 'publicSettings', data: data.publicSettings || '' }))
  } catch (err) {
    console.error('初期データ送信エラー:', err)
    ws.close(1011, 'サーバーエラー')
    return
  }

  // handle incoming messages
  ws.on('message', (message) => {
    try {
      // Rate limiting
      if (!checkRateLimit(clientId)) {
        console.warn(`クライアントのレート制限を超過しました: ${clientId}`)
        ws.close(1008, 'レート制限を超過しました')
        return
      }

      // Parse and validate message
      const messageStr = message.toString()
      if (messageStr.length > 100000) { // 100KB limit
        console.warn(`クライアントからのメッセージが大きすぎます: ${clientId}`)
        ws.close(1009, 'メッセージが大きすぎます')
        return
      }

      const msg = JSON.parse(messageStr)
      
      if (!isValidMessage(msg)) {
        console.warn(`クライアントからの無効なメッセージ: ${clientId}`)
        console.warn('メッセージ内容:', JSON.stringify(msg, null, 2))
        // Don't disconnect immediately - log and ignore invalid messages
        return
      }
      
      if (msg.type === 'save') {
        // save attendees
        const data = readData()
        data.attendees = msg.data
        writeData(data)
        const payload = JSON.stringify({ type: 'attendees', data: msg.data })
        wss.clients.forEach(client => {
          if (client.readyState === 1) client.send(payload)
        })
      }
      if (msg.type === 'load') {
        const data = readData()
        ws.send(JSON.stringify({ type: 'attendees', data: data.attendees || '' }))
      }
      if (msg.type === 'saveSettings') {
        // save and broadcast settings (encrypted)
        const data = readData()
        data.publicSettings = msg.data  // ← Store encrypted string directly
        writeData(data)
        const payload = JSON.stringify({ type: 'publicSettings', data: msg.data })
        wss.clients.forEach(client => {
          if (client.readyState === 1) client.send(payload)
        })
      }
      if (msg.type === 'loadSettings') {
        const data = readData()
        ws.send(JSON.stringify({ type: 'publicSettings', data: data.publicSettings || '' }))
      }
    } catch (err) {
      console.error(`WebSocket message error from ${clientId}:`, err.message)
      ws.close(1011, 'Server error')
    }
  })

  ws.on('close', (code, reason) => {
    console.log(`Client disconnected: ${clientId}, code: ${code}, reason: ${reason}`)
    clientLimits.delete(clientId)
  })

  ws.on('error', (err) => {
    console.error(`WebSocket error from ${clientId}:`, err.message)
  })
})

require('dotenv').config()

const port = process.env.PORT || 4000
server.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Roll-call WebSocket server listening on port ${port}`)
  console.log(`🔒 Security features enabled: rate limiting, message validation`)
})

// Cleanup rate limits periodically
setInterval(() => {
  const now = Date.now()
  for (const [clientId, data] of clientLimits.entries()) {
    if (now > data.resetTime + RATE_WINDOW) {
      clientLimits.delete(clientId)
    }
  }
}, RATE_WINDOW)
