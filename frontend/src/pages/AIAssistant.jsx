import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Send, Trash2 } from 'lucide-react';
import axios from 'axios';

const API = 'http://localhost:8000/api';

const CHIPS = [
  'Show dark vessels status',
  'What is the current risk level?',
  'List ships by zone',
  'Run SAR detection status',
  "Generate a report",
];

export default function AIAssistant() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const chatRef = useRef(null);

  useEffect(() => {
    axios.get(`${API}/chat/history`).then(res => {
      if (res.data && res.data.length > 0) {
        setMessages(res.data);
      } else {
        setMessages([{ from: 'ai', text: 'NEPTUNE-AI Intelligence Engine online. Ask me about vessel status, risk levels, zone data, or detection results — all responses use live system data.' }]);
      }
    }).catch(() => {
      setMessages([{ from: 'ai', text: 'NEPTUNE-AI Intelligence Engine online. How can I assist your maritime surveillance operations?' }]);
    });
  }, []);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, typing]);

  const sendMessage = async (text) => {
    if (!text.trim()) return;
    const userMsg = { from: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setTyping(true);

    try {
      const res = await axios.post(`${API}/chat/send`, { message: text });
      setMessages(prev => [...prev, { from: 'ai', text: res.data.response }]);
    } catch (e) {
      setMessages(prev => [...prev, { from: 'ai', text: 'Error connecting to NEPTUNE-AI engine. Please check backend status.' }]);
    } finally {
      setTyping(false);
    }
  };

  const clearChat = () => {
    axios.delete(`${API}/chat`).then(() => {
      setMessages([{ from: 'ai', text: 'Chat cleared. NEPTUNE-AI ready for new queries.' }]);
    }).catch(() => {});
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="animate-fadein h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="font-heading text-lg tracking-wider text-neon-cyan flex items-center gap-2"><MessageSquare size={18} /> AI ASSISTANT</h2>
          <p className="text-xs font-mono text-gray-500 mt-1">Powered by live surveillance data — all responses use real-time system state</p>
        </div>
        <button onClick={clearChat} className="btn-glow text-[10px] font-heading tracking-wider px-4 py-2 rounded-lg border border-white/10 text-gray-500 flex items-center gap-2">
          <Trash2 size={12} /> CLEAR CHAT
        </button>
      </div>

      <div ref={chatRef} className="flex-1 glass-card p-4 overflow-y-auto space-y-3 mb-4" style={{ minHeight: '300px' }}>
        {messages.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[70%] rounded-xl px-4 py-3 text-xs whitespace-pre-wrap ${
              m.from === 'user'
                ? 'bg-neon-cyan/15 border border-neon-cyan/20 text-gray-200'
                : 'glass-panel text-neon-green font-mono'
            }`}>{m.text}</div>
          </motion.div>
        ))}
        {typing && (
          <div className="flex justify-start">
            <div className="glass-panel rounded-xl px-4 py-3 flex gap-1.5">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-2 h-2 bg-neon-cyan rounded-full animate-pulse" style={{ animationDelay: `${i * 0.2}s` }}></div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {CHIPS.map(c => (
          <button key={c} onClick={() => sendMessage(c)}
            className="text-[10px] font-mono px-3 py-1.5 rounded-full border border-neon-cyan/20 text-neon-cyan/70 hover:bg-neon-cyan/10 hover:text-neon-cyan transition-all">
            {c}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
          placeholder="Ask NEPTUNE-AI about live vessel data..."
          className="flex-1 text-xs font-mono bg-neptune-800/50 border border-white/5 rounded-lg px-4 py-3 text-gray-300 placeholder-gray-600 focus:border-neon-cyan/30 outline-none" />
        <button onClick={() => sendMessage(input)}
          className="btn-glow px-4 py-3 rounded-lg border border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan">
          <Send size={16} />
        </button>
      </div>
    </motion.div>
  );
}
