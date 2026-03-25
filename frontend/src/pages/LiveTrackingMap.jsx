import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = 'http://localhost:8000/api';

export default function LiveTrackingMap() {
  const canvasRef = useRef(null);
  const [ships, setShips] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('all');
  const shipsRef = useRef([]);
  const navigate = useNavigate();

  const fetchVessels = () => {
    axios.get(`${API}/vessels`).then(res => {
      const v = res.data.vessels || [];
      setShips(v);
      shipsRef.current = v;
    }).catch(() => {});
  };

  useEffect(() => {
    fetchVessels();
    const interval = setInterval(fetchVessels, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;

    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      const W = canvas.width, H = canvas.height;
      ctx.fillStyle = '#0a192f';
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(0,229,255,0.04)';
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

      const current = shipsRef.current;

      if (current.length === 0) {
        ctx.font = '12px "Share Tech Mono"';
        ctx.fillStyle = 'rgba(0,229,255,0.3)';
        ctx.textAlign = 'center';
        ctx.fillText('NO VESSELS DETECTED', W / 2, H / 2 - 15);
        ctx.font = '10px "Share Tech Mono"';
        ctx.fillStyle = 'rgba(0,229,255,0.15)';
        ctx.fillText('Upload a SAR image in Detection module to begin tracking', W / 2, H / 2 + 10);
        ctx.textAlign = 'left';
      } else {
        ctx.font = '10px "Share Tech Mono"';
        ctx.fillStyle = 'rgba(0,229,255,0.12)';
        ctx.fillText('ZONE ALPHA', 20, 30);
        ctx.fillText('ZONE BETA', W / 2, 30);
        ctx.fillText('ZONE GAMMA', 20, H - 15);
        ctx.fillText('ZONE DELTA', W / 2, H - 15);

        const flt = filter === 'all' ? current : current.filter(s => s.status === filter);

        flt.forEach(s => {
          const px = s.x * W, py = s.y * H;
          const col = s.status === 'dark' ? '#ff2d55' : s.status === 'suspicious' ? '#ffcc00' : '#00ff88';

          ctx.beginPath();
          ctx.arc(px, py, s.status === 'dark' ? 6 : 4, 0, Math.PI * 2);
          ctx.fillStyle = col;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(px, py, 10, 0, Math.PI * 2);
          ctx.strokeStyle = col + '44';
          ctx.stroke();
          ctx.font = '9px "Share Tech Mono"';
          ctx.fillStyle = col + 'aa';
          ctx.fillText(s.id, px + 12, py - 6);
          ctx.font = '8px "Share Tech Mono"';
          ctx.fillStyle = '#ffffff44';
          ctx.fillText(`${(s.confidence * 100).toFixed(0)}%`, px + 12, py + 5);
        });
      }

      animId = requestAnimationFrame(draw);
    };
    draw();

    const handleClick = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) / canvas.width;
      const my = (e.clientY - rect.top) / canvas.height;
      const found = shipsRef.current.find(s => Math.abs(s.x - mx) < 0.03 && Math.abs(s.y - my) < 0.03);
      setSelected(found || null);
    };
    canvas.addEventListener('click', handleClick);

    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); canvas.removeEventListener('click', handleClick); };
  }, [filter]);

  const filters = ['all', 'safe', 'suspicious', 'dark'];
  const filteredCount = filter === 'all' ? ships.length : ships.filter(s => s.status === filter).length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col gap-4 animate-fadein">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-heading text-lg tracking-wider text-neon-cyan flex items-center gap-2"><MapPin size={18} /> LIVE TRACKING MAP</h2>
          <p className="text-xs font-mono text-gray-500 mt-1">
            {ships.length > 0 ? `Real-time tracking • ${ships.length} targets from SAR detections` : 'Awaiting SAR image upload — no vessels detected yet'}
          </p>
        </div>
        <div className="flex gap-2">
          {ships.length === 0 && (
            <button onClick={() => navigate('/detect')}
              className="btn-glow text-[10px] font-heading tracking-wider px-4 py-1.5 rounded-lg border border-neon-cyan/30 text-neon-cyan bg-neon-cyan/5 flex items-center gap-2">
              <Upload size={12} /> UPLOAD SAR IMAGE
            </button>
          )}
          {filters.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-[10px] font-heading tracking-wider px-3 py-1.5 rounded-lg border transition-all ${
                filter === f ? 'border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan' : 'border-white/5 text-gray-500 hover:text-gray-300'
              }`}>{f.toUpperCase()}</button>
          ))}
        </div>
      </div>

      <div className="flex-1 glass-card overflow-hidden relative rounded-xl">
        <canvas ref={canvasRef} className="w-full h-full cursor-crosshair" style={{ minHeight: '400px' }} />

        {ships.length > 0 && (
          <div className="absolute top-3 right-3 glass-panel rounded-lg p-3 space-y-2 z-10">
            <p className="font-heading text-[9px] tracking-wider text-gray-400 mb-1">LEGEND</p>
            {[['#00ff88', 'Safe'], ['#ffcc00', 'Suspicious'], ['#ff2d55', 'Dark Vessel']].map(([c, l]) => (
              <div key={l} className="flex items-center gap-2 text-[10px] font-mono">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: c, boxShadow: `0 0 6px ${c}` }}></div>
                <span className="text-gray-400">{l}</span>
              </div>
            ))}
          </div>
        )}

        <div className="absolute bottom-3 left-3 glass-panel rounded-lg px-3 py-1.5 z-10">
          <span className="font-mono text-[10px] text-gray-400">DETECTED: <span className="text-neon-cyan font-bold">{filteredCount}</span></span>
        </div>

        {selected && (
          <motion.div initial={{ x: 300 }} animate={{ x: 0 }} className="absolute top-0 right-0 h-full w-72 glass-panel border-l border-neon-cyan/10 p-4 z-20 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-heading text-sm text-neon-cyan">{selected.id}</h3>
              <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-white text-xs">✕</button>
            </div>
            <div className="space-y-3 font-mono text-xs">
              {[
                ['Type', selected.type],
                ['Speed', `${selected.speed} knots`],
                ['Heading', `${selected.heading}°`],
                ['AIS Status', selected.ais ? 'ON' : 'OFF'],
                ['Risk Score', `${selected.risk}/100`],
                ['Confidence', `${(selected.confidence * 100).toFixed(1)}%`],
                ['Zone', selected.zone],
                ['Level', selected.level],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-gray-500">{k}</span>
                  <span className={`${k === 'AIS Status' ? (v === 'ON' ? 'text-neon-green' : 'text-danger') : k === 'Level' ? (v === 'DANGEROUS' ? 'text-danger' : v === 'SUSPICIOUS' ? 'text-warning' : 'text-neon-green') : 'text-gray-300'}`}>{v}</span>
                </div>
              ))}
              {selected.status !== 'safe' && (
                <div className="bg-danger/10 border border-danger/20 rounded-lg p-2 mt-2">
                  <p className="text-[10px] text-danger font-heading tracking-wider mb-1">SUSPICION</p>
                  <p className="text-[11px] text-gray-300">{selected.suspicion}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
