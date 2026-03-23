import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, AlertTriangle, ShieldAlert, Activity } from 'lucide-react';
import axios from 'axios';

export default function Dashboard() {
  const [statsData, setStatsData] = useState({ total: 0, dark: 0, high_threat: 0, system_load: '42%' });

  useEffect(() => {
    axios.get('http://localhost:8000/api/dashboard_stats')
      .then(res => setStatsData(res.data))
      .catch(err => console.error(err));
  }, []);

  const stats = [
    { id: 1, name: 'Total Ships Detected', value: statsData.total, icon: Target, trend: '+0%', color: 'text-neon-blue', bg: 'bg-neon-blue/10' },
    { id: 2, name: 'Dark Vessels', value: statsData.dark, icon: ShieldAlert, trend: '0%', color: 'text-threat-high', bg: 'bg-threat-high/10' },
    { id: 3, name: 'High Threat Alerts', value: statsData.high_threat, icon: AlertTriangle, trend: '0%', color: 'text-threat-medium', bg: 'bg-threat-medium/10' },
    { id: 4, name: 'System Load', value: statsData.system_load, icon: Activity, trend: 'Stable', color: 'text-threat-low', bg: 'bg-threat-low/10' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4 }}
    >
      <h2 className="text-3xl font-bold mb-8">System Overview</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-6 border-t border-t-white/10 hover:-translate-y-1 transition-transform cursor-pointer"
          >
            <div className={`p-3 rounded-xl inline-block mb-4 ${stat.bg}`}>
              <stat.icon className={stat.color} size={24} />
            </div>
            <p className="text-gray-400 text-sm font-medium">{stat.name}</p>
            <div className="flex items-end justify-between mt-1">
              <h3 className="text-3xl font-bold">{stat.value}</h3>
              <span className={`text-sm font-medium ${stat.trend.startsWith('+') ? 'text-threat-low' : 'text-gray-400'}`}>
                {stat.trend}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl">
          <h3 className="text-lg font-semibold mb-4">Detection Activity (24H)</h3>
          <div className="h-64 flex items-center justify-center text-gray-500 border border-dashed border-white/10 rounded-xl relative overflow-hidden">
             {/* Simple visual placeholder for chart before recharts is fully configed */}
             <div className="absolute inset-0 bg-gradient-to-t from-neon-blue/10 to-transparent"></div>
             Chart loading...
          </div>
        </div>
        
        <div className="glass-panel p-6 rounded-2xl relative overflow-hidden">
          <div className="radar-sweep absolute top-1/2 left-1/2 w-96 h-96 border-r-2 border-neon-blue rounded-full bg-gradient-to-tr from-transparent to-neon-blue/20 -translate-x-1/2 -translate-y-1/2 opacity-30 mt-[-50%] ml-[-50%]"></div>
          <h3 className="text-lg font-semibold mb-4 relative z-10">Live Radar Feed</h3>
          <div className="h-64 flex items-center justify-center relative z-10">
            <div className="w-48 h-48 rounded-full border border-neon-blue/30 relative">
              <div className="absolute top-1/2 left-1/2 w-full h-[1px] bg-neon-blue/30 -translate-x-1/2 -translate-y-1/2"></div>
              <div className="absolute top-1/2 left-1/2 h-full w-[1px] bg-neon-blue/30 -translate-x-1/2 -translate-y-1/2"></div>
              {/* Animated blips */}
              <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-threat-high rounded-full shadow-[0_0_10px_#EF4444] animate-pulse"></div>
              <div className="absolute bottom-1/3 right-1/4 w-2 h-2 bg-neon-blue rounded-full shadow-[0_0_10px_#00d4ff]"></div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
