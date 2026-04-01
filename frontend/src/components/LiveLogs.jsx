import { useEffect, useRef } from 'react';

export default function LiveLogs({ logs }) {
  const containerRef = useRef(null);

  // Auto-scroll
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="h-48 glass-panel border-t border-dark-700 flex flex-col z-20">
      <div className="px-4 py-2 border-b border-dark-700 bg-dark-900/40 text-xs font-semibold text-gray-400 tracking-wider uppercase flex justify-between">
        <span>Live Execution Logs</span>
        <span>{logs.length} events</span>
      </div>
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 font-mono text-sm flex flex-col gap-1"
      >
        {logs.length === 0 && (
          <div className="text-gray-600 italic">Waiting for execution to start...</div>
        )}
        {logs.map((log, i) => {
          const typeClass = 
            log.type === 'error' ? 'text-red-400' :
            log.type === 'success' ? 'text-green-400' :
            log.type === 'warn' ? 'text-yellow-400' : 'text-gray-300';
          return (
            <div key={i} className={`flex items-start gap-3 hover:bg-dark-700/30 px-2 py-0.5 rounded ${typeClass}`}>
              <span className="text-gray-500 whitespace-nowrap">[{log.time}]</span>
              <span className="font-semibold w-24 shrink-0">[{log.source}]</span>
              <span className="flex-1 drop-shadow-sm">{log.message}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
