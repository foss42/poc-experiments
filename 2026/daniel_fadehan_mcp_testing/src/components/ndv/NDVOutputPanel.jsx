import { useState } from 'react';
import { DataPreview } from './shared/DataPreview';
import { useMcpStore } from '../../stores/mcpStore';

export function NDVOutputPanel({ nodeId }) {
  const { nodeExecutionData, nodeMockData, setNodeMockData } = useMcpStore();
  const [mockInput, setMockInput] = useState('');

  const executionOutput = nodeExecutionData[nodeId]?.output;
  const mockOutput = nodeMockData[nodeId]?.output;
  const displayData = mockOutput || executionOutput;

  const handlePinMockData = () => {
    try {
      const parsed = JSON.parse(mockInput);
      setNodeMockData(nodeId, 'output', parsed);
      setMockInput('');
    } catch {
      // Invalid JSON - ignore
    }
  };

  const handleClearMock = () => {
    setNodeMockData(nodeId, 'output', undefined);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
          Output Data
        </h3>
        {mockOutput && (
          <button
            onClick={handleClearMock}
            className="text-xs text-red-500 hover:text-red-600"
          >
            Clear pin
          </button>
        )}
      </div>

      <DataPreview
        data={displayData}
        title="Output from this node"
      />

      {/* Pin mock data */}
      <div className="space-y-2">
        <label className="text-xs text-neutral-500">Pin mock output (JSON)</label>
        <textarea
          value={mockInput}
          onChange={(e) => setMockInput(e.target.value)}
          placeholder='{ "result": "example" }'
          rows={3}
          className="w-full px-3 py-2 text-xs font-mono border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent resize-none bg-white"
        />
        <button
          onClick={handlePinMockData}
          disabled={!mockInput.trim()}
          className="text-xs px-3 py-1.5 bg-neutral-900 text-white rounded-md hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Pin data
        </button>
      </div>
    </div>
  );
}
