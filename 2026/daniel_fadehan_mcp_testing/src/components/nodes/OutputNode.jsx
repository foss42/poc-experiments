import { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { NodeWrapper } from './shared/NodeWrapper';
import { OutputIcon } from './shared/NodeIcons';
import { NODE_TYPE_META } from '../../utils/constants';
import { useMcpStore } from '../../stores/mcpStore';
import { getNodeBorderClass } from './shared/nodeStyles';

export const OutputNode = memo(({ id, data, selected }) => {
  const { openNDV } = useMcpStore();
  const meta = NODE_TYPE_META['output'];
  const returnPath = data.returnPath || '';
  const executionStatus = data.executionStatus;

  return (
    <NodeWrapper nodeId={id} nodeType="output" selected={selected} executionStatus={executionStatus}>
      {/* Node Shape */}
      <div className="relative">
        <Handle type="target" position={Position.Left}
          className="!w-3 !h-3 !bg-neutral-400 !border-2 !border-white !-left-1.5" />

        <div className={`w-16 h-16 rounded-l-xl rounded-r-[32px] bg-white border-2 flex items-center justify-center shadow-sm transition-all ${getNodeBorderClass(selected, executionStatus)}`}>
          <div className={`w-10 h-10 rounded-full ${meta.bgColor} flex items-center justify-center`}>
            <OutputIcon className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>

      {/* Label positioned below */}
      <div className="absolute top-[100%] mt-2 flex flex-col items-center w-max min-w-[120px] pointer-events-none">
        <span className="text-xs font-semibold text-neutral-700 bg-white/90 px-2 py-0.5 rounded shadow-sm border border-neutral-100 backdrop-blur-sm">{meta.label}</span>
        {returnPath && (
          <span className="text-[10px] text-neutral-500 font-medium bg-white/80 px-2 pb-0.5 rounded-b shadow-sm border border-t-0 border-neutral-100 backdrop-blur-sm -mt-[1px] truncate max-w-[120px]">
            {returnPath}
          </span>
        )}
      </div>
    </NodeWrapper>
  );
});

OutputNode.displayName = 'OutputNode';
