const fs = require('fs')
const path = require('path')
const http = require('http')
const { WebSocketServer } = require('ws')

const DATA_FILE = path.join(__dirname, 'data.json')

function readData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8')
    return JSON.parse(raw)
  } catch {
    return { attendees: [] }
  }
}

function writeData(obj) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(obj, null, 2), 'utf8')
}

// HTTP endpoints removed - using WebSocket only

// create HTTP server for WebSocket only
const server = http.createServer()
const wss = new WebSocketServer({ server, path: '/rollcall-ws' })

wss.on('connection', (ws) => {
  // send initial payload
  try {
    const data = readData()
    ws.send(JSON.stringify({ type: 'attendees', data: data.attendees || [] }))
  } catch {}

  // handle incoming messages
  ws.on('message', (message) => {
    try {
      const msg = JSON.parse(message.toString())
      
      if (msg.type === 'save' && Array.isArray(msg.data)) {
        // save to file
        writeData({ attendees: msg.data })
        
        // broadcast to all clients
        const payload = JSON.stringify({ type: 'attendees', data: msg.data })
        wss.clients.forEach(client => {
          if (client.readyState === 1 /* OPEN */) {
            client.send(payload)
          }
        })
      }
      
      if (msg.type === 'load') {
        // send current data to requesting client
        const data = readData()
        ws.send(JSON.stringify({ type: 'attendees', data: data.attendees || [] }))
      }
    } catch (err) {
      console.error('WebSocket message error:', err)
    }
  })
})

require('dotenv').config()

const port = process.env.PORT || 4000
server.listen(port, () => console.log(`roll-call server listening on ${port}`))
