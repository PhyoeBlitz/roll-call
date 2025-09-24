# Roll Call

A secure, real-time attendance tracking system with end-to-end encryption.

## Features

- **Real-time WebSocket communication** for instant updates across all clients
- **End-to-end encryption** - server never sees decrypted attendee data
- **Admin panel** to add/toggle/remove attendees with Excel import/export
- **Public view** showing real-time attendance totals and lists
- **Responsive design** with Tailwind CSS and Japanese localization
- **Cloud-ready deployment** - server runs on Google Cloud Run, Render, or any Docker-compatible platform
- **Static frontend hosting** - works on Firebase Hosting, Vercel, Netlify, or any static host

## Architecture

- **Frontend**: Vite + React + TypeScript (deploy to Firebase Hosting, Vercel, etc.)
- **Backend**: Node.js WebSocket server (deploy to Google Cloud Run, Render, etc.)
- **Encryption**: AES encryption with crypto-js for end-to-end security
- **Storage**: Local JSON file (no database required)

## Quick Start (Development)

```bash
# Frontend
cd roll-call
npm install
npm run dev

# Backend (separate terminal)
cd server
npm install
npm start
```

## Excel File Upload Requirements

You can bulk import attendees by uploading an Excel file from the admin panel.

**Requirements:**
- The file must be in `.xlsx`, `.xls`, or `.csv` format.
- The first sheet will be used.
- The following columns are recognized (header names can be in Japanese or English):

| Japanese Header | English Header   | Description         | Example Value   |
|-----------------|-----------------|---------------------|-----------------|
| 社員番号*       | employeeId*     | Employee ID (required)         | 12345           |
| 氏名*          | name*           | Name (required)                | 山田 太郎        |
| 読み仮名        | kana            | Kana (phonetic)     | やまだ たろう    |
| 所属グループ    | group           | Department/Group    | 営業部           |
| 国籍           | nationality     | Nationality         | 日本             |
| 出欠           | attending       | Attendance status   | 出席, 欠席, ✅, ❌, true, false |

- **Columns marked with `*` are required.**
- Duplicate employee IDs will be skipped.
- If "出欠" is present, values like "出席", "✅", or "true" will be treated as attending.

**Example:**

| 社員番号* | 氏名*     | 読み仮名     | 所属グループ | 国籍 | 出欠 |
|----------|----------|--------------|--------------|------|------|
| 1001     | 山田 太郎 | やまだ たろう | 営業部       | 日本 | 出席 |
| 1002     | 佐藤 花子 | さとう はなこ | 開発部       | 日本 | 欠席 |

You can download or export a sample Excel file from the admin panel for reference.


## Deployment

**Note:**  
The provided Docker image and Dockerfile are **for the backend server only**.  
The frontend (React app) should be built and deployed separately to a static hosting service (such as Firebase Hosting, Vercel, or Netlify).


**Frontend** (Firebase Hosting example):
```bash
npm run build
firebase deploy
```

**Backend** (Google Cloud Run example):
```bash
cd server
docker build -t your-project/roll-call-server .
gcloud run deploy --image your-project/roll-call-server
```

[![GHCR](https://img.shields.io/badge/GHCR-Available-brightgreen?logo=github)](https://github.com/phyoeblitz/roll-call/pkgs/container/roll-call-server)

**Docker Pull:**
```sh
docker pull ghcr.io/phyoeblitz/roll-call/roll-call-server:latest
```

## License
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)