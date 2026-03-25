import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Crosshair, Ship, AlertTriangle, Activity, Zap, Shield, Target, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = 'http://localhost:8000/api';

function AnimatedCounter({ target, duration = 2000 }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.ceil(target / (duration / 30));
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(start);
    }, 30);
    return () => clearInterval(timer);
  }, [target, duration]);
  return <span className="font-heading">{count}</span>;
}

export default function CommandCenter() {
  const [stats, setStats] = useState({ total: 0, dark: 0, high_threat: 0, accuracy: 94, vessel_count: 0, scan_count: 0 });
  const [activityLog, setActivityLog] = useState([]);
  const [vessels, setVessels] = useState([]);
  const canvasRef = useRef(null);
  const navigate = useNavigate();

  const fetchData = () => {
    axios.get(`${API}/dashboard_stats`).then(res => setStats(res.data)).catch(() => {});
    axios.get(`${API}/alerts`).then(res => setActivityLog(res.data.slice(0, 8))).catch(() => {});
    axios.get(`${API}/vessels`).then(res => setVessels(res.data.vessels || [])).catch(() => {});
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Mini map with live vessel data from detections only
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width = canvas.offsetWidth;
    const H = canvas.height = canvas.offsetHeight;

    let animId;
    const draw = () => {
      ctx.fillStyle = '#0a192f';
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(0,229,255,0.04)';
      for (let x = 0; x < W; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

      if (vessels.length === 0) {
        ctx.font = '11px "Share Tech Mono"';
        ctx.fillStyle = 'rgba(0,229,255,0.3)';
        ctx.textAlign = 'center';
        ctx.fillText('AWAITING SAR IMAGE UPLOAD', W / 2, H / 2 - 10);
        ctx.font = '10px "Share Tech Mono"';
        ctx.fillStyle = 'rgba(0,229,255,0.15)';
        ctx.fillText('Navigate to SAR Detection to begin scanning', W / 2, H / 2 + 10);
        ctx.textAlign = 'left';
      } else {
        vessels.forEach(s => {
          const px = s.x * W, py = s.y * H;
          const col = s.status === 'dark' ? '#ff2d55' : s.status === 'suspicious' ? '#ffcc00' : '#00ff88';
          ctx.beginPath();
          ctx.arc(px, py, s.status === 'dark' ? 5 : 4, 0, Math.PI * 2);
          ctx.fillStyle = col;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(px, py, 8, 0, Math.PI * 2);
          ctx.strokeStyle = col + '44';
          ctx.stroke();
          ctx.font = '9px "Share Tech Mono"';
          ctx.fillStyle = col + 'aa';
          ctx.fillText(s.id, px + 10, py - 5);
        });
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animId);
  }, [vessels]);

  const statCards = [
    { label: 'Ships Detected', value: stats.total, color: 'text-neon-cyan', icon: Ship },
    { label: 'Dark Vessels', value: stats.dark, color: 'text-danger', icon: AlertTriangle, blink: stats.dark > 0 },
    { label: 'Vessels Tracked', value: stats.vessel_count, color: 'text-warning', icon: Shield },
    { label: 'System Accuracy', value: stats.accuracy || 94, color: 'text-neon-green', icon: Activity, suffix: '%' },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="animate-fadein space-y-5">
      {stats.dark > 0 && (
        <div className="animate-blink bg-danger/10 border border-danger/30 rounded-lg px-4 py-2 flex items-center gap-3">
          <AlertTriangle size={18} className="text-danger" />
          <span className="font-heading text-xs tracking-wider text-danger">⚠ DARK VESSEL DETECTED — {stats.dark} UNIDENTIFIED TARGET(S) IN SURVEILLANCE ZONE</span>
        </div>
      )}

      {stats.scan_count === 0 && (
        <div className="glass-card p-6 border border-neon-cyan/10 text-center">
          <Upload size={32} className="text-neon-cyan mx-auto mb-3 opacity-50" />
          <p className="font-heading text-sm tracking-wider text-neon-cyan/80 mb-2">NO SAR IMAGERY SCANNED YET</p>
          <p className="text-xs font-mono text-gray-500 mb-4">Upload a SAR image in the Detection module to populate real-time intelligence data.</p>
          <button onClick={() => navigate('/detect')}
            className="btn-glow font-heading text-[10px] tracking-wider px-6 py-2 rounded-lg border border-neon-cyan/30 text-neon-cyan bg-neon-cyan/5">
            GO TO SAR DETECTION →
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className={`glass-card p-5 border-t-2 ${s.color === 'text-neon-cyan' ? 'border-t-neon-cyan' : s.color === 'text-danger' ? 'border-t-danger' : s.color === 'text-warning' ? 'border-t-warning' : 'border-t-neon-green'}`}>
            <div className="flex items-center justify-between mb-3">
              <s.icon size={20} className={s.color} />
              <span className="text-[9px] font-mono text-gray-500 tracking-wider">{stats.scan_count > 0 ? 'LIVE' : 'AWAITING'}</span>
            </div>
            <p className="text-[11px] font-mono text-gray-400 mb-1">{s.label}</p>
            <div className={`text-3xl font-heading font-bold ${s.color} ${s.blink ? 'animate-blink' : ''}`}>
              <AnimatedCounter target={s.value} />{s.suffix || ''}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 glass-card p-4 relative overflow-hidden">
          <h3 className="font-heading text-xs tracking-wider text-neon-cyan mb-3 flex items-center gap-2">
            <Target size={14} /> LIVE SURVEILLANCE MAP {vessels.length > 0 ? `— ${vessels.length} DETECTED` : '— AWAITING SCAN'}
          </h3>
          <canvas ref={canvasRef} className="w-full h-56 rounded-lg bg-neptune-900" />
        </div>

        <div className="glass-card p-4 relative overflow-hidden flex flex-col items-center">
          <h3 className="font-heading text-xs tracking-wider text-neon-cyan mb-4 self-start flex items-center gap-2">
            <Zap size={14} /> RADAR FEED
          </h3>
          <div className="relative w-40 h-40">
            <div className="absolute inset-0 rounded-full border border-neon-cyan/20"></div>
            <div className="absolute inset-4 rounded-full border border-neon-cyan/15"></div>
            <div className="absolute inset-8 rounded-full border border-neon-cyan/10"></div>
            <div className="absolute top-1/2 left-0 right-0 h-px bg-neon-cyan/15"></div>
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-neon-cyan/15"></div>
            <div className="absolute inset-0 animate-radar rounded-full"
              style={{ background: 'conic-gradient(from 0deg, transparent 0deg, rgba(0,229,255,0.15) 0deg, transparent 60deg)' }}>
            </div>
            {vessels.map((v, i) => (
              <div key={i} className={`absolute w-2 h-2 rounded-full animate-pulse`}
                style={{
                  top: `${v.y * 80 + 10}%`, left: `${v.x * 80 + 10}%`,
                  background: v.status === 'dark' ? '#ff2d55' : v.status === 'suspicious' ? '#ffcc00' : '#00ff88',
                  boxShadow: `0 0 8px ${v.status === 'dark' ? '#ff2d55' : v.status === 'suspicious' ? '#ffcc00' : '#00ff88'}`
                }}></div>
            ))}
          </div>
          <p className="font-mono text-[10px] text-gray-500 mt-4">
            {vessels.length > 0 ? `${vessels.length} TARGETS ACQUIRED` : 'NO TARGETS — UPLOAD SAR IMAGE'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 glass-card p-4">
          <h3 className="font-heading text-xs tracking-wider text-neon-cyan mb-3 flex items-center gap-2">
            <Activity size={14} /> RECENT ACTIVITY
          </h3>
          <div className="space-y-2 max-h-44 overflow-y-auto">
            {activityLog.length === 0 && (
              <p className="text-xs text-gray-500 font-mono py-4 text-center">Upload a SAR image to generate real detection events.</p>
            )}
            {activityLog.map((a, i) => (
              <div key={i} className="flex items-center gap-3 text-xs font-mono px-3 py-2 rounded-lg bg-neptune-800/30 border border-[rgba(0,229,255,0.04)]">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${a.severity === 'HIGH' ? 'bg-danger' : a.severity === 'MEDIUM' ? 'bg-warning' : 'bg-neon-cyan'}`}></span>
                <span className="text-gray-500">{a.time || '--:--'}</span>
                <span className="text-gray-300 truncate flex-1">{a.message || a.alert_type || 'Detection event'}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          {[
            { label: "Detections", value: stats.total, color: 'text-neon-cyan' },
            { label: 'Scans Completed', value: stats.scan_count, color: 'text-neon-green' },
            { label: 'Active Zones', value: [...new Set(vessels.map(v => v.zone))].length, color: 'text-warning' },
          ].map((q, i) => (
            <div key={i} className="glass-card p-4 flex items-center justify-between">
              <span className="text-[11px] font-mono text-gray-400">{q.label}</span>
              <span className={`text-lg font-heading font-bold ${q.color}`}>{q.value}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
