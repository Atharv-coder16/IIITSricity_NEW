import { useState, useEffect, createContext, useContext } from 'react';

const ToastContext = createContext();

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  
  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  };

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="fixed bottom-12 right-4 z-[999] flex flex-col gap-2">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`toast-enter font-mono text-xs px-4 py-2.5 rounded-lg border backdrop-blur-md shadow-lg ${
              t.type === 'success' ? 'bg-neon-green/10 border-neon-green/30 text-neon-green' :
              t.type === 'error' ? 'bg-danger/10 border-danger/30 text-danger' :
              t.type === 'warning' ? 'bg-warning/10 border-warning/30 text-warning' :
              'bg-neon-cyan/10 border-neon-cyan/30 text-neon-cyan'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
