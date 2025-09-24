import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import banner from 'vite-plugin-banner'

const licenseBanner = `
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
 **/
`

export default defineConfig({
  plugins: [
    react(),
    banner(licenseBanner)
  ],
  build: {
    manifest: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'libs': ['crypto-js', 'exceljs', 'xlsx', '@vercel/speed-insights'],
        }
      }
    },
    chunkSizeWarningLimit: 3000,
  }
})