import { useState } from 'react';
import { Modal } from './Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useMcpStore } from '../../stores/mcpStore';

export function CreateResourceModal() {
    const {
        isCreateResourceModalOpen,
        closeCreateResourceModal,
        createResourceForServerId,
        addResource
    } = useMcpStore();

    const [name, setName] = useState('');
    const [resourceType, setResourceType] = useState('template');
    const [uriTemplate, setUriTemplate] = useState('');
    const [description, setDescription] = useState('');
    const [mimeType, setMimeType] = useState('application/json');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim() || !uriTemplate.trim() || !createResourceForServerId) return;
        addResource(
            createResourceForServerId,
            name.trim(),
            description.trim(),
            uriTemplate.trim(),
            mimeType.trim(),
            resourceType
        );
        setName('');
        setUriTemplate('');
        setDescription('');
        setMimeType('application/json');
        setResourceType('template');
    };

    const handleClose = () => {
        setName('');
        setUriTemplate('');
        setDescription('');
        setMimeType('application/json');
        setResourceType('template');
        closeCreateResourceModal();
    };

    return (
        <Modal
            isOpen={isCreateResourceModalOpen}
            onClose={handleClose}
            title="Create Resource"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="Resource Name"
                    placeholder="weather-forecast"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                />

                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-neutral-700">Type</label>
                    <select
                        value={resourceType}
                        onChange={(e) => setResourceType(e.target.value)}
                        className="w-full px-3 py-2 text-sm text-neutral-900 bg-white border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-900"
                    >
                        <option value="direct">Static Resource</option>
                        <option value="template">Resource Template</option>
                    </select>
                </div>

                <Input
                    label={resourceType === 'direct' ? 'URI' : 'URI Template'}
                    placeholder={resourceType === 'direct' ? 'file:///docs/readme.md' : 'weather://forecast/{city}'}
                    value={uriTemplate}
                    onChange={(e) => setUriTemplate(e.target.value)}
                />

                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-neutral-700">
                        Description
                    </label>
                    <textarea
                        placeholder={resourceType === 'direct' ? 'Documentation for the API' : 'Get weather forecast for a location'}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        className="
              px-3 py-2 w-full
              text-sm text-neutral-900 placeholder:text-neutral-400
              bg-white border border-border rounded-md
              transition-colors duration-150
              hover:border-border-hover
              focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-0 focus:border-transparent
              resize-none
            "
                    />
                </div>

                <Input
                    label="MIME Type"
                    placeholder="application/json"
                    value={mimeType}
                    onChange={(e) => setMimeType(e.target.value)}
                />

                <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={!name.trim() || !uriTemplate.trim()}>
                        Create Resource
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
