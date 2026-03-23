import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Detection from './pages/Detection'
import MapView from './pages/MapView'
import Analytics from './pages/Analytics'
import Alerts from './pages/Alerts'
import Reports from './pages/Reports'

function App() {
  return (
    <Router>
      <div className="flex h-screen overflow-hidden bg-ocean-900 text-white">
        <Sidebar />
        <main className="flex-1 relative overflow-y-auto overflow-x-hidden">
          {/* Header Gradients */}
          <div className="absolute top-0 left-0 w-full h-96 bg-neon-blue opacity-5 blur-[100px] pointer-events-none"></div>
          
          <div className="p-8 pb-20 max-w-7xl mx-auto h-full relative z-10 w-full">
            <AnimatePresence mode="wait">
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/detect" element={<Detection />} />
                <Route path="/map" element={<MapView />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/alerts" element={<Alerts />} />
                <Route path="/reports" element={<Reports />} />
              </Routes>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </Router>
  )
}

export default App
