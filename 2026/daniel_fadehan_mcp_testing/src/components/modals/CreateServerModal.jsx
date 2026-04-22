import { useState } from 'react';
import { Modal } from './Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useMcpStore } from '../../stores/mcpStore';
import { TRANSPORT_TYPES } from '../../utils/constants';

export function CreateServerModal() {
  const { isCreateServerModalOpen, closeCreateServerModal, addServer } = useMcpStore();
  const [name, setName] = useState('');
  const [transport, setTransport] = useState(TRANSPORT_TYPES.STDIO);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    addServer(name.trim(), transport);
    setName('');
    setTransport(TRANSPORT_TYPES.STDIO);
  };

  const handleClose = () => {
    setName('');
    setTransport(TRANSPORT_TYPES.STDIO);
    closeCreateServerModal();
  };

  return (
    <Modal
      isOpen={isCreateServerModalOpen}
      onClose={handleClose}
      title="Create MCP Server"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="Server Name"
          placeholder="weather-api"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />

        <div className="space-y-2">
          <label className="text-sm font-medium text-neutral-700">
            Transport Type
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setTransport(TRANSPORT_TYPES.STDIO)}
              className={`
                px-4 py-3 rounded-md border text-sm font-medium transition-all
                ${transport === TRANSPORT_TYPES.STDIO
                  ? 'border-neutral-900 bg-neutral-900 text-white'
                  : 'border-border hover:border-neutral-400 text-neutral-600'
                }
              `}
            >
              STDIO
            </button>
            <button
              type="button"
              onClick={() => setTransport(TRANSPORT_TYPES.HTTP)}
              className={`
                px-4 py-3 rounded-md border text-sm font-medium transition-all
                ${transport === TRANSPORT_TYPES.HTTP
                  ? 'border-neutral-900 bg-neutral-900 text-white'
                  : 'border-border hover:border-neutral-400 text-neutral-600'
                }
              `}
            >
              HTTP
            </button>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={!name.trim()}>
            Create Server
          </Button>
        </div>
      </form>
    </Modal>
  );
}
