import { useMcpStore } from '../../../stores/mcpStore';

export function LoopNodePanel({ nodeId, data }) {
  const { updateNodeData } = useMcpStore();

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-neutral-700 mb-2 block">
          Array Path
        </label>
        <p className="text-xs text-neutral-400 mb-3">
          Dot-notation path to the array to iterate over.
        </p>
        <input
          type="text"
          value={data.arrayPath || ''}
          onChange={(e) => updateNodeData(nodeId, { arrayPath: e.target.value })}
          placeholder="data.items"
          className="w-full px-3 py-2 text-sm font-mono border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent bg-white"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-neutral-500 mb-1 block">Item variable</label>
          <input
            type="text"
            value={data.itemVariable || 'item'}
            onChange={(e) => updateNodeData(nodeId, { itemVariable: e.target.value })}
            placeholder="item"
            className="w-full px-3 py-1.5 text-sm font-mono border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent bg-white"
          />
        </div>
        <div>
          <label className="text-xs text-neutral-500 mb-1 block">Index variable</label>
          <input
            type="text"
            value={data.indexVariable || 'index'}
            onChange={(e) => updateNodeData(nodeId, { indexVariable: e.target.value })}
            placeholder="index"
            className="w-full px-3 py-1.5 text-sm font-mono border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent bg-white"
          />
        </div>
      </div>
    </div>
  );
}
