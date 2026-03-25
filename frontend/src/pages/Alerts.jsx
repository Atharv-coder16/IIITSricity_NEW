import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Search, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import axios from 'axios';
import { useToast } from '../components/Toast';

const API = 'http://localhost:8000/api';

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [tab, setTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);
  const toast = useToast();

  const fetchAlerts = () => {
    axios.get(`${API}/alerts`).then(res => {
      const data = res.data.map(a => ({
        ...a,
        id: a.id || `ALT-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
        severity: a.severity || a.type || 'MEDIUM',
        vessel: a.vessel || 'UNKNOWN',
        alert_type: a.alert_type || a.message?.split('—')[0]?.trim() || 'Detection Alert',
        reason: a.reason || a.message || 'Automated detection event.',
        location: a.location || 'N/A',
        time: a.time || new Date().toUTCString().slice(17, 25),
      }));
      setAlerts(data);
    }).catch(() => {});
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 8000);
    return () => clearInterval(interval);
  }, []);

  const clearAll = () => {
    axios.delete(`${API}/alerts`).then(() => {
      setAlerts([]);
      toast('All alerts cleared', 'success');
    }).catch(() => toast('Failed to clear alerts', 'error'));
  };

  const clearSection = (sev) => {
    setAlerts(prev => prev.filter(a => a.severity !== sev));
    toast(`Cleared all ${sev} alerts from view`, 'success');
  };

  const dismiss = (id) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
    toast('Alert dismissed', 'info');
  };

  const filtered = alerts
    .filter(a => tab === 'ALL' || a.severity === tab)
    .filter(a => !search || a.vessel?.toLowerCase().includes(search.toLowerCase()) || a.alert_type?.toLowerCase().includes(search.toLowerCase()) || a.message?.toLowerCase().includes(search.toLowerCase()));

  const tabs = [
    { key: 'ALL', label: 'ALL', color: 'text-neon-cyan', border: 'border-neon-cyan', count: alerts.length },
    { key: 'HIGH', label: 'HIGH', color: 'text-danger', border: 'border-danger', count: alerts.filter(a => a.severity === 'HIGH').length },
    { key: 'MEDIUM', label: 'MEDIUM', color: 'text-warning', border: 'border-warning', count: alerts.filter(a => a.severity === 'MEDIUM').length },
    { key: 'LOW', label: 'LOW', color: 'text-neon-cyan', border: 'border-neon-cyan', count: alerts.filter(a => a.severity === 'LOW').length },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="animate-fadein space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-heading text-lg tracking-wider text-neon-cyan flex items-center gap-2">
            <span className="relative"><span className="animate-ping absolute h-4 w-4 rounded-full bg-danger/50"></span><AlertTriangle size={18} className="relative text-danger" /></span>
            REAL-TIME ALERTS
          </h2>
          <p className="text-xs font-mono text-gray-500 mt-1">Security notifications from live detection pipeline • Auto-refreshes every 8s</p>
        </div>
        <button onClick={clearAll} className="btn-glow text-[10px] font-heading tracking-wider px-4 py-2 rounded-lg border border-danger/30 text-danger bg-danger/5 flex items-center gap-2">
          <Trash2 size={12} /> CLEAR ALL
        </button>
      </div>

      <div className="flex gap-2 items-center">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`text-[10px] font-heading tracking-wider px-4 py-2 rounded-lg border transition-all flex items-center gap-2 ${
              tab === t.key ? `${t.border}/50 bg-white/5 ${t.color}` : 'border-white/5 text-gray-500 hover:text-gray-300'
            }`}>
            {t.label}
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${tab === t.key ? 'bg-white/10' : 'bg-white/5'}`}>{t.count}</span>
          </button>
        ))}
        <div className="flex-1"></div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vessel or type..."
            className="text-xs font-mono bg-neptune-800/50 border border-white/5 rounded-lg pl-8 pr-3 py-2 text-gray-300 placeholder-gray-600 focus:border-neon-cyan/30 outline-none w-56" />
        </div>
      </div>

      {tab !== 'ALL' && (
        <button onClick={() => clearSection(tab)} className="text-[10px] font-mono text-gray-500 hover:text-danger transition-colors flex items-center gap-1">
          <Trash2 size={10} /> Clear all {tab} alerts
        </button>
      )}

      <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto">
        <AnimatePresence>
          {filtered.map((a) => (
            <motion.div key={a.id} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 100 }} layout
              className={`glass-card p-4 border-l-4 ${a.severity === 'HIGH' ? 'border-l-danger' : a.severity === 'MEDIUM' ? 'border-l-warning' : 'border-l-neon-cyan'}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[9px] font-heading tracking-wider px-2 py-0.5 rounded ${a.severity === 'HIGH' ? 'bg-danger/20 text-danger border border-danger/30' : a.severity === 'MEDIUM' ? 'bg-warning/20 text-warning border border-warning/30' : 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30'}`}>{a.severity}</span>
                    <span className="font-mono text-[10px] text-gray-500">{a.id}</span>
                    <span className="font-mono text-[10px] text-gray-500">{a.time} UTC</span>
                  </div>
                  <p className="text-sm font-medium text-gray-200 mb-1">{a.alert_type}</p>
                  <p className="text-[11px] font-mono text-gray-400">Vessel: <span className="text-neon-cyan">{a.vessel}</span> • {a.location}</p>
                </div>
                <div className="flex gap-2 ml-4">
                  <button onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                    className="btn-glow text-[10px] font-heading tracking-wider px-3 py-1.5 rounded-lg border border-neon-cyan/30 text-neon-cyan bg-neon-cyan/5 flex items-center gap-1">
                    {expanded === a.id ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                    INVESTIGATE
                  </button>
                  <button onClick={() => dismiss(a.id)}
                    className="text-[10px] font-heading tracking-wider px-3 py-1.5 rounded-lg border border-white/10 text-gray-500 hover:text-white hover:border-white/20">
                    DISMISS
                  </button>
                </div>
              </div>
              {expanded === a.id && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  className="mt-3 pt-3 border-t border-white/5">
                  <p className="text-[10px] font-heading tracking-wider text-gray-500 mb-1">ALERT DETAILS</p>
                  <p className="text-xs text-gray-300">{a.reason}</p>
                </motion.div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-500 font-mono text-xs glass-card">No alerts. Run a SAR detection to generate real security events.</div>
        )}
      </div>
    </motion.div>
  );
}
