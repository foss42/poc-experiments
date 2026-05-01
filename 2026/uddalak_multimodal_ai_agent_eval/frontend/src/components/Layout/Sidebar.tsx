import React from 'react';
import { LayoutDashboard, PlayCircle, Cpu, ImagePlus } from 'lucide-react';

// Only include nav items that have real, working implementations
const navItems = [
  { icon: LayoutDashboard, label: 'Analytics',  id: 'dashboard' },
  { icon: PlayCircle,      label: 'Forge Eval', id: 'forge'     },
  { icon: ImagePlus,       label: 'Live Demo',  id: 'live'      },
  { icon: Cpu,             label: 'MCP Apps',   id: 'mcp'       },
];

export const Sidebar: React.FC<{ onViewChange: (id: any) => void, currentView: string }> = ({ onViewChange, currentView }) => {
  return (
    <div className="sidebar" style={{
      width: '240px',
      height: '100vh',
      backgroundColor: 'var(--surface-container)',
      borderRight: '1px solid var(--surface-container-high)',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      left: 0,
      top: 0,
      zIndex: 100
    }}>
      <div style={{ padding: '32px 24px' }}>
        <h2 style={{
          color: 'var(--accent)',
          fontSize: '20px',
          fontWeight: 800,
          letterSpacing: '2px',
          margin: 0
        }}>EVALFORGE</h2>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>PRECISION FORGE v0.1</span>
      </div>

      <nav style={{ flex: 1 }}>
        {navItems.map((item) => (
          <div
            key={item.id}
            onClick={() => onViewChange(item.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 24px',
              cursor: 'pointer',
              transition: 'background-color 0.1s ease',
              backgroundColor: currentView === item.id ? 'var(--surface-container-high)' : 'transparent',
              color: currentView === item.id ? 'var(--accent)' : 'var(--primary)',
              borderLeft: currentView === item.id ? '2px solid var(--accent)' : '2px solid transparent'
            }}
          >
            <item.icon size={18} />
            <span style={{ fontSize: '14px', fontWeight: 500 }}>{item.label}</span>
          </div>
        ))}
      </nav>

      <div style={{ padding: '24px', borderTop: '1px solid var(--surface-container-high)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#E8FF00' }} />
          <span style={{ fontSize: '12px', fontWeight: 500 }}>GSoC PoC ACTIVE</span>
        </div>
      </div>
    </div>
  );
};
