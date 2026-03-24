import { motion } from 'framer-motion';
import { Download, FileText, Calendar, Filter, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import { useState } from 'react';

export default function Reports() {
  const [downloading, setDownloading] = useState(false);

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
    } catch (e) {
      console.error(e);
      alert('Failed to generate PDF report.');
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadCSV = async (endpoint, filename) => {
    try {
      setDownloading(true);
      const res = await axios.get(`http://localhost:8000${endpoint}`);
      const dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent(res.data);
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href",     dataStr);
      downloadAnchorNode.setAttribute("download", filename);
      document.body.appendChild(downloadAnchorNode); 
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    } catch (e) {
      console.error(e);
      alert('Failed to generate report.');
    } finally {
      setDownloading(false);
    }
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4 border-b border-white/10 pb-6">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <span className="p-2 bg-gradient-to-br from-neon-purple to-neon-blue rounded-xl text-white">
              <FileText size={20} />
            </span>
            Downloadable Intelligence Reports
          </h2>
          <p className="text-gray-400 mt-2">Generate PDF and JSON summaries of vessel detections and tracking data.</p>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <button className="flex-1 md:flex-none glass-panel px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-white/5 transition-colors">
            <Calendar size={16} /> Last 24 Hours
          </button>
          <button className="flex-1 md:flex-none glass-panel px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-white/5 transition-colors">
            <Filter size={16} /> Filters
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Report Card */}
        <div className="glass-card p-6 border-t-2 border-t-neon-blue group hover:-translate-y-2 transition-transform cursor-pointer flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-neon-blue/20 p-3 rounded-full text-neon-blue">
               <FileText size={24} />
            </div>
            <span className="text-xs font-mono bg-white/10 px-2 py-1 rounded text-gray-300">PDF</span>
          </div>
          <h3 className="text-xl font-bold mb-2 group-hover:text-neon-blue transition-colors">Daily Executive Summary</h3>
          <p className="text-sm text-gray-400 flex-1 mb-6 mt-2 line-clamp-3">Comprehensive breakdown of all maritime activity, fleet formations, and high-threat vessels detected over the last 24 hours.</p>
          <button 
            onClick={() => handleDownloadPDF('/api/reports/daily', 'daily_executive_summary.pdf')}
            disabled={downloading}
            className="w-full py-3 rounded-xl bg-neon-blue text-ocean-900 font-bold flex items-center justify-center gap-2 hover:bg-white transition-colors disabled:opacity-50"
          >
             <Download size={18} /> {downloading ? 'Generating...' : 'Download Report'}
          </button>
        </div>

        {/* Report Card */}
        <div className="glass-card p-6 border-t-2 border-t-neon-purple group hover:-translate-y-2 transition-transform cursor-pointer flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-neon-purple/20 p-3 rounded-full text-neon-purple">
               <Target size={24} />
            </div>
            <span className="text-xs font-mono bg-white/10 px-2 py-1 rounded text-gray-300">CSV/JSON</span>
          </div>
          <h3 className="text-xl font-bold mb-2 group-hover:text-neon-purple transition-colors">Raw Detection Logs</h3>
          <p className="text-sm text-gray-400 flex-1 mb-6 mt-2">Export full bounding box coordinates, track IDs, confidence scores, and time-series location data for deep analysis.</p>
          <button 
            onClick={() => handleDownloadCSV('/api/reports/raw', 'raw_detection_logs.csv')}
            disabled={downloading}
            className="w-full py-3 rounded-xl bg-neon-purple text-white font-bold flex items-center justify-center gap-2 hover:bg-neon-purple/80 transition-colors disabled:opacity-50"
          >
             <Download size={18} /> {downloading ? 'Exporting...' : 'Export Data'}
          </button>
        </div>

        {/* Report Card */}
        <div className="glass-card p-6 border-t-2 border-t-threat-high group hover:-translate-y-2 transition-transform cursor-pointer flex flex-col">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-threat-high/20 p-3 rounded-full text-threat-high">
               <AlertTriangle size={24} />
            </div>
            <span className="text-xs font-mono bg-white/10 px-2 py-1 rounded text-gray-300">PDF</span>
          </div>
          <h3 className="text-xl font-bold mb-2 group-hover:text-threat-high transition-colors">Incident & Threat Log</h3>
          <p className="text-sm text-gray-400 flex-1 mb-6 mt-2">Filtered report detailing exclusively Dark Vessels and zone violation alerts prioritized by intelligence severity.</p>
          <button 
            onClick={() => handleDownloadPDF('/api/reports/threats', 'incident_threat_log.pdf')}
            disabled={downloading}
            className="w-full py-3 rounded-xl bg-threat-high text-white font-bold flex items-center justify-center gap-2 hover:bg-red-600 transition-colors disabled:opacity-50"
          >
             <Download size={18} /> {downloading ? 'Generating...' : 'Generate Threat Log'}
          </button>
        </div>

      </div>
    </motion.div>
  )
}

function Target(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  )
}
