import { useMcpStore } from '../../../stores/mcpStore';

export function OutputNodePanel({ nodeId, data }) {
  const { updateNodeData } = useMcpStore();

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-neutral-700 mb-2 block">
          Return Path
        </label>
        <p className="text-xs text-neutral-400 mb-3">
          Specify the data path to return as the tool's output. Use dot notation to access nested properties.
        </p>
        <input
          type="text"
          value={data.returnPath || ''}
          onChange={(e) => updateNodeData(nodeId, { returnPath: e.target.value })}
          placeholder="data.result"
          className="w-full px-3 py-2 text-sm font-mono border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent bg-white"
        />
      </div>
    </div>
  );
}
