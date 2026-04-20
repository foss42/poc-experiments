import { useMcpStore } from '../../../stores/mcpStore';

export function CodeNodePanel({ nodeId, data }) {
  const { updateNodeData } = useMcpStore();

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-neutral-700">Code</label>
          <select
            value={data.language || 'javascript'}
            onChange={(e) => updateNodeData(nodeId, { language: e.target.value })}
            className="text-xs px-2 py-1 border border-border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
          >
            <option value="javascript">JavaScript</option>
          </select>
        </div>
        <p className="text-xs text-neutral-400 mb-3">
          Write custom code to process data. Access input via <code className="bg-neutral-100 px-1 rounded">data</code>. Must return a value.
        </p>
        <textarea
          value={data.code || ''}
          onChange={(e) => updateNodeData(nodeId, { code: e.target.value })}
          placeholder="// Write your JavaScript code here\nreturn data;"
          rows={10}
          className="w-full px-3 py-2 text-sm font-mono border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent resize-none bg-neutral-50"
          spellCheck={false}
        />
      </div>
    </div>
  );
}
