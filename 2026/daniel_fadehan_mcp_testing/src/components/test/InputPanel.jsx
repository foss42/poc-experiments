import { useEffect } from 'react';
import { useTestStore } from '../../stores/testStore';
import { SchemaForm } from './SchemaForm';
import { JsonEditor } from './JsonEditor';
import { Button } from '../ui/Button';

export function InputPanel({ tool }) {
  const { inputMode, setInputMode, executeTool, isExecuting, inputValues, rawJsonInput } = useTestStore();

  // Keyboard shortcut: Cmd+Enter to run
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!isExecuting) executeTool();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isExecuting, executeTool]);

  const handleCopyInput = () => {
    let data;
    if (inputMode === 'json') {
      data = rawJsonInput;
    } else {
      data = JSON.stringify(inputValues, null, 2);
    }
    navigator.clipboard.writeText(data);
  };

  return (
    <div className="w-1/2 flex flex-col min-w-0 border-r border-neutral-200 bg-neutral-50/30">
      {/* Tab bar */}
      <div className="flex border-b border-neutral-200 shrink-0 px-6 pt-4 gap-4">
        <button
          onClick={() => setInputMode('form')}
          className={`pb-3 text-sm font-medium transition-colors relative ${
            inputMode === 'form'
              ? 'text-neutral-900'
              : 'text-neutral-500 hover:text-neutral-700'
          }`}
        >
          Form
          {inputMode === 'form' && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-neutral-900 rounded-t-full" />
          )}
        </button>
        <button
          onClick={() => setInputMode('json')}
          className={`pb-3 text-sm font-medium transition-colors relative ${
            inputMode === 'json'
              ? 'text-neutral-900'
              : 'text-neutral-500 hover:text-neutral-700'
          }`}
        >
          JSON
          {inputMode === 'json' && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-neutral-900 rounded-t-full" />
          )}
        </button>
      </div>

      {/* Form/JSON content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
        {inputMode === 'form' ? (
          <SchemaForm schema={tool.inputSchema} />
        ) : (
          <JsonEditor />
        )}
      </div>

      {/* Bottom action bar */}
      <div className="p-4 border-t border-neutral-200 shrink-0 bg-white">
        <div className="space-y-3">
          <Button 
            onClick={executeTool} 
            disabled={isExecuting} 
            className="w-full py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg font-medium text-sm transition-colors shadow-sm"
          >
            {isExecuting ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                Running Tool...
              </span>
            ) : (
              <span className="flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Run Tool
              </span>
            )}
          </Button>
          <div className="flex items-center justify-between px-1">
            <button 
              onClick={handleCopyInput} 
              className="text-xs text-neutral-500 hover:text-neutral-900 transition-colors font-medium"
            >
              Copy Input
            </button>
            <div className="flex items-center gap-1.5 text-neutral-400">
              <kbd className="font-sans text-[10px] px-1.5 py-0.5 rounded border border-neutral-200 bg-neutral-50">⌘</kbd>
              <kbd className="font-sans text-[10px] px-1.5 py-0.5 rounded border border-neutral-200 bg-neutral-50">Enter</kbd>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
