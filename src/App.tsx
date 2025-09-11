import React from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import Admin from './pages/Admin'
import Public from './pages/Public'

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
          </div>
          <nav className="flex items-center gap-1 bg-white rounded-lg p-1 shadow-sm">
            <NavLink 
              to="/" 
              className={({isActive}) => 
                `px-4 py-2 rounded-md font-medium transition-colors ${
                  isActive 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-600 hover:text-gray-900'
                }`
              }
            >
              出席状況
            </NavLink>
            <NavLink 
              to="/admin" 
              className={({isActive}) => 
                `px-4 py-2 rounded-md font-medium transition-colors ${
                  isActive 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-600 hover:text-gray-900'
                }`
              }
            >
              管理画面
            </NavLink>
          </nav>
        </header> */}

        <main className="bg-white rounded-xl shadow-sm p-8">
          <Routes>
            <Route path="/" element={<Public />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
