import { DataPreview } from './shared/DataPreview';
import { useMcpStore } from '../../stores/mcpStore';

export function NDVInputPanel({ nodeId }) {
  const { nodeExecutionData, nodeMockData } = useMcpStore();

  const executionInput = nodeExecutionData[nodeId]?.input;
  const mockInput = nodeMockData[nodeId]?.input;
  const displayData = mockInput || executionInput;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
          Input Data
        </h3>
        {mockInput && (
          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
            Pinned
          </span>
        )}
      </div>

      <DataPreview
        data={displayData}
        title="Incoming data from previous node"
      />

      <p className="text-xs text-neutral-400">
        Run the workflow to see input data, or pin mock data for testing.
      </p>
    </div>
  );
}
