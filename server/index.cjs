const fs = require('fs')
const path = require('path')
const http = require('http')
const crypto = require('crypto')
const { WebSocketServer } = require('ws')

const DATA_FILE = path.join(__dirname, 'data.json')

// Rate limiting
const clientLimits = new Map()
const RATE_LIMIT = 10 // messages per minute
const RATE_WINDOW = 60 * 1000 // 1 minute

function readData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8')
    return JSON.parse(raw)
  } catch {
    return { attendees: '' }
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

function isValidAttendee(attendee) {
  try {
    return (
      attendee &&
      typeof attendee === 'object' &&
      typeof attendee.employeeId === 'string' &&
      typeof attendee.name === 'string' &&
      typeof attendee.attending === 'boolean' &&
      attendee.employeeId.length > 0 &&
      attendee.name.length > 0 &&
      attendee.employeeId.length <= 100 && // increased limit
      attendee.name.length <= 200 && // increased limit
      (attendee.kana === undefined || attendee.kana === null || typeof attendee.kana === 'string') &&
      (attendee.group === undefined || attendee.group === null || typeof attendee.group === 'string') &&
      (attendee.nationality === undefined || attendee.nationality === null || typeof attendee.nationality === 'string') &&
      (attendee.checkedAt === undefined || attendee.checkedAt === null || typeof attendee.checkedAt === 'string')
    )
  } catch (err) {
    console.error('出席者検証エラー:', err, attendee)
    return false
  }
}

function isValidMessage(msg) {
  try {
    if (!msg || typeof msg !== 'object') {
      console.log('無効なメッセージ: オブジェクトではありません')
      return false
    }
    
    if (msg.type === 'load') {
      return true
    }
    
    if (msg.type === 'save') {
      if (typeof msg.data !== 'string') {
        console.log('無効な保存メッセージ: データが暗号化文字列ではありません')
        return false
      }
      
      return true
    }
    
    console.log('無効なメッセージ: 不明なタイプ', msg.type)
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

wss.on('connection', (ws, request) => {
  const clientId = getClientId(ws, request)
  console.log(`クライアント接続: ${clientId}`)
  
  // send initial payload
  try {
    const data = readData()
    ws.send(JSON.stringify({ type: 'attendees', data: data.attendees || [] }))
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
        // save to file
        writeData({ attendees: msg.data })
        console.log(`クライアントがデータを保存: ${clientId}, ${msg.data.length}名の出席者`)
        
        // broadcast to all clients
        const payload = JSON.stringify({ type: 'attendees', data: msg.data })
        let broadcastCount = 0
        wss.clients.forEach(client => {
          if (client.readyState === 1 /* OPEN */) {
            client.send(payload)
            broadcastCount++
          }
        })
        console.log(`${broadcastCount}個のクライアントにブロードキャスト`)
      }
      
      if (msg.type === 'load') {
        // send current data to requesting client
        const data = readData()
        ws.send(JSON.stringify({ type: 'attendees', data: data.attendees || '' }))
        console.log(`クライアントにデータを送信: ${clientId}`)
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
