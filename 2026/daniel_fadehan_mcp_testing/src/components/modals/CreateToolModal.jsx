import { useState } from 'react';
import { Modal } from './Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useMcpStore } from '../../stores/mcpStore';

export function CreateToolModal() {
  const {
    isCreateToolModalOpen,
    closeCreateToolModal,
    createToolForServerId,
    addTool
  } = useMcpStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !createToolForServerId) return;
    addTool(createToolForServerId, name.trim(), description.trim());
    setName('');
    setDescription('');
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    closeCreateToolModal();
  };

  return (
    <Modal
      isOpen={isCreateToolModalOpen}
      onClose={handleClose}
      title="Create Tool"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Tool Name"
          placeholder="get_forecast"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-neutral-700">
            Description
          </label>
          <textarea
            placeholder="Get weather forecast for a location using coordinates"
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
            Create Tool
          </Button>
        </div>
      </form>
    </Modal>
  );
}
