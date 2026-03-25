import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Image as ImageIcon, Crosshair, AlertTriangle, Target, SlidersHorizontal } from 'lucide-react';
import axios from 'axios';

export default function Detection() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [confidence, setConfidence] = useState(0.15);

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      handleFile(droppedFile);
    }
  };

  const handleFile = (selectedFile) => {
    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result);
    reader.readAsDataURL(selectedFile);
    setResult(null);
  };

  const runDetection = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('confidence', confidence);

    try {
      const response = await axios.post('http://localhost:8000/api/detect', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000 // 2 minutes — SAR images can be large
      });
      console.log('Detection response:', response.data);
      setResult(response.data);
      if (response.data.alerts && response.data.alerts.length > 0) {
         setActiveAlerts(response.data.alerts);
         setTimeout(() => setActiveAlerts([]), 8000);
      }
    } catch (err) {
      console.error('Detection error:', err);
      const msg = err.response?.data?.detail || err.message || 'Unknown error';
      alert(`Detection failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex justify-between items-end mb-6 border-b border-[rgba(0,229,255,0.08)] pb-4">
        <div>
          <h2 className="font-heading text-lg tracking-wider text-neon-cyan flex items-center gap-2"><Crosshair size={18} /> SAR DETECTION</h2>
          <p className="text-xs font-mono text-gray-500 mt-1">Upload SAR imagery for automated vessel detection and threat analysis</p>
        </div>
        {preview && (
          <div className="flex gap-4 items-center">
            {/* Confidence Slider */}
            <div className="bg-white/5 border border-white/10 px-4 py-2.5 rounded-xl flex items-center gap-4">
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 font-bold tracking-widest uppercase mb-0.5">Min. Confidence <SlidersHorizontal size={10} className="inline ml-1" /></span>
                <span className="text-[9px] text-neon-blue/60 italic">SAR models: 10-30% recommended</span>
                <input 
                  type="range" 
                  min="0.05" max="0.70" step="0.05" 
                  value={confidence} 
                  onChange={(e) => setConfidence(parseFloat(e.target.value))}
                  className="w-32 accent-neon-cyan mt-1"
                  disabled={loading}
                />
              </div>
              <span className="text-xl font-black text-white ml-2 pt-1 w-12 text-right">{(confidence * 100).toFixed(0)}%</span>
            </div>

            <button 
              onClick={() => { setFile(null); setPreview(null); setResult(null); }}
              className="bg-white/5 border border-white/10 text-white font-semibold px-6 py-3 rounded-xl hover:bg-white/10 transition-colors"
            >
              Remove
            </button>
            <button 
              onClick={runDetection}
              disabled={loading}
              className="bg-neon-blue text-ocean-900 font-bold px-6 py-3 rounded-xl hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Crosshair size={20} />
              {loading ? 'Processing...' : 'Run Analysis'}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Upload Section */}
        <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Upload size={20} className="text-neon-blue" /> Source Target Image
          </h3>
          
          <div 
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className={`flex-1 min-h-[400px] border-2 border-dashed rounded-xl flex flex-col justify-center items-center transition-all ${
              preview ? 'border-neon-blue/30 bg-white/5 relative overflow-hidden' : 'border-white/10 hover:border-neon-blue hover:bg-white/5 cursor-pointer'
            }`}
          >
            {preview ? (
              <img src={preview} alt="SAR Preview" className="w-full h-full object-contain p-2" />
            ) : (
              <label className="cursor-pointer flex flex-col items-center p-12 text-center w-full h-full justify-center">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                  <ImageIcon size={32} className="text-gray-400" />
                </div>
                <p className="text-lg font-medium">Drag & Drop SAR Image</p>
                <p className="text-sm text-gray-400 mt-2">or click to browse local files (PNG, JPEG, TIF)</p>
                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFile(e.target.files[0])} />
              </label>
            )}
            
            {loading && (
              <div className="absolute inset-0 bg-neptune-900/80 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                <div className="w-16 h-16 border-4 border-neon-cyan/20 border-t-neon-cyan rounded-full animate-spin"></div>
                <p className="mt-4 font-heading text-xs tracking-wider text-neon-cyan animate-pulse">RUNNING YOLOV8 + BYTETRACK...</p>
              </div>
            )}
          </div>
        </div>

        {/* Results Section */}
        <div className="glass-panel p-6 rounded-2xl border border-white/5 relative overflow-hidden min-h-[400px] flex flex-col">
           <div className="absolute -top-32 -right-32 w-64 h-64 bg-neon-purple/20 blur-[100px] rounded-full pointer-events-none"></div>
           <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 relative z-10">
            <Crosshair size={20} className="text-neon-pink" /> Detection Results
          </h3>
          
          <div className="flex-1 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center relative overflow-hidden min-h-[350px]">
            {!result && !loading && (
               <p className="text-gray-500 text-sm p-6 text-center">Run analysis to view detection bounding boxes and threat intel.</p>
            )}
            
            {result && (
              <div className="w-full h-full relative flex items-center justify-center p-2">
                {result.rendered_image_b64 ? (
                  <img 
                    src={`data:image/jpeg;base64,${result.rendered_image_b64}`} 
                    className="max-w-full max-h-[500px] object-contain rounded-lg shadow-[0_0_20px_rgba(0,212,255,0.2)]" 
                    alt="SAR Detection Result" 
                  />
                ) : preview ? (
                  <div className="relative inline-block">
                    <img 
                      src={preview} 
                      className="max-w-full max-h-[500px] object-contain rounded-lg" 
                      alt="Original Upload"
                      id="result-img"
                    />
                    {/* Fallback CSS bounding boxes */}
                    {result.detections && result.detections.map((d, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 1.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1, type: "spring" }}
                        className={`absolute border-2 ${d.is_dark_vessel ? 'border-red-500 animate-pulse' : 'border-cyan-400'}`}
                        style={{
                          left: `${(d.bbox[0] / result.image_size.width) * 100}%`,
                          top: `${(d.bbox[1] / result.image_size.height) * 100}%`,
                          width: `${((d.bbox[2] - d.bbox[0]) / result.image_size.width) * 100}%`,
                          height: `${((d.bbox[3] - d.bbox[1]) / result.image_size.height) * 100}%`
                        }}
                      >
                        <div className="absolute -top-5 left-0 bg-black/80 px-1.5 py-0.5 text-[9px] font-mono whitespace-nowrap text-cyan-400 border border-cyan-400/30 rounded">
                          #{d.track_id} {(d.confidence*100).toFixed(0)}%
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No image to display</p>
                )}

                {/* Detection count badge */}
                {result.detections && result.detections.length > 0 && (
                  <div className="absolute top-3 left-3 bg-neon-blue/20 backdrop-blur-md text-neon-blue px-3 py-1.5 rounded-lg text-sm font-black border border-neon-blue/30 shadow-[0_0_15px_rgba(0,212,255,0.3)]">
                    {result.detections.length} Ship{result.detections.length > 1 ? 's' : ''} Detected
                  </div>
                )}
                {result.detections && result.detections.length === 0 && (
                  <div className="absolute top-3 left-3 bg-gray-500/20 backdrop-blur-md text-gray-400 px-3 py-1.5 rounded-lg text-sm font-semibold border border-gray-500/30">
                    No ships detected — try lowering confidence
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Quick Stats Grid */}
          {result && (
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="mt-6 flex flex-col h-full"
            >
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white/5 py-4 px-2 rounded-xl text-center shadow-[0_4px_10px_rgba(0,0,0,0.2)]">
                  <p className="text-xs text-gray-400 font-medium tracking-wide uppercase">Total detected</p>
                  <p className="text-3xl font-black text-white mt-1">{result.detections.length}</p>
                </div>
                <div className="bg-threat-high/10 border border-threat-high/20 py-4 px-2 rounded-xl text-center shadow-[0_4px_10px_rgba(0,0,0,0.2)]">
                  <p className="text-xs text-threat-high font-medium tracking-wide uppercase flex justify-center items-center gap-1"><AlertTriangle size={12}/> Dark Vessels</p>
                  <p className="text-3xl font-black text-threat-high mt-1">{result.detections.filter(d => d.is_dark_vessel).length}</p>
                </div>
                <div className="bg-neon-purple/10 border border-neon-purple/20 py-4 px-2 rounded-xl text-center shadow-[0_4px_10px_rgba(0,0,0,0.2)]">
                  <p className="text-xs text-neon-purple font-medium tracking-wide uppercase flex justify-center items-center gap-1">High Threat</p>
                  <p className="text-3xl font-black text-neon-pink mt-1">{result.detections.filter(d => d.threat_level === 'HIGH').length}</p>
                </div>
              </div>

              <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-3 border-b border-white/5 pb-2">Individual Signatures</h4>
              <div className="flex-1 overflow-y-auto pr-2 space-y-3 max-h-[250px] custom-scrollbar">
                {result.detections.map((d, i) => {
                   const confPercentage = (d.confidence * 100).toFixed(1);
                   const locLat = (18.9220 - ((d.bbox[1] / result.image_size.height) * 0.05)).toFixed(4);
                   const locLng = (72.8347 + ((d.bbox[0] / result.image_size.width) * 0.05)).toFixed(4);
                   return (
                     <div key={i} className="glass-panel p-4 rounded-xl flex items-center justify-between hover:bg-white/5 transition-colors border border-white/5">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                             <span className="font-black text-white text-base">ID:{d.track_id}</span>
                             <span className="text-xs font-mono bg-white/10 px-2 py-0.5 rounded text-gray-300">{d.ship_type}</span>
                             {d.is_dark_vessel && <span className="text-[10px] font-black tracking-wider px-2 py-0.5 rounded-sm bg-threat-high/20 text-threat-high border border-threat-high/30">DARK</span>}
                          </div>
                          <p className="text-[11px] text-neon-blue/80 font-mono mt-2 flex items-center gap-1">
                             <Target size={10} /> LOC: {locLat}°N, {locLng}°E
                          </p>
                        </div>
                        <div className="w-1/3 text-right">
                           <div className="flex justify-between items-end mb-1">
                             <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Confidence</span>
                             <span className="text-sm font-black text-white">{confPercentage}%</span>
                           </div>
                           <div className="w-full bg-black/40 rounded-full h-1.5 overflow-hidden border border-white/5">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${confPercentage}%` }}
                                transition={{ duration: 1, delay: i * 0.1 }}
                                className={`h-1.5 rounded-full ${d.confidence > 0.8 ? 'bg-neon-blue shadow-[0_0_8px_#00d4ff]' : d.confidence > 0.5 ? 'bg-threat-medium' : 'bg-threat-low'}`}
                              ></motion.div>
                           </div>
                        </div>
                     </div>
                   );
                })}
              </div>
            </motion.div>
          )}

        </div>
      </div>

      {/* Toast Overlay for Alerts */}
      <div className="fixed bottom-6 right-6 z-[999] flex flex-col gap-3">
        <AnimatePresence>
          {activeAlerts.map((a, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
              className={`glass-card p-4 rounded-xl border-l-4 ${
                a.level === 'HIGH' ? 'border-threat-high shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'border-threat-medium shadow-[0_0_15px_rgba(245,158,11,0.5)]'
              } flex items-center gap-3 w-80`}
            >
              <div className={`p-2 rounded-full ${a.level === 'HIGH' ? 'bg-threat-high/20 text-threat-high' : 'bg-threat-medium/20 text-threat-medium'}`}>
                 <AlertTriangle size={20} />
              </div>
              <div className="flex-1">
                <p className="font-bold text-white text-sm tracking-widest">{a.level} PRIORITY EVENT</p>
                <p className="text-xs text-gray-300 line-clamp-2 mt-1">{a.message}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

    </motion.div>
  )
}
