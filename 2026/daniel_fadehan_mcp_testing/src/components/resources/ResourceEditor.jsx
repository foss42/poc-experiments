import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useMcpStore } from '../../stores/mcpStore';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

export function ResourceEditor() {
    const { getSelectedItem, updateItem } = useMcpStore();
    const resource = getSelectedItem();

    // Editable name/description state
    const [isEditingName, setIsEditingName] = useState(false);
    const [isEditingDesc, setIsEditingDesc] = useState(false);
    const [nameValue, setNameValue] = useState('');
    const [descValue, setDescValue] = useState('');
    const nameRef = useRef(null);
    const descRef = useRef(null);

    // Preview state
    const [showPreview, setShowPreview] = useState(false);
    const [previewVariables, setPreviewVariables] = useState({});

    useEffect(() => {
        if (resource) {
            setNameValue(resource.name);
            setDescValue(resource.description || '');
        }
    }, [resource?.id]);

    const startEditingName = useCallback(() => {
        if (!resource) return;
        setNameValue(resource.name);
        setIsEditingName(true);
        setTimeout(() => nameRef.current?.select(), 0);
    }, [resource]);

    const saveName = useCallback(() => {
        setIsEditingName(false);
        if (nameValue.trim() && nameValue !== resource?.name) {
            updateItem({ name: nameValue.trim() });
        }
    }, [nameValue, resource, updateItem]);

    const startEditingDesc = useCallback(() => {
        if (!resource) return;
        setDescValue(resource.description || '');
        setIsEditingDesc(true);
        setTimeout(() => descRef.current?.select(), 0);
    }, [resource]);

    const saveDesc = useCallback(() => {
        setIsEditingDesc(false);
        if (descValue !== (resource?.description || '')) {
            updateItem({ description: descValue.trim() });
        }
    }, [descValue, resource, updateItem]);

    const handleNameKeyDown = (e) => {
        if (e.key === 'Enter') saveName();
        if (e.key === 'Escape') setIsEditingName(false);
    };

    const handleDescKeyDown = (e) => {
        if (e.key === 'Enter') saveDesc();
        if (e.key === 'Escape') setIsEditingDesc(false);
    };

    if (!resource) return null;

    // Fallbacks if not set
    const resourceType = resource.resourceType || 'template';
    const uriTemplate = resource.uriTemplate || '';
    const mimeType = resource.mimeType || 'application/json';
    const staticContent = resource.content || '';
    const variablesMetadata = resource.variables || [];

    // Auto-extract variables from {param}
    const extractedVariables = useMemo(() => {
        const regex = /\{([^}]+)\}/g;
        let match;
        const vars = new Set();
        while ((match = regex.exec(uriTemplate)) !== null) {
            vars.add(match[1]);
        }
        return Array.from(vars);
    }, [uriTemplate]);

    // Sync extracted variables with stored metadata
    const getVariableMetadata = (varName) => {
        return variablesMetadata.find(v => v.name === varName) || {
            name: varName,
            type: 'string',
            description: '',
            defaultValue: ''
        };
    };

    const handleUpdateVariable = (varName, field, value) => {
        const existingIndex = variablesMetadata.findIndex(v => v.name === varName);
        const updatedVar = {
            ...getVariableMetadata(varName),
            [field]: value
        };

        let newVariables;
        if (existingIndex >= 0) {
            newVariables = [...variablesMetadata];
            newVariables[existingIndex] = updatedVar;
        } else {
            newVariables = [...variablesMetadata, updatedVar];
        }

        updateItem({ variables: newVariables });
    };

    // Resolve URI with preview variables
    const getResolvedUri = () => {
        let uri = uriTemplate;
        extractedVariables.forEach(varName => {
            const value = previewVariables[varName] || `{${varName}}`;
            uri = uri.replace(new RegExp(`\\{${varName}\\}`, 'g'), value);
        });
        return uri;
    };

    // Resolve content with preview variables
    const getResolvedContent = () => {
        let content = staticContent;
        extractedVariables.forEach(varName => {
            const value = previewVariables[varName] || `{{${varName}}}`;
            content = content.replace(new RegExp(`\\{\\{${varName}\\}\\}`, 'g'), value);
        });
        return content;
    };

    // Generate protocol response preview
    const getProtocolPreview = () => {
        const resolved = resourceType === 'template' ? getResolvedUri() : uriTemplate;
        const content = resourceType === 'template' ? getResolvedContent() : staticContent;

        return {
            contents: [{
                uri: resolved,
                mimeType: mimeType,
                text: content || '(no content)'
            }]
        };
    };

    return (
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
            {/* Header with editable name */}
            <div className="h-14 border-b border-border flex items-center px-4 shrink-0 bg-white">
                <div className="flex items-center gap-2 flex-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-0-2.5z" />
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    </svg>
                    {isEditingName ? (
                        <input
                            ref={nameRef}
                            value={nameValue}
                            onChange={(e) => setNameValue(e.target.value)}
                            onBlur={saveName}
                            onKeyDown={handleNameKeyDown}
                            className="text-sm font-semibold text-neutral-900 bg-transparent border-b border-neutral-300 focus:outline-none focus:border-neutral-900"
                            autoFocus
                        />
                    ) : (
                        <h2
                            onClick={startEditingName}
                            className="text-sm font-semibold text-neutral-900 cursor-pointer hover:text-neutral-600 transition-colors"
                            title="Click to edit"
                        >
                            {resource.name}
                        </h2>
                    )}
                </div>
                <span className="ml-3 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {resourceType === 'direct' ? 'Static Resource' : 'Resource Template'}
                </span>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-4xl mx-auto space-y-8">
                    {/* Header Info with editable description */}
                    <div>
                        <h1 className="text-2xl font-semibold text-neutral-900 mb-2">Resource Configuration</h1>
                        {isEditingDesc ? (
                            <input
                                ref={descRef}
                                value={descValue}
                                onChange={(e) => setDescValue(e.target.value)}
                                onBlur={saveDesc}
                                onKeyDown={handleDescKeyDown}
                                placeholder="Add a description..."
                                className="text-sm text-muted-foreground w-full bg-transparent border-b border-neutral-300 focus:outline-none focus:border-neutral-900"
                                autoFocus
                            />
                        ) : (
                            <p
                                onClick={startEditingDesc}
                                className="text-sm text-muted-foreground cursor-pointer hover:text-neutral-600 transition-colors"
                                title="Click to edit"
                            >
                                {resource.description || "Click to add a description..."}
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Left column: Basic info */}
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-neutral-900 border-b border-border pb-2">
                                    General Settings
                                </h3>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-neutral-700">Type</label>
                                    <select
                                        value={resourceType}
                                        onChange={(e) => updateItem({ resourceType: e.target.value })}
                                        className="w-full px-3 py-2 text-sm text-neutral-900 bg-white border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900"
                                    >
                                        <option value="direct">Static Resource</option>
                                        <option value="template">Resource Template</option>
                                    </select>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {resourceType === 'direct'
                                            ? 'Static resources return fixed content at a fixed URI.'
                                            : 'Resource templates use URI parameters (e.g., {city}) to generate dynamic content.'}
                                    </p>
                                </div>

                                <Input
                                    label={resourceType === 'direct' ? 'URI' : 'URI Template'}
                                    placeholder={resourceType === 'direct' ? 'file:///docs/readme.md' : 'weather://forecast/{city}'}
                                    value={uriTemplate}
                                    onChange={(e) => updateItem({ uriTemplate: e.target.value })}
                                />

                                <Input
                                    label="MIME Type"
                                    placeholder="application/json"
                                    value={mimeType}
                                    onChange={(e) => updateItem({ mimeType: e.target.value })}
                                />
                            </div>

                            {/* Variables table (only for templates) */}
                            {resourceType === 'template' && (
                                <div className="space-y-3">
                                    <h3 className="text-lg font-semibold text-neutral-900 border-b border-border pb-2">
                                        Template Variables
                                    </h3>
                                    {extractedVariables.length > 0 ? (
                                        <div className="space-y-3">
                                            {extractedVariables.map((varName) => {
                                                const meta = getVariableMetadata(varName);
                                                return (
                                                    <div key={varName} className="p-3 border border-border rounded-lg bg-neutral-50 space-y-3">
                                                        <div className="flex items-center gap-2">
                                                            <code className="text-sm font-mono bg-neutral-200 px-2 py-0.5 rounded text-neutral-900 font-semibold">
                                                                {`{${varName}}`}
                                                            </code>
                                                            <span className="text-xs text-muted-foreground">Auto-extracted from URI</span>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div>
                                                                <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Type</label>
                                                                <select
                                                                    value={meta.type}
                                                                    onChange={(e) => handleUpdateVariable(varName, 'type', e.target.value)}
                                                                    className="w-full px-2 py-1 text-sm bg-white border border-border rounded focus:outline-none focus:ring-1 focus:ring-neutral-400"
                                                                >
                                                                    <option value="string">String</option>
                                                                    <option value="number">Number</option>
                                                                    <option value="boolean">Boolean</option>
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Default Value</label>
                                                                <input
                                                                    type="text"
                                                                    value={meta.defaultValue || ''}
                                                                    onChange={(e) => handleUpdateVariable(varName, 'defaultValue', e.target.value)}
                                                                    placeholder="Optional default"
                                                                    className="w-full px-2 py-1 text-sm bg-white border border-border rounded focus:outline-none focus:ring-1 focus:ring-neutral-400"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Description</label>
                                                            <input
                                                                type="text"
                                                                value={meta.description || ''}
                                                                onChange={(e) => handleUpdateVariable(varName, 'description', e.target.value)}
                                                                placeholder="Describe what this variable represents..."
                                                                className="w-full px-2 py-1 text-sm bg-white border border-border rounded focus:outline-none focus:ring-1 focus:ring-neutral-400"
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-sm text-muted-foreground border-2 border-dashed border-border rounded-lg p-4 text-center">
                                            No variables found. Use <code className="bg-neutral-100 px-1 py-0.5 rounded">{"{param}"}</code> syntax in your URI template.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Right column: Content/Handler */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between border-b border-border pb-2">
                                <h3 className="text-lg font-semibold text-neutral-900">
                                    {resourceType === 'direct' ? 'Resource Content' : 'Response Template'}
                                </h3>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowPreview(!showPreview)}
                                    className={showPreview ? 'bg-neutral-100' : ''}
                                >
                                    {showPreview ? 'Hide Preview' : 'Protocol Preview'}
                                </Button>
                            </div>

                            {resourceType === 'template' && (
                                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <p className="text-xs text-blue-700">
                                        <strong>Tip:</strong> Use <code className="bg-blue-100 px-1 rounded">{`{{variable}}`}</code> syntax to interpolate URI variables into your content.
                                        For example: <code className="bg-blue-100 px-1 rounded">{`Weather for {{city}}`}</code>
                                    </p>
                                </div>
                            )}

                            <textarea
                                value={staticContent}
                                onChange={(e) => updateItem({ content: e.target.value })}
                                className="w-full h-64 p-4 text-sm font-mono text-neutral-900 bg-neutral-50 border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-400 focus:bg-white resize-y"
                                placeholder={
                                    resourceType === 'direct'
                                        ? "Enter the static content this resource returns...\n\nExamples:\n- JSON data\n- Markdown documentation\n- Plain text"
                                        : "Enter the response template...\n\nUse {{variable}} to interpolate URI parameters.\n\nExample:\n{\n  \"city\": \"{{city}}\",\n  \"forecast\": \"Sunny\"\n}"
                                }
                            />

                            {/* Protocol Preview */}
                            {showPreview && (
                                <div className="space-y-3">
                                    {resourceType === 'template' && extractedVariables.length > 0 && (
                                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                            <div className="text-xs font-semibold text-green-700 mb-2">Sample Variable Values</div>
                                            <div className="grid grid-cols-2 gap-2">
                                                {extractedVariables.map((varName) => (
                                                    <div key={varName}>
                                                        <label className="text-xs text-green-600">{varName}</label>
                                                        <input
                                                            type="text"
                                                            value={previewVariables[varName] || ''}
                                                            onChange={(e) => setPreviewVariables({ ...previewVariables, [varName]: e.target.value })}
                                                            placeholder={`e.g., sample_${varName}`}
                                                            className="w-full px-2 py-1 text-xs border border-green-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-green-500"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="p-3 bg-neutral-900 rounded-lg">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-semibold text-neutral-400 uppercase">MCP Response (resources/read)</span>
                                        </div>
                                        <pre className="text-xs text-green-400 font-mono overflow-x-auto whitespace-pre-wrap">
                                            {JSON.stringify(getProtocolPreview(), null, 2)}
                                        </pre>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
