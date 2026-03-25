import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, AlertTriangle, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = 'http://localhost:8000/api';

function MiniChart({ data, color, height = 60 }) {
  if (!data || data.length === 0) return <div className="text-center py-4 text-[10px] font-mono text-gray-600">No scan data — upload SAR imagery</div>;
  const max = Math.max(...data, 1);
  return (
    <svg viewBox={`0 0 ${data.length * 14} ${height}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`M0,${height} ${data.map((v, i) => `L${i * 14},${height - (v / max) * (height - 5)}`).join(' ')} L${(data.length - 1) * 14},${height} Z`}
        fill={`url(#grad-${color})`} />
      <polyline points={data.map((v, i) => `${i * 14},${height - (v / max) * (height - 5)}`).join(' ')}
        fill="none" stroke={color} strokeWidth="2" />
      {data.map((v, i) => (
        <circle key={i} cx={i * 14} cy={height - (v / max) * (height - 5)} r="2.5" fill={color} opacity="0.7" />
      ))}
    </svg>
  );
}

function BarChart({ data, color }) {
  if (!data || data.length === 0) return <div className="text-[10px] font-mono text-gray-600 py-4 text-center">No data — run SAR detection first</div>;
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="space-y-2">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-gray-400 w-20 text-right truncate">{d.label}</span>
          <div className="flex-1 bg-neptune-800/50 rounded-full h-4 overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${(d.value / max) * 100}%` }} transition={{ delay: i * 0.1, duration: 0.6 }}
              className="h-full rounded-full" style={{ background: color }} />
          </div>
          <span className="text-[10px] font-mono text-gray-300 w-8">{d.value}</span>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ data }) {
  if (!data || data.length === 0) return <div className="text-[10px] font-mono text-gray-600 py-4 text-center">No vessel types detected yet</div>;
  const colors = ['#00e5ff', '#7b2ff7', '#00ff88', '#ff2d55', '#ffcc00'];
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let acc = 0;
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 100 100" className="w-32 h-32">
        {data.map((d, i) => {
          const pct = d.value / total;
          const dash = pct * 251.2;
          const offset = acc * 251.2;
          acc += pct;
          return (
            <circle key={i} cx="50" cy="50" r="40" fill="none" stroke={colors[i % colors.length]} strokeWidth="12"
              strokeDasharray={`${dash} ${251.2 - dash}`} strokeDashoffset={-offset}
              className="transition-all duration-700" />
          );
        })}
        <text x="50" y="50" textAnchor="middle" dominantBaseline="central" className="font-heading text-xs fill-white">{total}</text>
      </svg>
      <div className="space-y-1">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-[10px] font-mono">
            <div className="w-2 h-2 rounded-full" style={{ background: colors[i % colors.length] }}></div>
            <span className="text-gray-400">{d.label}: <span className="text-gray-200">{d.value}</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeatmapGrid({ density }) {
  const zones = Object.entries(density || {});
  if (zones.length === 0) return <div className="text-[10px] font-mono text-gray-600 py-4 text-center">No zone data — scan SAR imagery first</div>;
  const max = Math.max(...zones.map(([, v]) => v), 1);
  return (
    <div className="grid grid-cols-2 gap-2">
      {zones.map(([z, count]) => {
        const intensity = count / max;
        return (
          <div key={z} className="rounded p-3 flex flex-col items-center justify-center"
            style={{ background: `rgba(${intensity > 0.7 ? 255 : 0}, ${intensity > 0.7 ? 45 : intensity > 0.4 ? 200 : 255}, ${intensity > 0.7 ? 85 : intensity > 0.4 ? 0 : 136}, ${0.1 + intensity * 0.25})` }}>
            <span className="text-[10px] font-heading tracking-wider text-gray-300">{z}</span>
            <span className="text-xs font-mono text-gray-400">{count} vessels</span>
          </div>
        );
      })}
    </div>
  );
}

export default function Analytics() {
  const [range, setRange] = useState('7D');
  const [data, setData] = useState(null);
  const navigate = useNavigate();

  const fetchData = () => {
    axios.get(`${API}/analytics/data?range=${range}`).then(res => setData(res.data)).catch(() => {});
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [range]);

  if (!data) return <div className="text-center py-20 text-gray-500 font-mono text-xs">Loading analytics...</div>;

  const isEmpty = data.vessel_count === 0 && data.scan_count === 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="animate-fadein space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-heading text-lg tracking-wider text-neon-cyan flex items-center gap-2"><BarChart3 size={18} /> ANALYTICS</h2>
          <p className="text-xs font-mono text-gray-500 mt-1">
            {isEmpty ? 'Awaiting SAR data — upload imagery to generate analytics' : `${data.vessel_count} detected vessels • ${data.scan_count} scans`}
          </p>
        </div>
        <div className="flex gap-2">
          {isEmpty && (
            <button onClick={() => navigate('/detect')}
              className="btn-glow text-[10px] font-heading tracking-wider px-4 py-1.5 rounded-lg border border-neon-cyan/30 text-neon-cyan bg-neon-cyan/5 flex items-center gap-2">
              <Upload size={12} /> UPLOAD SAR IMAGE
            </button>
          )}
          {['24H', '7D', '30D', '90D'].map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={`text-[10px] font-heading tracking-wider px-3 py-1.5 rounded-lg border transition-all ${
                range === r ? 'border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan' : 'border-white/5 text-gray-500'
              }`}>{r}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="glass-card p-4">
          <h3 className="font-heading text-[10px] tracking-wider text-gray-400 mb-3">DETECTIONS PER SCAN</h3>
          <MiniChart data={data.line} color="#00e5ff" height={80} />
        </div>
        <div className="glass-card p-4">
          <h3 className="font-heading text-[10px] tracking-wider text-gray-400 mb-3">DARK VESSELS BY REGION</h3>
          <BarChart data={data.dark_by_region} color="#ff2d55" />
        </div>
        <div className="glass-card p-4">
          <h3 className="font-heading text-[10px] tracking-wider text-gray-400 mb-3">SHIP TYPE DISTRIBUTION</h3>
          <DonutChart data={data.type_distribution} />
        </div>
        <div className="glass-card p-4">
          <h3 className="font-heading text-[10px] tracking-wider text-gray-400 mb-3">RISK SCORE BY VESSEL</h3>
          <MiniChart data={data.risk_trend} color="#ffcc00" height={80} />
        </div>
        <div className="glass-card p-4">
          <h3 className="font-heading text-[10px] tracking-wider text-gray-400 mb-3">VESSEL DENSITY BY ZONE</h3>
          <HeatmapGrid density={data.zone_density} />
        </div>
        <div className="glass-card p-4">
          <h3 className="font-heading text-[10px] tracking-wider text-gray-400 mb-3">TOP HIGH-DENSITY ZONES</h3>
          <BarChart data={data.top_risk_zones} color="#ffcc00" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(data.insights || []).map((text, i) => (
          <div key={i} className="glass-card p-3 flex items-center gap-3">
            {i === 0 ? <TrendingUp size={16} className="text-neon-cyan shrink-0" /> : i === 1 ? <BarChart3 size={16} className="text-warning shrink-0" /> : <AlertTriangle size={16} className="text-danger shrink-0" />}
            <span className="text-[11px] text-gray-300">{text}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
