import { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://localhost:8000/api';

export default function StatusBar() {
  const [stats, setStats] = useState({ total: 0, dark: 0, vessel_count: 0, uptime: '00:00:00' });
  const [lastScan, setLastScan] = useState('--:--:--');

  useEffect(() => {
    const fetchStats = () => {
      axios.get(`${API}/dashboard_stats`)
        .then(res => {
          setStats(res.data);
          setLastScan(new Date().toUTCString().slice(17, 25));
        })
        .catch(() => {});
    };
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-8 glass-panel border-t border-[rgba(0,229,255,0.1)] flex items-center justify-between px-6 shrink-0 z-50">
      <div className="flex items-center gap-6">
        <span className="font-mono text-[10px] text-gray-400">
          TRACKED: <span className="text-neon-cyan font-bold">{stats.vessel_count || stats.total}</span>
        </span>
        <span className="font-mono text-[10px] text-gray-400">
          DARK VESSELS: <span className="text-danger font-bold animate-blink">{stats.dark}</span>
        </span>
        <span className="font-mono text-[10px] text-gray-400">
          SCANS: <span className="text-neon-green">{stats.scan_count || 0}</span>
        </span>
      </div>
      <div className="flex items-center gap-6">
        <span className="font-mono text-[10px] text-gray-400">
          UPTIME: <span className="text-neon-green">{stats.uptime || '00:00:00'}</span>
        </span>
        <span className="font-mono text-[10px] text-gray-400">
          LAST POLL: <span className="text-neon-cyan">{lastScan} UTC</span>
        </span>
      </div>
    </div>
  );
}
