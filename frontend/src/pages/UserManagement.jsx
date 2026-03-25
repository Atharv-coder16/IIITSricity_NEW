import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Plus, X, Check, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { useToast } from '../components/Toast';

const API = 'http://localhost:8000/api';

const PERMISSIONS = [
  ['Command Center', true, true, true],
  ['Live Tracking', true, true, true],
  ['SAR Detection', true, true, false],
  ['Alerts', true, true, true],
  ['Analytics', true, true, true],
  ['Reports', true, true, false],
  ['AI Assistant', true, true, false],
  ['Time Machine', true, false, false],
  ['Risk Scoring', true, true, false],
  ['User Management', true, false, false],
  ['Settings', true, false, false],
];

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'Viewer', password: '' });
  const toast = useToast();

  const fetchUsers = () => {
    axios.get(`${API}/users`).then(res => setUsers(res.data.users || [])).catch(() => {});
  };

  useEffect(() => { fetchUsers(); }, []);

  const addUser = async () => {
    if (!form.name || !form.email) return;
    try {
      const res = await axios.post(`${API}/users`, form);
      setUsers(prev => [...prev, res.data]);
      setShowModal(false);
      setForm({ name: '', email: '', role: 'Viewer', password: '' });
      toast('User added successfully', 'success');
    } catch (e) {
      toast('Failed to add user', 'error');
    }
  };

  const toggleStatus = async (id) => {
    try {
      await axios.put(`${API}/users/${id}/toggle`);
      fetchUsers();
      toast('User status updated', 'info');
    } catch (e) {
      toast('Failed to update user', 'error');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="animate-fadein space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-heading text-lg tracking-wider text-neon-cyan flex items-center gap-2"><Users size={18} /> USER MANAGEMENT</h2>
          <p className="text-xs font-mono text-gray-500 mt-1">Access control and personnel administration — {users.length} users</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchUsers} className="btn-glow text-[10px] font-heading tracking-wider px-3 py-2 rounded-lg border border-white/10 text-gray-400 flex items-center gap-1">
            <RefreshCw size={12} /> REFRESH
          </button>
          <button onClick={() => setShowModal(true)}
            className="btn-glow text-[10px] font-heading tracking-wider px-4 py-2 rounded-lg border border-neon-cyan/30 text-neon-cyan bg-neon-cyan/5 flex items-center gap-2">
            <Plus size={12} /> ADD USER
          </button>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="border-b border-white/5 text-[9px] font-heading tracking-wider text-gray-500">
              <th className="py-3 px-4 text-left">USER</th>
              <th className="py-3 px-4 text-left">EMAIL</th>
              <th className="py-3 px-4 text-center">ROLE</th>
              <th className="py-3 px-4 text-center">STATUS</th>
              <th className="py-3 px-4 text-left">LAST LOGIN</th>
              <th className="py-3 px-4 text-center">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b border-white/3 hover:bg-white/3 transition-colors">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: (u.color || '#00e5ff') + '22', color: u.color || '#00e5ff' }}>{u.initials}</div>
                    <span className="text-gray-200">{u.name}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-gray-400">{u.email}</td>
                <td className="py-3 px-4 text-center">
                  <span className={`text-[9px] font-heading tracking-wider px-2 py-0.5 rounded ${u.role === 'Admin' ? 'bg-danger/20 text-danger border border-danger/30' : u.role === 'Analyst' ? 'bg-warning/20 text-warning border border-warning/30' : 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30'}`}>{u.role}</span>
                </td>
                <td className="py-3 px-4 text-center">
                  <span className={`text-[9px] font-heading tracking-wider px-2 py-0.5 rounded ${u.status === 'Active' ? 'bg-neon-green/20 text-neon-green border border-neon-green/30' : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'}`}>{u.status}</span>
                </td>
                <td className="py-3 px-4 text-gray-500">{u.lastLogin}</td>
                <td className="py-3 px-4 text-center">
                  <button onClick={() => toggleStatus(u.id)} className="text-[10px] font-heading tracking-wider px-3 py-1 rounded border border-white/10 text-gray-400 hover:text-white">
                    {u.status === 'Active' ? 'DEACTIVATE' : 'ACTIVATE'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="glass-card p-4">
        <h3 className="font-heading text-[10px] tracking-wider text-gray-400 mb-3">ROLE PERMISSIONS</h3>
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="border-b border-white/5 text-[9px] font-heading tracking-wider text-gray-500">
              <th className="py-2 px-3 text-left">FEATURE</th>
              <th className="py-2 px-3 text-center">ADMIN</th>
              <th className="py-2 px-3 text-center">ANALYST</th>
              <th className="py-2 px-3 text-center">VIEWER</th>
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map(([feature, admin, analyst, viewer]) => (
              <tr key={feature} className="border-b border-white/3">
                <td className="py-2 px-3 text-gray-300">{feature}</td>
                {[admin, analyst, viewer].map((v, i) => (
                  <td key={i} className="py-2 px-3 text-center">
                    {v ? <Check size={14} className="text-neon-green inline" /> : <X size={14} className="text-gray-600 inline" />}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="glass-card p-4">
        <h3 className="font-heading text-[10px] tracking-wider text-gray-400 mb-3">ACTIVE SESSIONS</h3>
        <div className="flex gap-4 flex-wrap">
          {users.filter(u => u.status === 'Active').map(u => (
            <div key={u.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neptune-800/30 border border-white/5">
              <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse shadow-[0_0_6px_#00ff88]"></div>
              <span className="text-[10px] font-mono text-gray-300">{u.name}</span>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur flex items-center justify-center z-50">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card p-6 w-96 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-heading text-sm text-neon-cyan">ADD NEW USER</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white"><X size={16} /></button>
            </div>
            {[['name', 'Full Name'], ['email', 'Email'], ['password', 'Password']].map(([k, l]) => (
              <div key={k}>
                <label className="text-[9px] font-heading tracking-wider text-gray-500 block mb-1">{l}</label>
                <input value={form[k]} onChange={e => setForm(prev => ({ ...prev, [k]: e.target.value }))}
                  type={k === 'password' ? 'password' : 'text'}
                  className="w-full text-xs font-mono bg-neptune-800/50 border border-white/5 rounded-lg px-3 py-2 text-gray-300 focus:border-neon-cyan/30 outline-none" />
              </div>
            ))}
            <div>
              <label className="text-[9px] font-heading tracking-wider text-gray-500 block mb-1">ROLE</label>
              <select value={form.role} onChange={e => setForm(prev => ({ ...prev, role: e.target.value }))}
                className="w-full text-xs font-mono bg-neptune-800/50 border border-white/5 rounded-lg px-3 py-2 text-gray-300 outline-none">
                <option value="Admin">Admin</option>
                <option value="Analyst">Analyst</option>
                <option value="Viewer">Viewer</option>
              </select>
            </div>
            <button onClick={addUser} className="w-full btn-glow font-heading text-xs tracking-wider py-2.5 rounded-lg border border-neon-cyan/50 text-neon-cyan bg-neon-cyan/10">
              CREATE USER
            </button>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
