import { useMcpStore } from '../../stores/mcpStore';
import { Button } from '../ui/Button';

export function FirstNodePrompt() {
  const { openAddNodePicker } = useMcpStore();

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
      <div className="bg-white border border-border rounded-lg p-6 shadow-lg text-center max-w-sm pointer-events-auto">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted-foreground"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
        </div>

        <h3 className="text-base font-semibold text-neutral-900 mb-1">
          Build your workflow
        </h3>

        <p className="text-sm text-muted-foreground mb-4">
          Add nodes to define what this tool does when called. Connect Input to Output through API calls and transforms.
        </p>

        <Button onClick={openAddNodePicker} size="sm">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-1.5"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add your first node
        </Button>
      </div>
    </div>
  );
}
