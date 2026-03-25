import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Clock, Play, Pause, RotateCcw, FastForward, Upload, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = 'http://localhost:8000/api';

export default function TimeMachine() {
  const [timeIdx, setTimeIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const canvasRef = useRef(null);
  const navigate = useNavigate();

  // --- Refs for playback so setInterval never has stale values ---
  const timeIdxRef = useRef(0);
  const playingRef = useRef(false);
  const intervalRef = useRef(null);

  // Sync state → refs
  timeIdxRef.current = timeIdx;
  playingRef.current = playing;

  // Fetch data from backend (each call triggers update_vessels → new positions + snapshots)
  const fetchData = () => {
    setRefreshing(true);
    axios.get(`${API}/timemachine`).then(res => {
      setData(res.data);
      setRefreshing(false);
    }).catch(() => setRefreshing(false));
  };

  // Initial fetch + auto-poll every 5s to build position history
  useEffect(() => {
    fetchData();
    const poll = setInterval(fetchData, 5000);
    return () => clearInterval(poll);
  }, []);

  // === PLAYBACK ENGINE ===
  // Clear and restart interval whenever `playing` or `speed` changes
  useEffect(() => {
    // Always clear first
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!playing) return;

    // Interval in ms: 1x=800ms, 2x=400ms, 5x=160ms
    const ms = Math.round(800 / speed);

    intervalRef.current = setInterval(() => {
      setTimeIdx(prev => {
        if (prev >= 11) {
          // Reached end — stop playback
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          setPlaying(false);
          return 11;
        }
        return prev + 1;
      });
    }, ms);

    // Cleanup on unmount or dependency change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [playing, speed]);

  // === CANVAS RENDERING ===
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width = canvas.offsetWidth;
    const H = canvas.height = canvas.offsetHeight;

    ctx.fillStyle = '#0a192f';
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = 'rgba(0,229,255,0.04)';
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    const vessels = data.vessels || [];
    if (vessels.length === 0) {
      ctx.font = '12px "Share Tech Mono"';
      ctx.fillStyle = 'rgba(0,229,255,0.3)';
      ctx.textAlign = 'center';
      ctx.fillText('NO DETECTION HISTORY', W / 2, H / 2 - 10);
      ctx.font = '10px "Share Tech Mono"';
      ctx.fillStyle = 'rgba(0,229,255,0.15)';
      ctx.fillText('Upload SAR images to record vessel positions for replay', W / 2, H / 2 + 10);
      ctx.textAlign = 'left';
      return;
    }

    // Frame info
    ctx.font = '10px "Share Tech Mono"';
    ctx.fillStyle = 'rgba(0,229,255,0.3)';
    ctx.fillText(`FRAME ${timeIdx + 1}/12  •  SPEED: ${speed}x  •  ${vessels.length} VESSELS`, 15, 20);

    vessels.forEach((ship) => {
      const positions = ship.positions || [];
      if (positions.length === 0) return;
      const ci = Math.min(timeIdx, positions.length - 1);
      const pos = positions[ci];
      if (!pos) return;

      const isDark = ship.status === 'dark';
      const col = isDark ? '#ff2d55' : ship.status === 'suspicious' ? '#ffcc00' : '#00ff88';

      // Trail line (from frame 0 to current)
      if (ci > 0) {
        ctx.beginPath();
        ctx.moveTo(positions[0].x * W, positions[0].y * H);
        for (let t = 1; t <= ci; t++) {
          ctx.lineTo(positions[t].x * W, positions[t].y * H);
        }
        ctx.strokeStyle = col + '55';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Ghost dots along trail
      for (let t = Math.max(0, ci - 5); t < ci; t++) {
        const p = positions[t];
        const alpha = (t - ci + 6) / 6 * 0.5;
        ctx.beginPath();
        ctx.arc(p.x * W, p.y * H, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = col + Math.floor(alpha * 255).toString(16).padStart(2, '0');
        ctx.fill();
      }

      // Current position dot
      const px = pos.x * W, py = pos.y * H;
      ctx.beginPath();
      ctx.arc(px, py, isDark ? 6 : 5, 0, Math.PI * 2);
      ctx.fillStyle = col;
      ctx.fill();
      // Glow ring
      ctx.beginPath();
      ctx.arc(px, py, 10, 0, Math.PI * 2);
      ctx.strokeStyle = col + '44';
      ctx.lineWidth = 1;
      ctx.stroke();
      // Label
      ctx.font = '9px "Share Tech Mono"';
      ctx.fillStyle = col + 'cc';
      ctx.fillText(ship.id, px + 13, py - 6);
      if (ship.type) {
        ctx.font = '8px "Share Tech Mono"';
        ctx.fillStyle = '#ffffff44';
        ctx.fillText(ship.type, px + 13, py + 5);
      }
    });
  }, [timeIdx, data, speed]);

  // --- Helper functions ---
  const startPlay = () => {
    if (timeIdx >= 11) setTimeIdx(0);  // Reset if at end
    setPlaying(true);
  };
  const togglePlay = () => playing ? setPlaying(false) : startPlay();
  const resetPlay = () => { setPlaying(false); setTimeIdx(0); };
  const changeSpeed = (s) => {
    setSpeed(s);
    // If not playing, start playing from beginning at chosen speed
    if (!playing) {
      setTimeIdx(0);
      setTimeout(() => setPlaying(true), 50);
    }
    // If already playing, the useEffect dependency on [playing, speed] will auto-restart
  };

  const hasData = data && data.vessels && data.vessels.length > 0;
  const events = data?.events || [];
  const scanTimes = data?.scan_times || [];

  if (!data) return <div className="text-center py-20 text-gray-500 font-mono text-xs">Loading time machine data...</div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="animate-fadein h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-heading text-lg tracking-wider text-neon-cyan flex items-center gap-2"><Clock size={18} /> TIME MACHINE</h2>
          <p className="text-xs font-mono text-gray-500 mt-1">
            {hasData
              ? `${data.vessels.length} SAR-detected vessels • ${data.scan_count} snapshots • Auto-refreshes every 5s`
              : 'Awaiting SAR detection data — upload imagery to begin tracking'}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {!hasData && (
            <button onClick={() => navigate('/detect')}
              className="btn-glow text-[10px] font-heading tracking-wider px-4 py-2 rounded-lg border border-neon-cyan/30 text-neon-cyan bg-neon-cyan/5 flex items-center gap-2">
              <Upload size={12} /> UPLOAD SAR IMAGE
            </button>
          )}
        </div>
      </div>

      {hasData && (
        <>
          {/* Timeline slider */}
          <div className="glass-card p-4 relative">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-heading tracking-wider text-gray-500">◀ PAST</span>
              <span className="font-heading text-sm text-neon-cyan text-glow-cyan">
                FRAME {timeIdx + 1}/12 {playing && <span className="text-warning text-xs ml-2">▶ PLAYING {speed}x</span>}
              </span>
              <span className="text-[9px] font-heading tracking-wider text-gray-500">CURRENT ▶</span>
            </div>
            <input type="range" min="0" max="11" value={timeIdx}
              onChange={e => { setPlaying(false); setTimeIdx(+e.target.value); }}
              className="w-full h-2 appearance-none bg-neptune-800 rounded-full cursor-pointer accent-neon-cyan" />
            {/* Event markers on timeline */}
            {events.map((ev, i) => (
              <div key={i}
                className={`absolute w-2.5 h-2.5 rounded-full cursor-pointer ${
                  ev.severity === 'HIGH' ? 'bg-danger shadow-[0_0_6px_#ff2d55]' : ev.severity === 'MEDIUM' ? 'bg-warning shadow-[0_0_6px_#ffcc00]' : 'bg-neon-cyan shadow-[0_0_6px_#00e5ff]'
                }`}
                style={{ left: `calc(${(ev.time / 11) * 100}% - 5px)`, top: '42px' }}
                title={ev.label}
                onClick={() => { setPlaying(false); setTimeIdx(ev.time); }} />
            ))}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            {/* Play/Pause */}
            <button onClick={togglePlay}
              className={`btn-glow p-2.5 rounded-lg border ${playing ? 'border-warning/50 text-warning' : 'border-neon-cyan/50 text-neon-cyan'}`}>
              {playing ? <Pause size={16} /> : <Play size={16} />}
            </button>
            {/* Reset */}
            <button onClick={resetPlay}
              className="btn-glow p-2.5 rounded-lg border border-white/10 text-gray-400 hover:text-white">
              <RotateCcw size={16} />
            </button>
            {/* Speed buttons */}
            <div className="flex gap-1">
              {[1, 2, 5].map(s => (
                <button key={s} onClick={() => changeSpeed(s)}
                  className={`text-[10px] font-heading tracking-wider px-3 py-2 rounded-lg border transition-all flex items-center gap-1 ${
                    speed === s
                      ? 'border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan shadow-[0_0_8px_rgba(0,229,255,0.15)]'
                      : 'border-white/5 text-gray-500 hover:text-gray-300 hover:border-white/10'
                  }`}>
                  <FastForward size={10} /> {s}x
                </button>
              ))}
            </div>
            {/* Refresh */}
            <button onClick={fetchData}
              className="btn-glow text-[10px] font-heading tracking-wider px-4 py-2 rounded-lg border border-neon-cyan/30 text-neon-cyan flex items-center gap-1 ml-auto">
              <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} /> {refreshing ? 'FETCHING...' : 'REFRESH DATA'}
            </button>
          </div>
        </>
      )}

      {/* Main content */}
      <div className={`flex-1 grid grid-cols-1 ${hasData ? 'lg:grid-cols-4' : ''} gap-4`}>
        {/* Canvas */}
        <div className={`${hasData ? 'lg:col-span-3' : ''} glass-card overflow-hidden rounded-xl`}>
          <canvas ref={canvasRef} className="w-full h-full" style={{ minHeight: '300px' }} />
        </div>

        {/* Sidebar */}
        {hasData && (
          <div className="glass-card p-4 overflow-y-auto space-y-4">
            {/* Tracking info */}
            <div>
              <h3 className="font-heading text-[10px] tracking-wider text-gray-400 mb-2">TRACKING INFO</h3>
              <div className="space-y-1 font-mono text-[10px]">
                {[
                  ['Vessels', data.vessels?.length || 0, 'text-neon-cyan'],
                  ['Snapshots', data.scan_count || 0, 'text-neon-cyan'],
                  ['Frame', `${timeIdx + 1}/12`, 'text-neon-cyan'],
                  ['Speed', `${speed}x`, 'text-warning'],
                  ['Status', playing ? 'PLAYING' : 'PAUSED', playing ? 'text-neon-green' : 'text-gray-400'],
                ].map(([label, val, col]) => (
                  <div key={label} className="flex justify-between text-gray-500">
                    <span>{label}</span>
                    <span className={col}>{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Event log */}
            <div>
              <h3 className="font-heading text-[10px] tracking-wider text-gray-400 mb-2">EVENT LOG</h3>
              <div className="space-y-2">
                {events.filter(e => e.time <= timeIdx).map((e, i) => (
                  <div key={i} onClick={() => { setPlaying(false); setTimeIdx(e.time); }}
                    className={`p-2 rounded-lg border text-[10px] font-mono cursor-pointer ${
                      e.severity === 'HIGH' ? 'border-danger/20 bg-danger/5 text-danger'
                      : e.severity === 'MEDIUM' ? 'border-warning/20 bg-warning/5 text-warning'
                      : 'border-neon-cyan/20 bg-neon-cyan/5 text-neon-cyan'
                    }`}>
                    <span className="block text-[9px] text-gray-500">Frame {e.time + 1}</span>
                    {e.label}
                  </div>
                ))}
                {events.filter(e => e.time <= timeIdx).length === 0 && (
                  <p className="text-[10px] font-mono text-gray-600">No events at this frame.</p>
                )}
              </div>
            </div>

            {/* Vessel list */}
            <div>
              <h3 className="font-heading text-[10px] tracking-wider text-gray-400 mb-2">VESSELS</h3>
              <div className="space-y-1">
                {(data.vessels || []).map(v => (
                  <div key={v.id} className="flex items-center gap-2 text-[10px] font-mono">
                    <div className={`w-2 h-2 rounded-full ${v.status === 'dark' ? 'bg-danger' : v.status === 'suspicious' ? 'bg-warning' : 'bg-neon-green'}`}
                      style={{ boxShadow: `0 0 4px ${v.status === 'dark' ? '#ff2d55' : v.status === 'suspicious' ? '#ffcc00' : '#00ff88'}` }}></div>
                    <span className="text-gray-300">{v.id}</span>
                    <span className="text-gray-600 ml-auto">{v.type}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
