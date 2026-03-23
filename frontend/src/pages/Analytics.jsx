import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import axios from 'axios';

export default function Analytics() {
  const [data, setData] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:8000/api/metrics')
      .then(res => setData(res.data))
      .catch(err => console.error(err));
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <h2 className="text-3xl font-bold mb-8">Intelligence Analytics</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="glass-card p-6 border-t border-neon-blue/30 h-[400px] flex flex-col">
          <h3 className="text-lg font-semibold mb-4 text-gray-200">Detection Volume Over Time</h3>
          <div className="flex-1 text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorDetected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#00d4ff" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="time" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip contentStyle={{ backgroundColor: '#16213e', borderColor: '#ffffff20', color: 'white' }} />
                <Area type="monotone" dataKey="detected" stroke="#00d4ff" fillOpacity={1} fill="url(#colorDetected)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-6 border-t border-threat-high/30 h-[400px] flex flex-col">
          <h3 className="text-lg font-semibold mb-4 text-gray-200">Threat & Dark Vessel Distribution</h3>
          <div className="flex-1 text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                 <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                 <XAxis dataKey="time" stroke="#888" />
                 <YAxis stroke="#888" />
                 <Tooltip cursor={{fill: '#ffffff10'}} contentStyle={{ backgroundColor: '#16213e', borderColor: '#ffffff20', color: 'white' }} />
                 <Legend />
                 <Bar dataKey="dark" stackId="a" fill="#F59E0B" name="Dark Vessels" radius={[4, 4, 0, 0]} />
                 <Bar dataKey="high_threat" stackId="a" fill="#EF4444" name="High Threat" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
