import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, ChevronDown, ChevronUp, Calculator, SortDesc, RefreshCw } from 'lucide-react';
import axios from 'axios';

const API = 'http://localhost:8000/api';

export default function RiskScoring() {
  const [vessels, setVessels] = useState([]);
  const [counts, setCounts] = useState({ dangerous: 0, suspicious: 0, safe: 0 });
  const [expanded, setExpanded] = useState(null);
  const [filter, setFilter] = useState('all');
  const [sortDesc, setSortDesc] = useState(true);
  const [calcValues, setCalcValues] = useState({ ais: 0, speed: 0, zone: 0, night: 0, origin: 0 });

  const fetchData = () => {
    axios.get(`${API}/risk/vessels`).then(res => {
      setVessels(res.data.vessels || []);
      setCounts(res.data.counts || { dangerous: 0, suspicious: 0, safe: 0 });
    }).catch(() => {});
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, []);

  const sorted = [...vessels]
    .filter(v => filter === 'all' || v.level === filter)
    .sort((a, b) => sortDesc ? b.risk - a.risk : a.risk - b.risk);

  const riskColor = (r) => r > 70 ? '#ff2d55' : r > 30 ? '#ffcc00' : '#00ff88';
  const calcTotal = Object.values(calcValues).reduce((s, v) => s + v, 0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="animate-fadein space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-heading text-lg tracking-wider text-neon-cyan flex items-center gap-2"><Shield size={18} /> RISK SCORING ENGINE</h2>
          <p className="text-xs font-mono text-gray-500 mt-1">Live vessel risk intelligence • Auto-refreshes every 8s</p>
        </div>
        <button onClick={fetchData} className="btn-glow text-[10px] font-heading tracking-wider px-3 py-2 rounded-lg border border-neon-cyan/30 text-neon-cyan flex items-center gap-1">
          <RefreshCw size={12} /> REFRESH
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'DANGEROUS', count: counts.dangerous, color: 'text-danger', border: 'border-danger' },
          { label: 'SUSPICIOUS', count: counts.suspicious, color: 'text-warning', border: 'border-warning' },
          { label: 'SAFE', count: counts.safe, color: 'text-neon-green', border: 'border-neon-green' },
        ].map(c => (
          <div key={c.label} className={`glass-card p-4 border-t-2 ${c.border}/30 text-center`}>
            <p className={`text-2xl font-heading font-bold ${c.color}`}>{c.count}</p>
            <p className="text-[10px] font-heading tracking-wider text-gray-500 mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 items-center">
        {['all', 'DANGEROUS', 'SUSPICIOUS', 'SAFE'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-[10px] font-heading tracking-wider px-3 py-1.5 rounded-lg border transition-all ${
              filter === f ? 'border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan' : 'border-white/5 text-gray-500'
            }`}>{f === 'all' ? 'ALL' : f}</button>
        ))}
        <div className="flex-1"></div>
        <button onClick={() => setSortDesc(!sortDesc)} className="btn-glow text-[10px] font-heading tracking-wider px-3 py-1.5 rounded-lg border border-white/10 text-gray-400 flex items-center gap-1">
          <SortDesc size={12} /> SORT: {sortDesc ? 'HIGH→LOW' : 'LOW→HIGH'}
        </button>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="border-b border-white/5 text-[9px] font-heading tracking-wider text-gray-500">
              <th className="py-3 px-4 text-left">VESSEL ID</th>
              <th className="py-3 px-4 text-left">TYPE</th>
              <th className="py-3 px-4 text-center">AIS</th>
              <th className="py-3 px-4 text-left">ZONE</th>
              <th className="py-3 px-4 text-left w-40">RISK SCORE</th>
              <th className="py-3 px-4 text-center">LEVEL</th>
              <th className="py-3 px-4 text-center">ACTION</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(v => (
              <tr key={v.id} className="border-b border-white/3 hover:bg-white/3 transition-colors cursor-pointer" onClick={() => setExpanded(expanded === v.id ? null : v.id)}>
                <td className="py-3 px-4 text-neon-cyan">{v.id}</td>
                <td className="py-3 px-4 text-gray-300">{v.type}</td>
                <td className="py-3 px-4 text-center"><span className={`px-2 py-0.5 rounded text-[9px] ${v.ais ? 'bg-neon-green/20 text-neon-green border border-neon-green/30' : 'bg-danger/20 text-danger border border-danger/30'}`}>{v.ais ? 'ON' : 'OFF'}</span></td>
                <td className="py-3 px-4 text-gray-400">{v.zone}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-neptune-800 rounded-full h-2 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${v.risk}%`, background: riskColor(v.risk) }}></div>
                    </div>
                    <span className="text-gray-300 w-8 text-right">{v.risk}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-center">
                  <span className={`text-[8px] font-heading tracking-wider px-2 py-0.5 rounded ${v.level === 'DANGEROUS' ? 'bg-danger/20 text-danger border border-danger/30' : v.level === 'SUSPICIOUS' ? 'bg-warning/20 text-warning border border-warning/30' : 'bg-neon-green/20 text-neon-green border border-neon-green/30'}`}>{v.level}</span>
                </td>
                <td className="py-3 px-4 text-center">
                  <button className="text-gray-500 hover:text-neon-cyan">
                    {expanded === v.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </td>
              </tr>
            ))}
            {sorted.map(v => expanded === v.id && (
              <tr key={v.id + '-detail'}>
                <td colSpan="7" className="px-4 py-3 bg-neptune-800/30">
                  <p className="text-[9px] font-heading tracking-wider text-gray-500 mb-2">RISK BREAKDOWN</p>
                  <div className="grid grid-cols-5 gap-3">
                    {Object.entries(v.breakdown || {}).map(([k, val]) => (
                      <div key={k} className="text-center">
                        <div className="h-16 bg-neptune-900/50 rounded flex items-end justify-center pb-1 mb-1">
                          <div className="w-6 rounded-t transition-all duration-500" style={{ height: `${(val / 35) * 100}%`, background: val > 20 ? '#ff2d55' : val > 10 ? '#ffcc00' : '#00ff88' }}></div>
                        </div>
                        <p className="text-[9px] text-gray-500">{k.toUpperCase()}</p>
                        <p className="text-[10px] text-gray-300">+{val}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2"><span className="text-gray-500">Suspicion:</span> {v.suspicion}</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="glass-card p-4">
        <h3 className="font-heading text-[10px] tracking-wider text-gray-400 mb-3 flex items-center gap-2"><Calculator size={14} /> RISK CALCULATOR</h3>
        <div className="grid grid-cols-5 gap-4">
          {[['ais', 'AIS Off', 35], ['speed', 'Speed Anomaly', 25], ['zone', 'Restricted Zone', 20], ['night', 'Night Op', 15], ['origin', 'Unknown Origin', 5]].map(([key, label, max]) => (
            <div key={key}>
              <label className="text-[9px] font-mono text-gray-500 block mb-1">{label} (0–{max})</label>
              <input type="range" min="0" max={max} value={calcValues[key]} onChange={e => setCalcValues(prev => ({ ...prev, [key]: +e.target.value }))}
                className="w-full accent-neon-cyan" />
              <span className="text-xs font-mono text-gray-300 block text-center">{calcValues[key]}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 text-center">
          <span className="font-heading text-2xl font-bold" style={{ color: riskColor(calcTotal) }}>{calcTotal}/100</span>
          <span className={`ml-3 text-[9px] font-heading tracking-wider px-2 py-0.5 rounded ${calcTotal > 70 ? 'bg-danger/20 text-danger border border-danger/30' : calcTotal > 30 ? 'bg-warning/20 text-warning border border-warning/30' : 'bg-neon-green/20 text-neon-green border border-neon-green/30'}`}>
            {calcTotal > 70 ? 'DANGEROUS' : calcTotal > 30 ? 'SUSPICIOUS' : 'SAFE'}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
