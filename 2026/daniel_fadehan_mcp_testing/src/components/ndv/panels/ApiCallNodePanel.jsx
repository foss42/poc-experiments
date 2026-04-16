import { useMcpStore } from '../../../stores/mcpStore';
import { AUTH_TYPES, BODY_CONTENT_TYPES, HTTP_METHODS } from '../../../utils/constants';
import { ToggleSection } from '../shared/ToggleSection';
import { KeyValueEditor } from '../shared/KeyValueEditor';

const METHOD_COLORS = {
  GET: 'text-green-600 bg-green-50 border-green-200',
  POST: 'text-blue-600 bg-blue-50 border-blue-200',
  PUT: 'text-orange-600 bg-orange-50 border-orange-200',
  PATCH: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  DELETE: 'text-red-600 bg-red-50 border-red-200',
};

const AUTH_LABELS = {
  [AUTH_TYPES.NONE]: 'None',
  [AUTH_TYPES.API_KEY]: 'API Key',
  [AUTH_TYPES.BEARER_TOKEN]: 'Bearer Token',
  [AUTH_TYPES.BASIC_AUTH]: 'Basic Auth',
  [AUTH_TYPES.OAUTH2]: 'OAuth 2.0',
};

export function ApiCallNodePanel({ nodeId, data }) {
  const { updateNodeData } = useMcpStore();

  const updateField = (path, value) => {
    const keys = path.split('.');
    if (keys.length === 1) {
      updateNodeData(nodeId, { [path]: value });
    } else if (keys.length === 2) {
      updateNodeData(nodeId, {
        [keys[0]]: { ...data[keys[0]], [keys[1]]: value },
      });
    } else if (keys.length === 3) {
      updateNodeData(nodeId, {
        [keys[0]]: {
          ...data[keys[0]],
          [keys[1]]: { ...data[keys[0]]?.[keys[1]], [keys[2]]: value },
        },
      });
    }
  };

  const auth = data.authentication || { type: 'none' };
  const headers = data.headers || { enabled: false, items: [] };
  const queryParams = data.queryParams || { enabled: false, items: [] };
  const body = data.body || { enabled: false, contentType: 'application/json', content: '' };
  const options = data.options || { enabled: false, timeout: 30000, followRedirects: true, validateSSL: true };

  return (
    <div className="space-y-4">
      {/* Method + URL */}
      <div>
        <label className="text-sm font-medium text-neutral-700 mb-2 block">Request</label>
        <div className="flex gap-2">
          <select
            value={data.method || 'GET'}
            onChange={(e) => updateNodeData(nodeId, { method: e.target.value })}
            className={`px-3 py-2 text-sm font-semibold border rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent ${METHOD_COLORS[data.method] || 'bg-white border-border'}`}
          >
            {HTTP_METHODS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <input
            type="text"
            value={data.url || ''}
            onChange={(e) => updateNodeData(nodeId, { url: e.target.value })}
            placeholder="https://api.example.com/endpoint"
            className="flex-1 px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent bg-white"
          />
        </div>
      </div>

      {/* Authentication */}
      <ToggleSection title="Authentication" defaultOpen={auth.type !== 'none'}>
        <div className="space-y-3">
          <select
            value={auth.type || 'none'}
            onChange={(e) => updateField('authentication.type', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent bg-white"
          >
            {Object.entries(AUTH_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          {/* API Key fields */}
          {auth.type === AUTH_TYPES.API_KEY && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-neutral-500 mb-1 block">Key name</label>
                  <input
                    type="text"
                    value={auth.apiKey?.key || ''}
                    onChange={(e) => updateField('authentication.apiKey.key', e.target.value)}
                    placeholder="X-API-Key"
                    className="w-full px-3 py-1.5 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-500 mb-1 block">Add to</label>
                  <select
                    value={auth.apiKey?.addTo || 'header'}
                    onChange={(e) => updateField('authentication.apiKey.addTo', e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent bg-white"
                  >
                    <option value="header">Header</option>
                    <option value="query">Query Parameter</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-neutral-500 mb-1 block">Value</label>
                <input
                  type="password"
                  value={auth.apiKey?.value || ''}
                  onChange={(e) => updateField('authentication.apiKey.value', e.target.value)}
                  placeholder="your-api-key"
                  className="w-full px-3 py-1.5 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent bg-white"
                />
              </div>
            </div>
          )}

          {/* Bearer Token */}
          {auth.type === AUTH_TYPES.BEARER_TOKEN && (
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">Token</label>
              <input
                type="password"
                value={auth.bearerToken?.token || ''}
                onChange={(e) => updateField('authentication.bearerToken.token', e.target.value)}
                placeholder="your-bearer-token"
                className="w-full px-3 py-1.5 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent bg-white"
              />
            </div>
          )}

          {/* Basic Auth */}
          {auth.type === AUTH_TYPES.BASIC_AUTH && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-neutral-500 mb-1 block">Username</label>
                <input
                  type="text"
                  value={auth.basicAuth?.username || ''}
                  onChange={(e) => updateField('authentication.basicAuth.username', e.target.value)}
                  placeholder="username"
                  className="w-full px-3 py-1.5 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent bg-white"
                />
              </div>
              <div>
                <label className="text-xs text-neutral-500 mb-1 block">Password</label>
                <input
                  type="password"
                  value={auth.basicAuth?.password || ''}
                  onChange={(e) => updateField('authentication.basicAuth.password', e.target.value)}
                  placeholder="password"
                  className="w-full px-3 py-1.5 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent bg-white"
                />
              </div>
            </div>
          )}

          {/* OAuth2 */}
          {auth.type === AUTH_TYPES.OAUTH2 && (
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">Access Token</label>
              <input
                type="password"
                value={auth.oauth2?.accessToken || ''}
                onChange={(e) => updateField('authentication.oauth2.accessToken', e.target.value)}
                placeholder="your-access-token"
                className="w-full px-3 py-1.5 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent bg-white"
              />
            </div>
          )}
        </div>
      </ToggleSection>

      {/* Query Parameters */}
      <ToggleSection
        title="Query Parameters"
        enabled={queryParams.enabled}
        onToggle={(val) => updateField('queryParams.enabled', val)}
        defaultOpen={queryParams.enabled}
      >
        <KeyValueEditor
          items={queryParams.items || []}
          onChange={(items) => updateField('queryParams.items', items)}
          keyPlaceholder="Parameter"
          valuePlaceholder="Value"
        />
      </ToggleSection>

      {/* Headers */}
      <ToggleSection
        title="Headers"
        enabled={headers.enabled}
        onToggle={(val) => updateField('headers.enabled', val)}
        defaultOpen={headers.enabled}
      >
        <KeyValueEditor
          items={headers.items || []}
          onChange={(items) => updateField('headers.items', items)}
          keyPlaceholder="Header"
          valuePlaceholder="Value"
        />
      </ToggleSection>

      {/* Body */}
      <ToggleSection
        title="Body"
        enabled={body.enabled}
        onToggle={(val) => updateField('body.enabled', val)}
        defaultOpen={body.enabled}
      >
        <div className="space-y-3">
          <select
            value={body.contentType || 'application/json'}
            onChange={(e) => updateField('body.contentType', e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent bg-white"
          >
            {Object.entries(BODY_CONTENT_TYPES).map(([key, value]) => (
              <option key={key} value={value}>{value}</option>
            ))}
          </select>
          <textarea
            value={body.content || ''}
            onChange={(e) => updateField('body.content', e.target.value)}
            placeholder={body.contentType === 'application/json' ? '{\n  "key": "value"\n}' : 'Request body...'}
            rows={6}
            className="w-full px-3 py-2 text-sm font-mono border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent resize-none bg-white"
            spellCheck={false}
          />
        </div>
      </ToggleSection>

      {/* Options */}
      <ToggleSection
        title="Options"
        enabled={options.enabled}
        onToggle={(val) => updateField('options.enabled', val)}
        defaultOpen={options.enabled}
      >
        <div className="space-y-3">
          <div>
            <label className="text-xs text-neutral-500 mb-1 block">Timeout (ms)</label>
            <input
              type="number"
              value={options.timeout || 30000}
              onChange={(e) => updateField('options.timeout', parseInt(e.target.value, 10))}
              className="w-32 px-3 py-1.5 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent bg-white"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={options.followRedirects !== false}
              onChange={(e) => updateField('options.followRedirects', e.target.checked)}
              className="rounded border-neutral-300"
            />
            <span className="text-sm text-neutral-600">Follow redirects</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={options.validateSSL !== false}
              onChange={(e) => updateField('options.validateSSL', e.target.checked)}
              className="rounded border-neutral-300"
            />
            <span className="text-sm text-neutral-600">Validate SSL certificate</span>
          </label>
        </div>
      </ToggleSection>
    </div>
  );
}
