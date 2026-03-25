import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import StatusBar from './components/StatusBar'
import { ToastProvider } from './components/Toast'

import CommandCenter from './pages/CommandCenter'
import LiveTrackingMap from './pages/LiveTrackingMap'
import Detection from './pages/Detection'
import Alerts from './pages/Alerts'
import Analytics from './pages/Analytics'
import Reports from './pages/Reports'
import AIAssistant from './pages/AIAssistant'
import TimeMachine from './pages/TimeMachine'
import RiskScoring from './pages/RiskScoring'
import UserManagement from './pages/UserManagement'
import SettingsPage from './pages/Settings'

function App() {
  return (
    <ToastProvider>
      <Router>
        <div className="flex h-screen overflow-hidden bg-neptune-900">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header />
            <main className="flex-1 relative overflow-y-auto overflow-x-hidden ocean-grid">
              <div className="p-6 max-w-[1600px] mx-auto h-full relative z-10 w-full">
                <AnimatePresence mode="wait">
                  <Routes>
                    <Route path="/" element={<Navigate to="/command" replace />} />
                    <Route path="/command" element={<CommandCenter />} />
                    <Route path="/tracking" element={<LiveTrackingMap />} />
                    <Route path="/detect" element={<Detection />} />
                    <Route path="/alerts" element={<Alerts />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/assistant" element={<AIAssistant />} />
                    <Route path="/timemachine" element={<TimeMachine />} />
                    <Route path="/risk" element={<RiskScoring />} />
                    <Route path="/users" element={<UserManagement />} />
                    <Route path="/settings" element={<SettingsPage />} />
                  </Routes>
                </AnimatePresence>
              </div>
            </main>
            <StatusBar />
          </div>
        </div>
      </Router>
    </ToastProvider>
  )
}

export default App
