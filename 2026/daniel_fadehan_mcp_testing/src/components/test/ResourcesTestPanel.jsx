import { useTestStore } from '../../stores/testStore';
import { Button } from '../ui/Button';

export function ResourcesTestPanel() {
  const {
    getSelectedResource,
    resourceInputValues,
    setResourceInputValue,
    executeResource,
    isExecuting,
    lastResourceResponse,
  } = useTestStore();

  const resource = getSelectedResource();

  if (!resource) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-neutral-100 flex items-center justify-center border border-neutral-200">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-500">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
            </svg>
          </div>
          <h3 className="text-base font-medium text-neutral-900 mb-1">Select a Resource</h3>
          <p className="text-sm text-neutral-500">Choose a resource from the sidebar to inspect its properties or read its contents.</p>
        </div>
      </div>
    );
  }

  const hasVariables = resource.variables && resource.variables.length > 0;

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      {/* Resource Header */}
      <div className="px-6 py-5 border-b border-neutral-200 shrink-0 flex items-center justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-medium text-neutral-900 truncate">{resource.name}</h2>
            <span className="text-[11px] font-medium text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-md border border-neutral-200">
              {resource.resourceType === 'direct' ? 'Static' : 'Template'}
            </span>
          </div>
          {resource.description && (
            <p className="text-sm text-neutral-500 mt-1 truncate">{resource.description}</p>
          )}
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Input Panel */}
        <div className="w-1/2 border-r border-neutral-200 flex flex-col overflow-hidden bg-neutral-50/30">
          <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
            <h3 className="text-sm font-medium text-neutral-900">Configuration</h3>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Meta Info */}
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-2">URI Template</label>
                <div className="px-3 py-2 text-sm font-mono bg-white border border-neutral-200 rounded-lg text-neutral-800 break-all">
                  {resource.uri}
                </div>
              </div>
              
              {resource.mimeType && (
                <div>
                  <label className="block text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-2">MIME Type</label>
                  <div className="inline-flex px-3 py-1.5 text-xs font-medium bg-neutral-100 text-neutral-700 rounded-md border border-neutral-200">
                    {resource.mimeType}
                  </div>
                </div>
              )}
            </div>

            {/* Variables Input */}
            <div>
              <label className="block text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-4">
                {hasVariables ? 'Template Variables' : 'Variables'}
              </label>
              
              {hasVariables ? (
                <div className="space-y-4">
                  {resource.variables.map((variable) => (
                    <div key={variable.name} className="space-y-1.5">
                      <label className="block text-sm font-medium text-neutral-700">
                        {variable.name}
                        {variable.description && (
                          <span className="font-normal text-neutral-500 ml-2">
                            {variable.description}
                          </span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={resourceInputValues[variable.name] || ''}
                        onChange={(e) => setResourceInputValue(variable.name, e.target.value)}
                        placeholder={`Value for ${variable.name}`}
                        className="w-full px-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-neutral-900 transition-shadow"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg">
                  <p className="text-sm text-neutral-500">
                    This is a static resource. No template variables required.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action Footer */}
          <div className="p-4 border-t border-neutral-200 bg-white">
            <Button
              onClick={executeResource}
              disabled={isExecuting}
              className="w-full py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg font-medium text-sm transition-colors shadow-sm"
            >
              {isExecuting ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  Reading Resource...
                </span>
              ) : (
                'Read Resource'
              )}
            </Button>
          </div>
        </div>

        {/* Output Panel */}
        <div className="w-1/2 flex flex-col overflow-hidden bg-white">
          <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
            <h3 className="text-sm font-medium text-neutral-900">Output</h3>
            {lastResourceResponse && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${
                lastResourceResponse.success 
                  ? 'bg-green-50 text-green-700 border border-green-200/50' 
                  : 'bg-red-50 text-red-700 border border-red-200/50'
              }`}>
                {lastResourceResponse.success ? `${lastResourceResponse.responseTime}ms` : 'Error'}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {!lastResourceResponse ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-sm text-neutral-400">Run the resource to view output</p>
              </div>
            ) : lastResourceResponse.success ? (
              <div className="space-y-4">
                <div className="bg-neutral-900 rounded-xl overflow-hidden border border-neutral-800 shadow-sm">
                  <div className="px-4 py-2 border-b border-neutral-800 bg-neutral-950/50 flex justify-between items-center">
                    <span className="text-[11px] font-mono text-neutral-400">Response Data</span>
                  </div>
                  <div className="p-4 overflow-x-auto">
                    <pre className="text-xs font-mono text-green-400/90 whitespace-pre-wrap leading-relaxed">
                      {JSON.stringify(lastResourceResponse.data, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                <h4 className="text-sm font-medium text-red-800 mb-1">Execution Failed</h4>
                <p className="text-sm text-red-600/90 whitespace-pre-wrap font-mono">
                  {lastResourceResponse.error}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
