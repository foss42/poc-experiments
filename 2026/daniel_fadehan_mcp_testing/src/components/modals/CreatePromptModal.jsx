import { useState } from 'react';
import { Modal } from './Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useMcpStore } from '../../stores/mcpStore';

export function CreatePromptModal() {
    const {
        isCreatePromptModalOpen,
        closeCreatePromptModal,
        createPromptForServerId,
        addPrompt
    } = useMcpStore();

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim() || !createPromptForServerId) return;
        addPrompt(createPromptForServerId, name.trim(), description.trim());
        setName('');
        setDescription('');
    };

    const handleClose = () => {
        setName('');
        setDescription('');
        closeCreatePromptModal();
    };

    return (
        <Modal
            isOpen={isCreatePromptModalOpen}
            onClose={handleClose}
            title="Create Prompt"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="Prompt Name"
                    placeholder="plan-vacation"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                />

                <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-neutral-700">
                        Description
                    </label>
                    <textarea
                        placeholder="Guide through vacation planning process"
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

                <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={!name.trim()}>
                        Create Prompt
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
