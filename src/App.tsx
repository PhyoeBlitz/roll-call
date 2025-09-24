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
import { Routes, Route} from 'react-router-dom'
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Analytics } from "@vercel/analytics/react"
import Admin from './pages/Admin'
import Public from './pages/Public'

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="max-w-6xl mx-auto p-6 flex-grow">
        <main className="bg-white rounded-xl shadow-sm p-8">
          <Routes>
            <Route path="/" element={<Public />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>
      </div>

      {/* Footer with source code link */}
      <footer className="bg-gray-100 border-t py-4 mt-auto">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-gray-600">
          <a
            href="https://github.com/PhyoeBlitz/roll-call"
            className="text-blue-600 hover:text-blue-800 underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Source Code (AGPL-3.0)
          </a>
        </div>
      </footer>

      <Analytics />
      <SpeedInsights />
    </div>
  )
}