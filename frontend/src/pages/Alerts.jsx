import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Clock, MapPin, Target } from 'lucide-react';
import axios from 'axios';

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:8000/api/alerts')
      .then(res => setAlerts(res.data))
      .catch(err => console.error(err));
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex justify-between items-end mb-8 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <span className="relative flex h-6 w-6">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-threat-high opacity-75"></span>
              <span className="relative inline-flex rounded-full h-6 w-6 bg-threat-high items-center justify-center p-1"><AlertTriangle size={14} className="text-white"/></span>
            </span>
            Real-Time Alerts
          </h2>
          <p className="text-gray-400 mt-2">Active security notifications and threat intelligence triggers.</p>
        </div>
        <button className="text-sm font-semibold text-gray-400 hover:text-white bg-white/5 px-4 py-2 rounded-lg transition-colors">
          Clear All Events
        </button>
      </div>

      <div className="space-y-4">
        {alerts.map((alert, i) => (
          <motion.div 
            key={alert.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`glass-card p-5 border-l-4 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between hover:bg-white/5 transition-colors cursor-pointer ${
              alert.type === 'HIGH' ? 'border-l-threat-high' : 
              alert.type === 'MEDIUM' ? 'border-l-threat-medium' : 'border-l-threat-low'
            }`}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-black tracking-wider px-2 py-0.5 rounded-sm ${
                  alert.type === 'HIGH' ? 'bg-threat-high/20 text-threat-high' : 
                  alert.type === 'MEDIUM' ? 'bg-threat-medium/20 text-threat-medium' : 'bg-threat-low/20 text-threat-low'
                }`}>{alert.type} PRIORITY</span>
                <span className="text-xs text-gray-500 font-mono"><Target size={12} className="inline mr-1"/>{alert.track}</span>
              </div>
              <p className="text-lg font-semibold text-gray-200">{alert.message}</p>
            </div>
            
            <div className="flex md:flex-col gap-4 md:gap-1 text-sm text-gray-400 md:text-right w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t border-white/5 md:border-0">
               <span className="flex items-center gap-1.5"><Clock size={14} className="text-neon-blue"/> {alert.time}</span>
               <span className="flex items-center gap-1.5"><MapPin size={14} className="text-neon-blue"/> {alert.location}</span>
            </div>
          </motion.div>
        ))}
        {alerts.length === 0 && (
          <div className="text-center py-12 text-gray-500 glass-card">No active alerts at this time.</div>
        )}
      </div>
    </motion.div>
  )
}
