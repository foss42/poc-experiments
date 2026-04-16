import React, { useState } from 'react';
import { AppHost } from '../components/MCP/AppHost';

interface AppConfig {
  id: string;
  name: string;
  description: string;
  url: string;
}

const APPS: AppConfig[] = [
  {
    id: 'eval-dashboard',
    name: 'Eval Dashboard App',
    description: 'Standard Evaluation UI for core metrics.',
    url: 'http://localhost:8000/static/eval-dashboard.html'
  },
  {
    id: 'sales-analytics',
    name: 'Sales Analytics Verifier',
    description: 'Specialized grading UI for Sales MCP.',
    url: 'http://localhost:8000/static/sales-analytics-test.html'
  }
];

export const MCPPanel: React.FC = () => {
  const [selectedAppId, setSelectedAppId] = useState(APPS[0].id);
  const activeApp = APPS.find(a => a.id === selectedAppId) || APPS[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', height: 'calc(100vh - 160px)' }}>
      <div>
        <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>MCP APPS</h1>
        <p style={{ color: 'var(--text-muted)' }}>Isolated evaluation interfaces embedded via Model Context Protocol.</p>
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '300px 1fr', gap: '32px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <span className="label-sm">Available Apps</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', backgroundColor: 'var(--surface-container-high)' }}>
             {APPS.map((app) => (
               <div 
                key={app.id}
                onClick={() => setSelectedAppId(app.id)}
                style={{ 
                  backgroundColor: selectedAppId === app.id ? 'var(--surface-container-highest)' : 'var(--surface-dim)', 
                  padding: '16px', 
                  borderLeft: selectedAppId === app.id ? '2px solid var(--accent)' : '2px solid transparent',
                  cursor: 'pointer'
                }}>
                  <span style={{ fontSize: '14px', fontWeight: 500, color: selectedAppId === app.id ? 'var(--accent)' : 'var(--primary)' }}>
                    {app.name}
                  </span>
                  <p className="label-sm" style={{ fontSize: '9px', marginTop: '4px' }}>{app.description}</p>
               </div>
             ))}
          </div>
        </div>

        <div style={{ backgroundColor: 'var(--surface-container)', padding: '24px' }}>
          <AppHost appUrl={activeApp.url} />
        </div>
      </div>
    </div>
  );
};
