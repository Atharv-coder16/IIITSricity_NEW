import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Map, Layers } from 'lucide-react';
import axios from 'axios';

export default function MapView() {
  const [detections, setDetections] = useState([]);
  const [imageSize, setImageSize] = useState({width: 1000, height: 1000});
  const baseLat = 18.9220;
  const baseLng = 72.8347;

  useEffect(() => {
    axios.get('http://localhost:8000/api/detections')
      .then(res => {
        setDetections(res.data.detections || []);
        if (res.data.image_size) {
            setImageSize(res.data.image_size);
        }
      })
      .catch(err => console.error(err));
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="h-full flex flex-col"
    >
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2"><Map size={28} className="text-neon-blue"/> Live Maritime Map</h2>
          <p className="text-gray-400 mt-2">Correlated geospatial tracking of detected vessels.</p>
        </div>
        <div className="flex bg-white/5 p-1 rounded-xl glass-card">
           <button className="px-4 py-2 bg-neon-blue/20 text-neon-blue rounded-lg text-sm font-semibold">Standard</button>
           <button className="px-4 py-2 text-gray-400 hover:text-white rounded-lg text-sm font-semibold transition-colors">Satellite</button>
           <button className="px-4 py-2 text-gray-400 hover:text-white rounded-lg text-sm font-semibold transition-colors">Dark Mode</button>
        </div>
      </div>

      <div className="flex-1 glass-card overflow-hidden border border-white/10 rounded-2xl relative shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
        <MapContainer center={[baseLat, baseLng]} zoom={13} scrollWheelZoom={true} className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          
          {detections.map((d, i) => {
            // Pseudo-mapping projection (assuming image covers a 0.05 lat/lng block)
            const mapLat = baseLat - ((d.bbox[1] / imageSize.height) * 0.05);
            const mapLng = baseLng + ((d.bbox[0] / imageSize.width) * 0.05);
            return (
              <Marker key={i} position={[mapLat, mapLng]}>
                <Popup className="glass-panel text-ocean-900 font-bold p-2">
                  <span className="text-sm font-black">ID: {d.track_id}</span><br />
                  Class: {d.ship_type}<br />
                  Confidence: {(d.confidence*100).toFixed(1)}%<br />
                  Threat: {d.threat_level} {d.is_dark_vessel && "🔴 DARK"}
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* Overlay Controls */}
        <div className="absolute top-4 right-4 z-[400] glass-panel p-3 rounded-xl flex flex-col gap-2 border-white/10">
           <button className="p-2 bg-white/5 hover:bg-neon-blue/20 hover:text-neon-blue rounded-lg transition-colors text-white" title="Layers">
             <Layers size={20} />
           </button>
        </div>
      </div>
    </motion.div>
  )
}
