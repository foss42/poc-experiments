import { useMcpStore } from '../../../stores/mcpStore';
import { PARAM_TYPES } from '../../../utils/constants';

export function InputNodePanel({ nodeId, data }) {
  const { updateNodeData } = useMcpStore();
  const parameters = data.parameters || [];

  const addParameter = () => {
    updateNodeData(nodeId, {
      parameters: [...parameters, { name: '', type: 'string', description: '', required: false }],
    });
  };

  const removeParameter = (index) => {
    updateNodeData(nodeId, {
      parameters: parameters.filter((_, i) => i !== index),
    });
  };

  const updateParameter = (index, field, value) => {
    const updated = parameters.map((param, i) =>
      i === index ? { ...param, [field]: value } : param
    );
    updateNodeData(nodeId, { parameters: updated });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-neutral-700">Tool Parameters</h3>
        <button
          onClick={addParameter}
          className="text-xs px-3 py-1.5 border border-border rounded-md hover:bg-neutral-50 transition-colors text-neutral-600"
        >
          + Add parameter
        </button>
      </div>

      {parameters.length === 0 ? (
        <p className="text-xs text-neutral-400 italic py-4 text-center">
          No parameters defined. Add parameters that your tool will accept.
        </p>
      ) : (
        <div className="space-y-3">
          {parameters.map((param, index) => (
            <div key={index} className="border border-border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400">Parameter {index + 1}</span>
                <button
                  onClick={() => removeParameter(index)}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  Remove
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-neutral-500 mb-1 block">Name</label>
                  <input
                    type="text"
                    value={param.name}
                    onChange={(e) => updateParameter(index, 'name', e.target.value)}
                    placeholder="param_name"
                    className="w-full px-3 py-1.5 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-500 mb-1 block">Type</label>
                  <select
                    value={param.type}
                    onChange={(e) => updateParameter(index, 'type', e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent bg-white"
                  >
                    {Object.entries(PARAM_TYPES).map(([key, value]) => (
                      <option key={key} value={value}>{value}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-neutral-500 mb-1 block">Description</label>
                <input
                  type="text"
                  value={param.description || ''}
                  onChange={(e) => updateParameter(index, 'description', e.target.value)}
                  placeholder="Describe this parameter"
                  className="w-full px-3 py-1.5 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={param.required || false}
                  onChange={(e) => updateParameter(index, 'required', e.target.checked)}
                  className="rounded border-neutral-300"
                />
                <span className="text-xs text-neutral-600">Required</span>
              </label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
