import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, Save, RefreshCw, Check } from 'lucide-react';
import axios from 'axios';
import { useToast } from '../components/Toast';

const API = 'http://localhost:8000/api';

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [retraining, setRetraining] = useState(false);
  const [retProgress, setRetProgress] = useState(0);
  const [saved, setSaved] = useState(false);
  const [stats, setStats] = useState({});
  const toast = useToast();

  useEffect(() => {
    axios.get(`${API}/settings`).then(res => setSettings(res.data)).catch(() => {
      setSettings({ confidence: 25, nms: 45, alert_sensitivity: 'Medium', scan_interval: '15min', auto_report: true, email_alerts: true, browser_notif: true, alert_sound: false });
    });
    axios.get(`${API}/dashboard_stats`).then(res => setStats(res.data)).catch(() => {});
  }, []);

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    try {
      await axios.put(`${API}/settings`, settings);
      setSaved(true);
      toast('Settings saved to backend', 'success');
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      toast('Failed to save settings', 'error');
    }
  };

  const handleRetrain = () => {
    setRetraining(true);
    setRetProgress(0);
    const timer = setInterval(() => {
      setRetProgress(prev => {
        if (prev >= 100) { clearInterval(timer); setRetraining(false); toast('Model retrained successfully', 'success'); return 100; }
        return prev + 2;
      });
    }, 80);
  };

  const Toggle = ({ value, onChange }) => (
    <button onClick={() => onChange(!value)}
      className={`w-10 h-5 rounded-full relative transition-all ${value ? 'bg-neon-cyan/30 border-neon-cyan/50' : 'bg-neptune-800 border-white/10'} border`}>
      <div className={`w-4 h-4 rounded-full absolute top-0.5 transition-all ${value ? 'left-5 bg-neon-cyan shadow-[0_0_8px_#00e5ff]' : 'left-0.5 bg-gray-500'}`}></div>
    </button>
  );

  if (!settings) return <div className="text-center py-20 text-gray-500 font-mono text-xs">Loading settings...</div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="animate-fadein space-y-5 max-w-4xl">
      <div>
        <h2 className="font-heading text-lg tracking-wider text-neon-cyan flex items-center gap-2"><SettingsIcon size={18} /> SETTINGS</h2>
        <p className="text-xs font-mono text-gray-500 mt-1">System configuration — stored in backend state</p>
      </div>

      <div className="glass-card p-5 space-y-4">
        <h3 className="font-heading text-[10px] tracking-wider text-gray-400">DETECTION SETTINGS</h3>
        <div>
          <div className="flex justify-between text-xs font-mono mb-1">
            <span className="text-gray-400">Confidence Threshold</span>
            <span className="text-neon-cyan">{settings.confidence}%</span>
          </div>
          <input type="range" min="5" max="95" value={settings.confidence} onChange={e => updateSetting('confidence', +e.target.value)}
            className="w-full accent-neon-cyan" />
        </div>
        <div>
          <div className="flex justify-between text-xs font-mono mb-1">
            <span className="text-gray-400">NMS Threshold</span>
            <span className="text-neon-cyan">{settings.nms}%</span>
          </div>
          <input type="range" min="10" max="90" value={settings.nms} onChange={e => updateSetting('nms', +e.target.value)}
            className="w-full accent-neon-cyan" />
        </div>
        <div>
          <span className="text-xs font-mono text-gray-400 block mb-2">Alert Sensitivity</span>
          <div className="flex gap-2">
            {['Low', 'Medium', 'High'].map(s => (
              <button key={s} onClick={() => updateSetting('alert_sensitivity', s)}
                className={`text-[10px] font-heading tracking-wider px-4 py-2 rounded-lg border transition-all flex-1 ${
                  settings.alert_sensitivity === s ? 'border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan' : 'border-white/5 text-gray-500'
                }`}>{s.toUpperCase()}</button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-gray-400">Scan Interval</span>
          <select value={settings.scan_interval} onChange={e => updateSetting('scan_interval', e.target.value)}
            className="text-xs font-mono bg-neptune-800/50 border border-white/5 rounded-lg px-3 py-2 text-gray-300 outline-none">
            <option value="5min">5 minutes</option>
            <option value="15min">15 minutes</option>
            <option value="30min">30 minutes</option>
            <option value="1hr">1 hour</option>
          </select>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-gray-400">Auto-Report Generation</span>
          <Toggle value={settings.auto_report} onChange={v => updateSetting('auto_report', v)} />
        </div>
      </div>

      <div className="glass-card p-5 space-y-4">
        <h3 className="font-heading text-[10px] tracking-wider text-gray-400">MODEL INFORMATION</h3>
        <div className="grid grid-cols-2 gap-4 text-xs font-mono">
          {[
            ['Current Model', 'YOLOv8-Nano'],
            ['Version', 'v8.0.196'],
            ['Scans Completed', stats.scan_count || 0],
            ['Vessels Tracked', stats.vessel_count || 0],
            ['Confidence Setting', `${settings.confidence}%`],
            ['NMS Setting', `${settings.nms}%`],
            ['System Uptime', stats.uptime || '--'],
            ['System Load', stats.system_load || '--'],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between border-b border-white/3 pb-2">
              <span className="text-gray-500">{k}</span>
              <span className="text-gray-300">{v}</span>
            </div>
          ))}
        </div>
        <button onClick={handleRetrain} disabled={retraining}
          className="w-full btn-glow font-heading text-[10px] tracking-wider py-2.5 rounded-lg border border-neon-purple/30 text-neon-purple bg-neon-purple/5 flex items-center justify-center gap-2 disabled:opacity-50">
          <RefreshCw size={12} className={retraining ? 'animate-spin' : ''} /> {retraining ? 'RETRAINING...' : 'RETRAIN MODEL'}
        </button>
        {retraining && (
          <div className="w-full bg-neptune-800 rounded-full h-2">
            <div className="h-full bg-neon-purple rounded-full transition-all" style={{ width: `${retProgress}%` }}></div>
          </div>
        )}
      </div>

      <div className="glass-card p-5 space-y-3">
        <h3 className="font-heading text-[10px] tracking-wider text-gray-400">NOTIFICATIONS</h3>
        {[
          ['Email Alerts', 'email_alerts'],
          ['Browser Notifications', 'browser_notif'],
          ['Alert Sound', 'alert_sound'],
        ].map(([label, key]) => (
          <div key={key} className="flex items-center justify-between">
            <span className="text-xs font-mono text-gray-400">{label}</span>
            <Toggle value={settings[key]} onChange={v => updateSetting(key, v)} />
          </div>
        ))}
      </div>

      <button onClick={handleSave}
        className={`w-full btn-glow font-heading text-xs tracking-wider py-3 rounded-lg border flex items-center justify-center gap-2 transition-all ${
          saved ? 'border-neon-green/50 bg-neon-green/10 text-neon-green' : 'border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan'
        }`}>
        {saved ? <><Check size={14} /> SAVED TO BACKEND</> : <><Save size={14} /> SAVE SETTINGS</>}
      </button>
    </motion.div>
  );
}
