const express = require('express')
const fs = require('fs')
const path = require('path')
const bodyParser = require('body-parser')
const cors = require('cors')

const app = express()
app.use(cors())
app.use(bodyParser.json())

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

app.get('/api/attendees', (req, res) => {
  const data = readData()
  res.json(data.attendees)
})

app.post('/api/attendees', (req, res) => {
  const items = req.body || []
  writeData({ attendees: items })
  res.json({ ok: true })
})

const port = process.env.PORT || 4000
app.listen(port, () => console.log(`roll-call server listening on ${port}`))
