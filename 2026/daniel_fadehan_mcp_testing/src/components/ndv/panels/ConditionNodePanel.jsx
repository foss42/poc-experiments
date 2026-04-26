import { useMcpStore } from '../../../stores/mcpStore';

export function ConditionNodePanel({ nodeId, data }) {
  const { updateNodeData } = useMcpStore();

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-neutral-700 mb-2 block">
          Condition Expression
        </label>
        <p className="text-xs text-neutral-400 mb-3">
          Write a JavaScript expression that evaluates to <code className="bg-neutral-100 px-1 rounded">true</code> or <code className="bg-neutral-100 px-1 rounded">false</code>. Use <code className="bg-neutral-100 px-1 rounded">data</code> to reference input.
        </p>
        <textarea
          value={data.expression || ''}
          onChange={(e) => updateNodeData(nodeId, { expression: e.target.value })}
          placeholder="data.status === 'active' && data.count > 0"
          rows={4}
          className="w-full px-3 py-2 text-sm font-mono border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent resize-none bg-white"
        />
      </div>

      <div className="flex gap-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-400" />
          <span className="text-xs text-neutral-600">True branch</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <span className="text-xs text-neutral-600">False branch</span>
        </div>
      </div>
    </div>
  );
}
