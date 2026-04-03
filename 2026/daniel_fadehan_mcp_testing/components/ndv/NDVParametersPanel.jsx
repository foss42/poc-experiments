import { WORKFLOW_NODE_TYPES } from '../../utils/constants';
import { InputNodePanel } from './panels/InputNodePanel';
import { ApiCallNodePanel } from './panels/ApiCallNodePanel';
import { TransformNodePanel } from './panels/TransformNodePanel';
import { ConditionNodePanel } from './panels/ConditionNodePanel';
import { OutputNodePanel } from './panels/OutputNodePanel';
import { CodeNodePanel } from './panels/CodeNodePanel';
import { LoopNodePanel } from './panels/LoopNodePanel';
import { MergeNodePanel } from './panels/MergeNodePanel';
import { ErrorHandlerNodePanel } from './panels/ErrorHandlerNodePanel';

const PANEL_MAP = {
  [WORKFLOW_NODE_TYPES.INPUT]: InputNodePanel,
  [WORKFLOW_NODE_TYPES.API_CALL]: ApiCallNodePanel,
  [WORKFLOW_NODE_TYPES.TRANSFORM]: TransformNodePanel,
  [WORKFLOW_NODE_TYPES.CONDITION]: ConditionNodePanel,
  [WORKFLOW_NODE_TYPES.OUTPUT]: OutputNodePanel,
  [WORKFLOW_NODE_TYPES.CODE]: CodeNodePanel,
  [WORKFLOW_NODE_TYPES.LOOP]: LoopNodePanel,
  [WORKFLOW_NODE_TYPES.MERGE]: MergeNodePanel,
  [WORKFLOW_NODE_TYPES.ERROR_HANDLER]: ErrorHandlerNodePanel,
};

export function NDVParametersPanel({ nodeId, nodeType, data }) {
  const PanelComponent = PANEL_MAP[nodeType];

  if (!PanelComponent) {
    return (
      <div className="p-4 text-center text-sm text-neutral-400">
        No configuration available for this node type.
      </div>
    );
  }

  return <PanelComponent nodeId={nodeId} data={data} />;
}
