import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Home, 
  Search, 
  Map as MapIcon, 
  BarChart2, 
  AlertTriangle, 
  FileText,
  Ship
} from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: Home },
  { path: '/detect', label: 'Detection', icon: Search },
  { path: '/map', label: 'Map View', icon: MapIcon },
  { path: '/analytics', label: 'Analytics', icon: BarChart2 },
  { path: '/alerts', label: 'Alerts', icon: AlertTriangle },
  { path: '/reports', label: 'Reports', icon: FileText },
];

export default function Sidebar() {
  return (
    <motion.aside 
      initial={{ x: -250 }}
      animate={{ x: 0 }}
      className="w-64 glass-panel border-r border-[rgba(255,255,255,0.05)] flex flex-col justify-between"
    >
      <div>
        <div className="h-20 flex items-center px-6 gap-3 border-b border-[rgba(255,255,255,0.05)]">
          <div className="p-2 bg-gradient-to-br from-neon-blue to-neon-purple rounded-xl shadow-[0_0_15px_rgba(0,212,255,0.5)]">
            <Ship size={24} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              SAR Maritime
            </h1>
            <p className="text-xs text-neon-blue font-medium">Intelligence System</p>
          </div>
        </div>

        <nav className="p-4 space-y-2 mt-4">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => 
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-medium ${
                  isActive 
                    ? 'bg-white/10 text-white shadow-[0_0_10px_rgba(255,255,255,0.05)]' 
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon size={20} className={isActive ? 'text-neon-blue' : ''} />
                  <span>{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="active-indicator"
                      className="absolute right-0 w-1 h-8 bg-neon-blue rounded-l-full shadow-[0_0_8px_#00d4ff]"
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="p-6">
        <div className="p-4 bg-ocean-800/50 rounded-xl border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-neon-purple/20 blur-xl"></div>
          <h4 className="text-sm font-semibold text-white mb-1 relative z-10">System Status</h4>
          <div className="flex items-center gap-2 text-xs text-gray-400 relative z-10">
            <div className="w-2 h-2 rounded-full bg-threat-low shadow-[0_0_8px_#22C55E] animate-pulse"></div>
            Online & Secure
          </div>
        </div>
      </div>
    </motion.aside>
  );
}
