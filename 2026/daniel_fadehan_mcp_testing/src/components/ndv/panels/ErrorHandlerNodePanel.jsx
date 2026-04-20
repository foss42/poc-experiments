import { useMcpStore } from '../../../stores/mcpStore';

export function ErrorHandlerNodePanel({ nodeId, data }) {
  const { updateNodeData } = useMcpStore();

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-neutral-700 mb-2 block">
          Error Handling
        </label>
        <p className="text-xs text-neutral-400 mb-3">
          Wrap the input execution in a try/catch. Errors route to the error output handle.
        </p>

        <label className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-neutral-50 transition-colors">
          <input
            type="checkbox"
            checked={data.continueOnError || false}
            onChange={(e) => updateNodeData(nodeId, { continueOnError: e.target.checked })}
            className="rounded border-neutral-300"
          />
          <div>
            <span className="text-sm text-neutral-700 font-medium">Continue on error</span>
            <p className="text-xs text-neutral-400 mt-0.5">
              When enabled, the workflow continues through the error branch instead of stopping.
            </p>
          </div>
        </label>
      </div>

      <div className="flex gap-4 pt-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-400" />
          <span className="text-xs text-neutral-600">Success output</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <span className="text-xs text-neutral-600">Error output</span>
        </div>
      </div>
    </div>
  );
}
