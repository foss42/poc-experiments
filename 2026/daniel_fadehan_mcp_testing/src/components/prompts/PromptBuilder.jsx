import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useMcpStore } from '../../stores/mcpStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

export function PromptBuilder() {
    const { getSelectedItem, updateItem } = useMcpStore();
    const prompt = getSelectedItem();

    // Editable name/description state
    const [isEditingName, setIsEditingName] = useState(false);
    const [isEditingDesc, setIsEditingDesc] = useState(false);
    const [nameValue, setNameValue] = useState('');
    const [descValue, setDescValue] = useState('');
    const nameRef = useRef(null);
    const descRef = useRef(null);

    // New argument form state
    const [newArgName, setNewArgName] = useState('');
    const [newArgDesc, setNewArgDesc] = useState('');
    const [newArgType, setNewArgType] = useState('string');
    const [newArgRequired, setNewArgRequired] = useState(false);

    // Preview state
    const [showPreview, setShowPreview] = useState(false);
    const [previewValues, setPreviewValues] = useState({});

    useEffect(() => {
        if (prompt) {
            setNameValue(prompt.name);
            setDescValue(prompt.description || '');
        }
    }, [prompt?.id]);

    // Get defined argument names for validation
    const definedArgNames = useMemo(() => {
        return new Set((prompt?.arguments || []).map(arg => arg.name));
    }, [prompt?.arguments]);

    // Parse message content for {{arg}} references and validate
    const parseMessageReferences = useCallback((content) => {
        const regex = /\{\{(\w+)\}\}/g;
        const references = [];
        let match;
        while ((match = regex.exec(content)) !== null) {
            references.push({
                name: match[1],
                isValid: definedArgNames.has(match[1]),
                index: match.index,
            });
        }
        return references;
    }, [definedArgNames]);

    const startEditingName = useCallback(() => {
        if (!prompt) return;
        setNameValue(prompt.name);
        setIsEditingName(true);
        setTimeout(() => nameRef.current?.select(), 0);
    }, [prompt]);

    const saveName = useCallback(() => {
        setIsEditingName(false);
        if (nameValue.trim() && nameValue !== prompt?.name) {
            updateItem({ name: nameValue.trim() });
        }
    }, [nameValue, prompt, updateItem]);

    const startEditingDesc = useCallback(() => {
        if (!prompt) return;
        setDescValue(prompt.description || '');
        setIsEditingDesc(true);
        setTimeout(() => descRef.current?.select(), 0);
    }, [prompt]);

    const saveDesc = useCallback(() => {
        setIsEditingDesc(false);
        if (descValue !== (prompt?.description || '')) {
            updateItem({ description: descValue.trim() });
        }
    }, [descValue, prompt, updateItem]);

    const handleNameKeyDown = (e) => {
        if (e.key === 'Enter') saveName();
        if (e.key === 'Escape') setIsEditingName(false);
    };

    const handleDescKeyDown = (e) => {
        if (e.key === 'Enter') saveDesc();
        if (e.key === 'Escape') setIsEditingDesc(false);
    };

    if (!prompt) return null;

    const handleAddArg = (e) => {
        e.preventDefault();
        if (!newArgName.trim()) return;

        const newArg = {
            name: newArgName.trim(),
            description: newArgDesc.trim(),
            type: newArgType,
            required: newArgRequired,
        };

        updateItem({ arguments: [...(prompt.arguments || []), newArg] });

        setNewArgName('');
        setNewArgDesc('');
        setNewArgType('string');
        setNewArgRequired(false);
    };

    const handleRemoveArg = (index) => {
        const newArgs = [...(prompt.arguments || [])];
        newArgs.splice(index, 1);
        updateItem({ arguments: newArgs });
    };

    const handleUpdateArg = (index, field, value) => {
        const newArgs = [...(prompt.arguments || [])];
        newArgs[index] = { ...newArgs[index], [field]: value };
        updateItem({ arguments: newArgs });
    };

    // Messages array management
    const messages = prompt.messages || [];

    const handleAddMessage = () => {
        updateItem({ messages: [...messages, { role: 'user', content: '' }] });
    };

    const handleUpdateMessage = (index, field, value) => {
        const newMessages = [...messages];
        newMessages[index] = { ...newMessages[index], [field]: value };
        updateItem({ messages: newMessages });
    };

    const handleRemoveMessage = (index) => {
        const newMessages = [...messages];
        newMessages.splice(index, 1);
        updateItem({ messages: newMessages });
    };

    const handleMoveMessage = (index, direction) => {
        if (direction === 'up' && index > 0) {
            const newMessages = [...messages];
            [newMessages[index - 1], newMessages[index]] = [newMessages[index], newMessages[index - 1]];
            updateItem({ messages: newMessages });
        } else if (direction === 'down' && index < messages.length - 1) {
            const newMessages = [...messages];
            [newMessages[index + 1], newMessages[index]] = [newMessages[index], newMessages[index + 1]];
            updateItem({ messages: newMessages });
        }
    };

    // Render message content with highlighted references
    const renderMessageWithHighlights = (content) => {
        const references = parseMessageReferences(content);
        if (references.length === 0) return null;

        const invalidRefs = references.filter(r => !r.isValid);
        if (invalidRefs.length === 0) return null;

        return (
            <div className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                Undefined: {invalidRefs.map(r => `{{${r.name}}}`).join(', ')}
            </div>
        );
    };

    // Preview with sample values
    const getPreviewContent = () => {
        return messages.map((msg, idx) => {
            let content = msg.content;
            (prompt.arguments || []).forEach(arg => {
                const value = previewValues[arg.name] || `[${arg.name}]`;
                content = content.replace(new RegExp(`\\{\\{${arg.name}\\}\\}`, 'g'), value);
            });
            return { ...msg, content, originalIndex: idx };
        });
    };

    return (
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
            {/* Header with editable name */}
            <div className="h-14 border-b border-border flex items-center px-4 shrink-0 bg-white">
                <div className="flex items-center gap-2 flex-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
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
                            {prompt.name}
                        </h2>
                    )}
                </div>
                <span className="ml-3 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    Prompt Template
                </span>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-4xl mx-auto space-y-12">
                    {/* Header Info with editable description */}
                    <div>
                        <h1 className="text-2xl font-semibold text-neutral-900 mb-2">Prompt Configuration</h1>
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
                                {prompt.description || "Click to add a description..."}
                            </p>
                        )}
                    </div>

                    {/* ARGUMENTS SECTION - NOW FIRST */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between border-b border-border pb-2">
                            <h3 className="text-lg font-semibold text-neutral-900">
                                Arguments
                            </h3>
                            <span className="text-xs text-muted-foreground">
                                Define arguments first, then use them in messages below
                            </span>
                        </div>

                        {/* Arguments List */}
                        {(!prompt.arguments || prompt.arguments.length === 0) ? (
                            <div className="text-sm text-muted-foreground py-6 text-center border-2 border-dashed border-border rounded-lg bg-neutral-50">
                                No arguments defined. Add arguments to use in your messages.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {prompt.arguments.map((arg, idx) => (
                                    <div key={idx} className="flex flex-col gap-3 p-4 border border-border rounded-md bg-white hover:border-neutral-300 transition-colors">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-4">
                                                <div className="col-span-1 lg:col-span-1">
                                                    <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Name</label>
                                                    <input
                                                        type="text"
                                                        value={arg.name}
                                                        onChange={(e) => handleUpdateArg(idx, 'name', e.target.value)}
                                                        className="w-full text-sm font-medium text-neutral-900 border-b border-transparent hover:border-neutral-200 focus:border-neutral-900 focus:outline-none bg-transparent px-1 py-0.5"
                                                    />
                                                </div>
                                                <div className="col-span-1 lg:col-span-1">
                                                    <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Type</label>
                                                    <select
                                                        value={arg.type}
                                                        onChange={(e) => handleUpdateArg(idx, 'type', e.target.value)}
                                                        className="w-full text-sm text-neutral-700 bg-transparent border-none p-0 focus:ring-0 cursor-pointer hover:bg-neutral-50 px-1 py-0.5 rounded"
                                                    >
                                                        <option value="string">String</option>
                                                        <option value="number">Number</option>
                                                        <option value="boolean">Boolean</option>
                                                        <option value="array">Array</option>
                                                        <option value="object">Object</option>
                                                    </select>
                                                </div>
                                                <div className="col-span-2 lg:col-span-2">
                                                    <label className="text-[10px] uppercase font-bold text-muted-foreground mb-1 block">Description</label>
                                                    <input
                                                        type="text"
                                                        value={arg.description || ''}
                                                        onChange={(e) => handleUpdateArg(idx, 'description', e.target.value)}
                                                        placeholder="Description"
                                                        className="w-full text-xs text-muted-foreground border-b border-transparent hover:border-neutral-200 focus:border-neutral-900 focus:outline-none bg-transparent px-1 py-0.5"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 ml-4">
                                                <label className="flex items-center gap-1.5 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={arg.required}
                                                        onChange={(e) => handleUpdateArg(idx, 'required', e.target.checked)}
                                                        className="w-3.5 h-3.5 rounded border-border text-neutral-900 focus:ring-neutral-900 cursor-pointer"
                                                    />
                                                    <span className="text-[10px] uppercase font-bold text-neutral-600">Required</span>
                                                </label>
                                                <button
                                                    onClick={() => handleRemoveArg(idx)}
                                                    className="text-muted-foreground hover:text-red-600 transition-colors p-1"
                                                    title="Remove argument"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Add Argument Form */}
                        <div className="mt-6 p-4 border border-border bg-neutral-50 rounded-lg">
                            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-3">Add New Argument</h4>
                            <form onSubmit={handleAddArg} className="grid gap-4 md:grid-cols-2">
                                <Input
                                    label="Argument Name"
                                    placeholder="e.g. city"
                                    value={newArgName}
                                    onChange={(e) => setNewArgName(e.target.value)}
                                />
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-neutral-700">Type</label>
                                    <select
                                        value={newArgType}
                                        onChange={(e) => setNewArgType(e.target.value)}
                                        className="w-full px-3 py-2 text-sm text-neutral-900 bg-white border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-0 focus:border-transparent"
                                    >
                                        <option value="string">String</option>
                                        <option value="number">Number</option>
                                        <option value="boolean">Boolean</option>
                                        <option value="array">Array</option>
                                        <option value="object">Object</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <Input
                                        label="Description (optional)"
                                        placeholder="e.g. The name of the city to get weather for"
                                        value={newArgDesc}
                                        onChange={(e) => setNewArgDesc(e.target.value)}
                                    />
                                </div>
                                <div className="md:col-span-2 flex items-center mt-1">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={newArgRequired}
                                            onChange={(e) => setNewArgRequired(e.target.checked)}
                                            className="w-4 h-4 rounded border-border text-neutral-900 focus:ring-neutral-900 cursor-pointer"
                                        />
                                        <span className="text-sm text-neutral-700 font-medium">This argument is required</span>
                                    </label>
                                </div>
                                <div className="md:col-span-2 flex justify-end mt-2">
                                    <Button type="submit" disabled={!newArgName.trim()}>
                                        Add Argument
                                    </Button>
                                </div>
                            </form>
                        </div>

                        {/* Quick Reference Panel */}
                        {prompt.arguments && prompt.arguments.length > 0 && (
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="text-xs font-semibold text-blue-700 mb-2">Available Arguments</div>
                                <div className="flex flex-wrap gap-2">
                                    {prompt.arguments.map((arg, idx) => (
                                        <code key={idx} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-mono">
                                            {`{{${arg.name}}}`}
                                        </code>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* MESSAGES SECTION - NOW SECOND */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between border-b border-border pb-2">
                            <h3 className="text-lg font-semibold text-neutral-900">
                                Messages
                            </h3>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowPreview(!showPreview)}
                                    className={showPreview ? 'bg-neutral-100' : ''}
                                >
                                    {showPreview ? 'Hide Preview' : 'Preview'}
                                </Button>
                                <Button variant="outline" size="sm" onClick={handleAddMessage}>
                                    Add Message
                                </Button>
                            </div>
                        </div>

                        {/* Preview Panel */}
                        {showPreview && (
                            <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-green-700 uppercase">Preview with Sample Values</span>
                                </div>
                                {prompt.arguments && prompt.arguments.length > 0 && (
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {prompt.arguments.map((arg, idx) => (
                                            <div key={idx}>
                                                <label className="text-xs text-green-700 font-medium">{arg.name}</label>
                                                <input
                                                    type="text"
                                                    placeholder={`Sample ${arg.name}`}
                                                    value={previewValues[arg.name] || ''}
                                                    onChange={(e) => setPreviewValues({ ...previewValues, [arg.name]: e.target.value })}
                                                    className="w-full px-2 py-1 text-sm border border-green-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-green-500"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="space-y-2 pt-2 border-t border-green-200">
                                    {getPreviewContent().map((msg, idx) => (
                                        <div key={idx} className="text-sm">
                                            <span className="font-semibold text-green-800 capitalize">{msg.role}:</span>
                                            <span className="text-green-900 ml-2 whitespace-pre-wrap">{msg.content || '(empty)'}</span>
                                        </div>
                                    ))}
                                    {messages.length === 0 && (
                                        <p className="text-sm text-green-600 italic">No messages to preview</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {messages.length === 0 ? (
                            <div className="text-sm text-muted-foreground py-10 text-center border-2 border-dashed border-border rounded-lg bg-neutral-50 flex flex-col items-center">
                                <p className="mb-2">No messages defined. The prompt will be empty.</p>
                                <Button variant="default" size="sm" onClick={handleAddMessage}>
                                    Create First Message
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {messages.map((msg, idx) => (
                                    <div key={idx} className="flex flex-col gap-3 p-4 border border-border rounded-lg bg-white shadow-sm focus-within:ring-2 focus-within:ring-neutral-200 transition-all">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <select
                                                    value={msg.role}
                                                    onChange={(e) => handleUpdateMessage(idx, 'role', e.target.value)}
                                                    className="px-3 py-1.5 text-sm font-medium text-neutral-900 bg-neutral-100 border-none rounded focus:outline-none focus:ring-2 focus:ring-neutral-300"
                                                >
                                                    <option value="system">System</option>
                                                    <option value="user">User</option>
                                                    <option value="assistant">Assistant</option>
                                                </select>
                                                <span className="text-xs text-muted-foreground">
                                                    Use <code className="bg-neutral-100 px-1 py-0.5 rounded">{"{{arg_name}}"}</code> to interpolate arguments.
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => handleMoveMessage(idx, 'up')} disabled={idx === 0} className="p-1.5 text-muted-foreground hover:bg-neutral-100 rounded disabled:opacity-30">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6" /></svg>
                                                </button>
                                                <button onClick={() => handleMoveMessage(idx, 'down')} disabled={idx === messages.length - 1} className="p-1.5 text-muted-foreground hover:bg-neutral-100 rounded disabled:opacity-30">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                                </button>
                                                <button onClick={() => handleRemoveMessage(idx)} className="p-1.5 text-red-500 hover:bg-red-50 rounded ml-2">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                                                </button>
                                            </div>
                                        </div>
                                        <textarea
                                            value={msg.content}
                                            onChange={(e) => handleUpdateMessage(idx, 'content', e.target.value)}
                                            placeholder={`Enter ${msg.role} message...`}
                                            className="w-full min-h-[100px] p-3 text-sm text-neutral-900 font-mono bg-neutral-50 border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-400 focus:bg-white resize-y"
                                        />
                                        {renderMessageWithHighlights(msg.content)}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
