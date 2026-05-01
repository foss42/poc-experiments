import React, { useEffect, useRef, useState } from 'react';

interface AppHostProps {
  appUrl: string;
}

export const AppHost: React.FC<AppHostProps> = ({ appUrl }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Security: In a real app we would check event.origin
      if (event.data?.type === 'mcp-apps-ready') {
        console.log('MCP App Handshake Complete');
        setStatus('connected');
      }
    };

    window.addEventListener('message', handleMessage);
    
    // Initial handshake attempt
    const timer = setTimeout(() => {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage({ type: 'mcp-apps-handshake' }, '*');
      }
    }, 1000);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearTimeout(timer);
    };
  }, [appUrl]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="label-sm">MCP App Host: {appUrl}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
           <div style={{ 
             width: '8px', 
             height: '8px', 
             backgroundColor: status === 'connected' ? 'var(--accent)' : '#ffb4ab' 
           }} />
           <span className="label-sm">{status.toUpperCase()}</span>
        </div>
      </div>
      
      <div style={{ 
        flex: 1, 
        backgroundColor: '#fff', 
        border: 'none',
        position: 'relative'
      }}>
        {appUrl ? (
          <iframe
            ref={iframeRef}
            src={appUrl}
            title="MCP App"
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        ) : (
          <div style={{ 
            height: '100%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            backgroundColor: 'var(--surface-container)',
            color: 'var(--text-muted)'
          }}>
            NO APP URL PROVIDED
          </div>
        )}
      </div>
    </div>
  );
};
