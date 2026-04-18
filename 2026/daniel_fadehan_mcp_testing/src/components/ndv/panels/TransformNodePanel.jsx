import { useMcpStore } from '../../../stores/mcpStore';

export function TransformNodePanel({ nodeId, data }) {
  const { updateNodeData } = useMcpStore();

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-neutral-700 mb-2 block">
          Transform Expression
        </label>
        <p className="text-xs text-neutral-400 mb-3">
          Write a JavaScript expression to transform the incoming data. Use <code className="bg-neutral-100 px-1 rounded">data</code> to reference input.
        </p>
        <textarea
          value={data.expression || ''}
          onChange={(e) => updateNodeData(nodeId, { expression: e.target.value })}
          placeholder="data.items.map(item => ({ ...item, processed: true }))"
          rows={6}
          className="w-full px-3 py-2 text-sm font-mono border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent resize-none bg-white"
        />
      </div>
    </div>
  );
}
