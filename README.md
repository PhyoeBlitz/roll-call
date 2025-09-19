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

## Deployment

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

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)