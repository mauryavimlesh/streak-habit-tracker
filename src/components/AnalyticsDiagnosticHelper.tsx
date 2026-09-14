import React, { useEffect, useState } from 'react';
import { getAnalyticsStatus } from '../lib/analyticsService';

export default function AnalyticsDiagnosticHelper() {
  const [status, setStatus] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Only fetch status in development
    if (import.meta.env.DEV) {
      const interval = setInterval(() => {
        setStatus(getAnalyticsStatus());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, []);

  if (!import.meta.env.DEV) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[9999]">
      {isOpen ? (
        <div className="bg-black border border-gray-800 rounded-lg p-4 shadow-xl text-xs font-mono text-green-400 w-80 max-h-96 overflow-auto opacity-95">
          <div className="flex justify-between items-center mb-2 border-b border-gray-800 pb-2">
            <h3 className="font-bold text-white">Analytics Diagnostics</h3>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-1">
            <p><span className="text-gray-500">Initialized:</span> {status?.initialized ? '✅ Yes' : '❌ No'}</p>
            <p><span className="text-gray-500">Has Instance:</span> {status?.hasInstance ? '✅ Yes' : '❌ No'}</p>
            <p><span className="text-gray-500">Measurement ID:</span> <span className="text-yellow-300">{status?.measurementId}</span></p>
            <p><span className="text-gray-500">User ID:</span> {status?.userId || 'None'}</p>
            <p><span className="text-gray-500">Project ID:</span> {status?.projectId}</p>
          </div>
          
          <div className="mt-4 pt-2 border-t border-gray-800">
            <h4 className="text-gray-300 font-semibold mb-1">Recent Events:</h4>
            <div className="space-y-1 max-h-32 overflow-auto">
              {(() => {
                const stored = sessionStorage.getItem('streak_recent_events');
                if (!stored) return <p className="text-gray-600 italic">No events yet</p>;
                try {
                  const events = JSON.parse(stored);
                  return events.slice(0, 5).map((e: any, i: number) => (
                    <div key={i} className="flex justify-between">
                      <span className="text-blue-300">{e.name}</span>
                      <span className="text-gray-500">{new Date(e.time).toLocaleTimeString()}</span>
                    </div>
                  ));
                } catch {
                  return null;
                }
              })()}
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-black/50 hover:bg-black text-xs font-mono text-green-400 border border-green-500/30 rounded px-2 py-1 shadow-lg transition-colors"
        >
          {status?.measurementId === 'MISSING' ? '⚠️ Analytics: Missing ID' : '📊 Analytics: OK'}
        </button>
      )}
    </div>
  );
}
