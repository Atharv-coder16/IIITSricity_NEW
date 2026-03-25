import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, Mail, Clock, Filter } from 'lucide-react';
import axios from 'axios';
import { useToast } from '../components/Toast';

const API = 'http://localhost:8000/api';

export default function Reports() {
  const [reportType, setReportType] = useState('full');
  const [zones, setZones] = useState({ alpha: true, beta: true, gamma: false, delta: false });
  const [generated, setGenerated] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [timeRange, setTimeRange] = useState('24h');
  const [showFilters, setShowFilters] = useState(false);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({ total: 0, dark: 0, alerts: 0 });
  const toast = useToast();

  useEffect(() => {
    axios.get(`${API}/reports/history`).then(res => setHistory(res.data)).catch(() => {});
    axios.get(`${API}/dashboard_stats`).then(res => setStats(res.data)).catch(() => {});
  }, []);

  const toggleZone = (z) => setZones(prev => ({ ...prev, [z]: !prev[z] }));

  const generateReport = async () => {
    try {
      const selectedZones = Object.entries(zones).filter(([, v]) => v).map(([k]) => k.charAt(0).toUpperCase() + k.slice(1));
      const res = await axios.post(`${API}/reports/generate`, {
        type: reportType === 'full' ? 'Full Surveillance' : reportType === 'dark' ? 'Dark Vessel' : 'Zone Summary',
        zones: selectedZones.length > 0 ? selectedZones : ['All'],
        timeRange,
      });
      setGenerated(res.data);
      setHistory(prev => [res.data, ...prev].slice(0, 10));
      toast('Report generated from live data', 'success');
    } catch (e) {
      toast('Failed to generate report', 'error');
    }
  };

  const handleDownloadPDF = async (endpoint, filename) => {
    try {
      setDownloading(true);
      const res = await axios.get(`http://localhost:8000${endpoint}`, { responseType: 'arraybuffer' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast('PDF downloaded', 'success');
    } catch (e) {
      toast('Failed to download PDF', 'error');
    } finally {
      setDownloading(false);
    }
  };

  const cycleTimeRange = () => setTimeRange(t => t === '24h' ? '7d' : t === '7d' ? '30d' : '24h');

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="animate-fadein space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-heading text-lg tracking-wider text-neon-cyan flex items-center gap-2"><FileText size={18} /> REPORTS</h2>
          <p className="text-xs font-mono text-gray-500 mt-1">Generate intelligence reports from live surveillance data</p>
        </div>
        <div className="flex gap-2">
          <button onClick={cycleTimeRange}
            className="btn-glow text-[10px] font-heading tracking-wider px-4 py-2 rounded-lg border border-neon-cyan/30 text-neon-cyan bg-neon-cyan/5 flex items-center gap-2">
            <Clock size={12} /> {timeRange.toUpperCase()}
          </button>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`btn-glow text-[10px] font-heading tracking-wider px-4 py-2 rounded-lg border flex items-center gap-2 ${showFilters ? 'border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan' : 'border-white/10 text-gray-500'}`}>
            <Filter size={12} /> FILTERS
          </button>
        </div>
      </div>

      {showFilters && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="glass-card p-4">
          <p className="font-heading text-[10px] tracking-wider text-gray-400 mb-2">ACTIVE FILTERS</p>
          <div className="flex gap-4 text-xs font-mono text-gray-300">
            <span>Time Range: <span className="text-neon-cyan">{timeRange.toUpperCase()}</span></span>
            <span>Zones: <span className="text-neon-cyan">{Object.entries(zones).filter(([,v]) => v).map(([k]) => k).join(', ') || 'None'}</span></span>
            <span>Type: <span className="text-neon-cyan">{reportType === 'full' ? 'Full Surveillance' : reportType === 'dark' ? 'Dark Vessel' : 'Zone Summary'}</span></span>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="glass-card p-5 space-y-4">
          <h3 className="font-heading text-xs tracking-wider text-neon-cyan">REPORT GENERATOR</h3>
          <div>
            <label className="text-[10px] font-heading tracking-wider text-gray-500 block mb-1">REPORT TYPE</label>
            <div className="flex gap-2">
              {[['full', 'Full Surveillance'], ['dark', 'Dark Vessel'], ['zone', 'Zone Summary']].map(([k, l]) => (
                <button key={k} onClick={() => setReportType(k)}
                  className={`text-[10px] font-mono px-3 py-2 rounded-lg border transition-all flex-1 ${
                    reportType === k ? 'border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan' : 'border-white/5 text-gray-500'
                  }`}>{l}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] font-heading tracking-wider text-gray-500 block mb-1">SELECT ZONES</label>
            <div className="flex gap-3">
              {Object.keys(zones).map(z => (
                <label key={z} className="flex items-center gap-2 text-xs font-mono text-gray-300 cursor-pointer">
                  <input type="checkbox" checked={zones[z]} onChange={() => toggleZone(z)} className="w-3 h-3 accent-neon-cyan" />
                  {z.charAt(0).toUpperCase() + z.slice(1)}
                </label>
              ))}
            </div>
          </div>
          <button onClick={generateReport} className="w-full btn-glow font-heading text-xs tracking-wider py-3 rounded-lg border border-neon-cyan/50 text-neon-cyan bg-neon-cyan/10 hover:bg-neon-cyan/20 transition-all">
            GENERATE REPORT
          </button>
        </div>

        <div className="glass-card p-5">
          <h3 className="font-heading text-xs tracking-wider text-neon-cyan mb-3">REPORT PREVIEW</h3>
          {!generated ? (
            <div className="text-center py-12 text-gray-500 font-mono text-xs">Configure parameters and generate a report to preview live data.</div>
          ) : (
            <div className="space-y-3 text-xs">
              <div className="border-b border-neon-cyan/10 pb-3">
                <h4 className="font-heading text-sm text-neon-cyan text-glow-cyan">NEPTUNE-AI SURVEILLANCE REPORT</h4>
                <div className="flex gap-4 mt-1 font-mono text-[10px] text-gray-500">
                  <span>ID: {generated.id}</span>
                  <span>{generated.date}</span>
                  <span className="px-1.5 py-0 rounded text-[8px] bg-danger/20 text-danger border border-danger/30">CLASSIFIED</span>
                </div>
              </div>
              <table className="w-full font-mono text-[10px]">
                <tbody>
                  {[
                    ['Report Type', generated.type],
                    ['Zones', generated.zones],
                    ['Total Ships', generated.total_ships],
                    ['Dark Vessels', generated.dark_vessels],
                    ['Active Alerts', generated.alerts],
                  ].map(([k, v]) => (
                    <tr key={k} className="border-b border-white/5">
                      <td className="py-1.5 text-gray-400">{k}</td>
                      <td className="py-1.5 text-gray-200 text-right">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex gap-2 pt-2">
                <button onClick={() => handleDownloadPDF('/api/reports/daily', 'neptune_report.pdf')}
                  className="flex-1 btn-glow font-heading text-[10px] tracking-wider py-2 rounded-lg border border-neon-cyan/30 text-neon-cyan bg-neon-cyan/5 flex items-center justify-center gap-2">
                  <Download size={12} /> {downloading ? 'DOWNLOADING...' : 'EXPORT PDF'}
                </button>
                <button onClick={() => window.open('mailto:intel@neptune-ai.mil?subject=NEPTUNE-AI%20Report')}
                  className="flex-1 btn-glow font-heading text-[10px] tracking-wider py-2 rounded-lg border border-neon-purple/30 text-neon-purple bg-neon-purple/5 flex items-center justify-center gap-2">
                  <Mail size={12} /> EMAIL
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="glass-card p-4">
        <h3 className="font-heading text-xs tracking-wider text-gray-400 mb-3">REPORT HISTORY ({history.length})</h3>
        {history.length === 0 ? (
          <p className="text-xs text-gray-600 font-mono text-center py-4">No reports generated yet. Use the generator above.</p>
        ) : (
          <div className="space-y-2">
            {history.map((r, i) => (
              <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-neptune-800/30 border border-white/3 text-xs font-mono">
                <span className="text-neon-cyan">{r.id}</span>
                <span className="text-gray-500">{r.date}</span>
                <span className="text-gray-400">{r.type}</span>
                <span className="text-gray-500">{r.zones}</span>
                <button onClick={() => handleDownloadPDF('/api/reports/daily', `${r.id}.pdf`)} className="text-gray-500 hover:text-neon-cyan"><Download size={12} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
