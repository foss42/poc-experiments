// Helper to get border classes based on execution status
export const getNodeBorderClass = (selected, executionStatus) => {
  if (executionStatus === 'running') {
    return 'border-green-500 execution-border-running';
  }
  if (executionStatus === 'completed') {
    return 'border-green-500';
  }
  if (executionStatus === 'failed') {
    return 'border-red-500';
  }
  if (selected) {
    return 'border-neutral-900 ring-4 ring-neutral-900/10';
  }
  return 'border-neutral-200 hover:border-neutral-400';
};
