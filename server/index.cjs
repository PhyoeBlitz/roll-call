/**
 * @license Roll Call
 * Roll Call - A secure, real-time attendance tracking system
 * Copyright (C) 2024 Phyoe
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */
require('dotenv').config();
const http = require('http');
const { WebSocketServer } = require('ws');
const db = require('./db');

const attendeesTable = process.env.ATTENDEES_TABLE;
const settingsTable = process.env.SETTINGS_TABLE;

// --- Encrypted Attendees ---
async function readEncryptedAttendees() {
  const [rows] = await db.query(`SELECT data FROM \`${attendeesTable}\` WHERE id=1`);
  return rows[0]?.data || '';
}
async function writeEncryptedAttendees(data) {
  await db.query(`UPDATE \`${attendeesTable}\` SET data=? WHERE id=1`, [data]);
}

// --- Settings ---
async function readSettings() {
  const [rows] = await db.query(`SELECT publicSettings FROM \`${settingsTable}\` WHERE id=1`);
  return rows[0]?.publicSettings ? JSON.parse(rows[0].publicSettings) : {};
}
async function writeSettings(publicSettings) {
  await db.query(`UPDATE \`${settingsTable}\` SET publicSettings=? WHERE id=1`, [JSON.stringify(publicSettings)]);
}

// --- WebSocket server setup ---
const server = http.createServer();
const wss = new WebSocketServer({ server, path: '/rollcall-ws' });

wss.on('connection', (ws, request) => {
  ws.on('message', async (message) => {
    try {
      const messageStr = message.toString();
      if (messageStr.length > 100000) {
        ws.close(1009, 'Message too large');
        return;
      }
      const msg = JSON.parse(messageStr);

      // --- Encrypted Attendees ---
      if (msg.type === 'load') {
        const data = await readEncryptedAttendees();
        ws.send(JSON.stringify({ type: 'attendees', data }));
        return;
      }
      if (msg.type === 'save') {
        await writeEncryptedAttendees(msg.data);
        const data = await readEncryptedAttendees();
        const payload = JSON.stringify({ type: 'attendees', data });
        wss.clients.forEach(client => {
          if (client.readyState === 1) client.send(payload);
        });
        return;
      }

      // --- Settings ---
      if (msg.type === 'loadSettings') {
        const settings = await readSettings();
        ws.send(JSON.stringify({ type: 'publicSettings', data: settings }));
        return;
      }
      if (msg.type === 'saveSettings') {
        await writeSettings(msg.data);
        const settings = await readSettings();
        const payload = JSON.stringify({ type: 'publicSettings', data: settings });
        wss.clients.forEach(client => {
          if (client.readyState === 1) client.send(payload);
        });
        return;
      }

    } catch (err) {
      console.error('WebSocket message error:', err);
      ws.close(1011, 'Server error');
    }
  });
});

const port = process.env.PORT || 4000;
server.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Roll-call WebSocket server listening on port ${port}`);
});