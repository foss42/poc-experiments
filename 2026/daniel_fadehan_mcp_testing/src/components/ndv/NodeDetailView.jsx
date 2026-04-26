import { useEffect, useCallback, useState } from 'react';
import { useMcpStore } from '../../stores/mcpStore';
import { NDVHeader } from './NDVHeader';
import { NDVInputPanel } from './NDVInputPanel';
import { NDVParametersPanel } from './NDVParametersPanel';
import { NDVOutputPanel } from './NDVOutputPanel';
import { NDVFooter } from './NDVFooter';

const TABS = [
  { key: 'parameters', label: 'Parameters' },
  { key: 'input', label: 'Input' },
  { key: 'output', label: 'Output' },
];

export function NodeDetailView() {
  const { isNDVOpen, selectedNodeId, closeNDV, getSelectedItem } = useMcpStore();
  const [activeTab, setActiveTab] = useState('parameters');

  const tool = getSelectedItem();
  const node = tool?.nodes?.find((n) => n.id === selectedNodeId);

  // Close on Escape
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      closeNDV();
    }
  }, [closeNDV]);

  useEffect(() => {
    if (isNDVOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isNDVOpen, handleKeyDown]);

  // Reset tab when opening a new node
  useEffect(() => {
    if (isNDVOpen) {
      setActiveTab('parameters');
    }
  }, [isNDVOpen, selectedNodeId]);

  if (!isNDVOpen || !node) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={closeNDV}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 bottom-0 w-[480px] bg-white shadow-xl z-50 flex flex-col animate-slide-in">
        <NDVHeader nodeType={node.type} onClose={closeNDV} />

        {/* Tabs */}
        <div className="flex border-b border-border px-5">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                px-4 py-2.5 text-xs font-medium transition-colors relative
                ${activeTab === tab.key
                  ? 'text-neutral-900'
                  : 'text-neutral-400 hover:text-neutral-600'
                }
              `}
            >
              {tab.label}
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'parameters' && (
            <NDVParametersPanel
              nodeId={node.id}
              nodeType={node.type}
              data={node.data}
            />
          )}
          {activeTab === 'input' && (
            <NDVInputPanel nodeId={node.id} />
          )}
          {activeTab === 'output' && (
            <NDVOutputPanel nodeId={node.id} />
          )}
        </div>

        <NDVFooter />
      </div>
    </>
  );
}
