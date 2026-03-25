import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Crosshair, MapPin, Radar, AlertTriangle, BarChart3,
  FileText, MessageSquare, Clock, Shield, Users, Settings, Anchor
} from 'lucide-react';

const navItems = [
  { path: '/command', label: 'Command Center', icon: Crosshair },
  { path: '/tracking', label: 'Live Tracking', icon: MapPin },
  { path: '/detect', label: 'SAR Detection', icon: Radar },
  { path: '/alerts', label: 'Alerts', icon: AlertTriangle },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/reports', label: 'Reports', icon: FileText },
  { path: '/assistant', label: 'AI Assistant', icon: MessageSquare },
  { path: '/timemachine', label: 'Time Machine', icon: Clock },
  { path: '/risk', label: 'Risk Scoring', icon: Shield },
  { path: '/users', label: 'User Mgmt', icon: Users },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  return (
    <motion.aside
      initial={{ x: -260 }}
      animate={{ x: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="w-56 glass-panel border-r border-[rgba(0,229,255,0.08)] flex flex-col shrink-0"
    >
      {/* Logo */}
      <div className="h-14 flex items-center px-4 gap-2.5 border-b border-[rgba(0,229,255,0.08)]">
        <div className="p-1.5 bg-gradient-to-br from-neon-cyan to-neon-green rounded-lg shadow-[0_0_12px_rgba(0,229,255,0.4)]">
          <Anchor size={18} className="text-neptune-900" />
        </div>
        <div>
          <h1 className="font-heading text-xs font-bold tracking-[0.12em] text-neon-cyan">NEPTUNE</h1>
          <p className="text-[9px] font-mono text-gray-500 -mt-0.5">SAR INTEL SYS</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5 mt-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-200 text-[13px] font-medium relative ${
                isActive
                  ? 'bg-neon-cyan/10 text-neon-cyan shadow-[inset_0_0_20px_rgba(0,229,255,0.05)]'
                  : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon size={16} className={isActive ? 'text-neon-cyan' : ''} />
                <span>{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="nav-active"
                    className="absolute right-0 w-[3px] h-6 bg-neon-cyan rounded-l-full shadow-[0_0_8px_#00e5ff]"
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* System Status */}
      <div className="p-3">
        <div className="p-3 bg-neptune-800/50 rounded-lg border border-[rgba(0,229,255,0.06)] text-center">
          <div className="flex items-center justify-center gap-2 text-[10px] font-mono text-gray-400">
            <div className="w-1.5 h-1.5 rounded-full bg-neon-green shadow-[0_0_6px_#00ff88] animate-pulse"></div>
            SYSTEM OPERATIONAL
          </div>
        </div>
      </div>
    </motion.aside>
  );
}
