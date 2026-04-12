import { useState, useMemo } from 'react';
import type { EvalConfig } from '../lib/api';

interface Props {
  onRun: (config: EvalConfig) => void;
  isRunning: boolean;
}

const MODEL_CAPABILITIES = {
  'qwen2.5:1.5b': ['text', 'agent'],
  'phi3:mini': ['text'],
  'llava-phi3': ['vision'],
  'openai/whisper-tiny': ['audio']
};

const AVAILABLE_TASKS = [
  { id: 'mmlu_pro', label: 'MMLU Pro', modality: 'text' },
  { id: 'pope', label: 'POPE', modality: 'vision' },
  { id: 'librispeech', label: 'LibriSpeech', modality: 'audio' },
  { id: 'basic_agent', label: 'Basic Agent', modality: 'agent' }
];

export default function ConfigPanel({ onRun, isRunning }: Props) {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('qwen2.5:1.5b');
  const [selectedTasks, setSelectedTasks] = useState<string[]>(['mmlu_pro']);
  const [limit, setLimit] = useState(5);

  const activeModelCaps = useMemo(() => MODEL_CAPABILITIES[model as keyof typeof MODEL_CAPABILITIES] || ['text'], [model]);

  const handleTaskToggle = (taskId: string, modality: string) => {
    if (!activeModelCaps.includes(modality)) return;
    setSelectedTasks(prev =>
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTasks.length === 0) return alert("Select at least one task");
    onRun({ api_key: apiKey, model, tasks: selectedTasks, limit });
  };

  return (
    <div className="p-6 border border-gray-200 rounded-xl bg-white shadow-sm">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Configuration</h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <label className="flex flex-col text-sm font-semibold text-gray-700">
          Model Array:
          <select
            value={model}
            onChange={e => {
              setModel(e.target.value);
              setSelectedTasks([]); // Reset tasks on model change to prevent capability mismatch
            }}
            disabled={isRunning}
            className="mt-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
          >
            {Object.keys(MODEL_CAPABILITIES).map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <span className="text-xs text-gray-500 mt-1 font-normal">Capabilites: {activeModelCaps.join(', ')}</span>
        </label>

        <div className="flex flex-col text-sm font-semibold text-gray-700 gap-2">
          Tasks (Auto-filtered by capabilities):
          <div className="grid grid-cols-1 gap-2 border border-gray-200 rounded-md p-3 bg-gray-50 max-h-48 overflow-y-auto">
            {AVAILABLE_TASKS.map(task => {
              const isDisabled = !activeModelCaps.includes(task.modality) || isRunning;
              return (
                <label
                  key={task.id}
                  className={`flex items-center gap-2 p-2 rounded-md transition-colors ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200 cursor-pointer'}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedTasks.includes(task.id)}
                    disabled={isDisabled}
                    onChange={() => handleTaskToggle(task.id, task.modality)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <span className="block text-sm font-medium text-gray-900">{task.label}</span>
                    <span className="block text-xs text-gray-500 uppercase tracking-wider">{task.modality}</span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        <label className="flex flex-col text-sm font-semibold text-gray-700">
          Sample Limit:
          <input
            type="number"
            min="1"
            value={limit}
            onChange={e => setLimit(Number(e.target.value))}
            disabled={isRunning}
            className="mt-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
          />
        </label>

        <label className="flex flex-col text-sm font-semibold text-gray-700">
          API Key (Optional for local):
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="sk-..."
            disabled={isRunning}
            className="mt-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-400"
          />
        </label>

        <button
          type="submit"
          disabled={isRunning || selectedTasks.length === 0}
          className={`mt-2 p-2.5 rounded-md font-bold text-white transition-colors ${isRunning || selectedTasks.length === 0
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 cursor-pointer'
            }`}
        >
          {isRunning ? 'Evaluation Running...' : 'Run Capability Eval'}
        </button>
      </form>
    </div>
  );
}
