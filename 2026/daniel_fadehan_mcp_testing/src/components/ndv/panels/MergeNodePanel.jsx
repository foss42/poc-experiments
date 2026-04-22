import { useMcpStore } from '../../../stores/mcpStore';

export function MergeNodePanel({ nodeId, data }) {
  const { updateNodeData } = useMcpStore();

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-neutral-700 mb-2 block">
          Merge Mode
        </label>
        <select
          value={data.mode || 'append'}
          onChange={(e) => updateNodeData(nodeId, { mode: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent bg-white"
        >
          <option value="append">Append - Combine arrays sequentially</option>
          <option value="combine">Combine - Merge objects by key</option>
          <option value="waitAll">Wait All - Wait for all inputs before proceeding</option>
        </select>
      </div>

      <div>
        <label className="text-sm font-medium text-neutral-700 mb-2 block">
          Input Count
        </label>
        <p className="text-xs text-neutral-400 mb-3">
          Number of inputs this merge node accepts.
        </p>
        <input
          type="number"
          min={2}
          max={10}
          value={data.inputCount || 2}
          onChange={(e) => updateNodeData(nodeId, { inputCount: parseInt(e.target.value, 10) || 2 })}
          className="w-24 px-3 py-1.5 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent bg-white"
        />
      </div>
    </div>
  );
}
