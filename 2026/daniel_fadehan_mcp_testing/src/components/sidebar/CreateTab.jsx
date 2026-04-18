import { useState, useCallback, useRef, useEffect } from 'react';
import { useMcpStore } from '../../stores/mcpStore';

export function CreateTab() {
  const {
    servers,
    selectedItemId,
    selectedItemType,
    expandedServers,
    toggleServerExpanded,
    openCreateServerModal,
    openImportServerModal,
    openCreateToolModal,
    openCreateResourceModal,
    openCreatePromptModal,
    openExportServerModal,
    selectItem,
    deleteServer,
    deleteTool,
    deleteResource,
    deletePrompt,
    updateServer,
    updateItem,
  } = useMcpStore();

  return (
    <div className="p-3">
      {/* Servers section */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Servers
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={openImportServerModal}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-neutral-900 transition-colors"
              title="Import server"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </button>
            <button
              onClick={openCreateServerModal}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-neutral-900 transition-colors"
              title="Create server"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>
        </div>

        {servers.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-md">
            No servers yet
          </div>
        ) : (
          <div className="space-y-1">
            {servers.map((server) => (
              <ServerItem
                key={server.id}
                server={server}
                isExpanded={expandedServers.includes(server.id)}
                onToggle={() => toggleServerExpanded(server.id)}
                selectedItemId={selectedItemId}
                selectedItemType={selectedItemType}
                onSelectItem={selectItem}
                onAddTool={() => openCreateToolModal(server.id)}
                onAddResource={() => openCreateResourceModal(server.id)}
                onAddPrompt={() => openCreatePromptModal(server.id)}
                onDeleteServer={() => deleteServer(server.id)}
                onExportServer={() => openExportServerModal(server.id)}
                onDeleteTool={(toolId) => deleteTool(server.id, toolId)}
                onDeleteResource={(resourceId) => deleteResource(server.id, resourceId)}
                onDeletePrompt={(promptId) => deletePrompt(server.id, promptId)}
                onUpdateServer={(updates) => updateServer(server.id, updates)}
                onDuplicateTool={(tool) => {
                  const { addTool } = useMcpStore.getState();
                  addTool(server.id, `${tool.name}_copy`, tool.description);
                }}
                onDuplicateResource={(resource) => {
                  const { addResource } = useMcpStore.getState();
                  addResource(
                    server.id,
                    `${resource.name}_copy`,
                    resource.description,
                    resource.uriTemplate,
                    resource.mimeType,
                    resource.resourceType
                  );
                }}
                onDuplicatePrompt={(prompt) => {
                  const { addPrompt } = useMcpStore.getState();
                  addPrompt(server.id, `${prompt.name}_copy`, prompt.description, [...(prompt.arguments || [])]);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ServerItem({
  server,
  isExpanded,
  onToggle,
  selectedItemId,
  selectedItemType,
  onSelectItem,
  onAddTool,
  onAddResource,
  onAddPrompt,
  onDeleteServer,
  onExportServer,
  onDeleteTool,
  onDeleteResource,
  onDeletePrompt,
  onUpdateServer,
  onDuplicateTool,
  onDuplicateResource,
  onDuplicatePrompt,
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(server.name);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleRename = () => {
    if (editName.trim() && editName !== server.name) {
      onUpdateServer({ name: editName.trim() });
    }
    setIsEditing(false);
  };

  return (
    <div>
      {/* Server header */}
      <div
        className="group flex items-center gap-1 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer"
        onClick={() => !isEditing && onToggle()}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>

        {isEditing ? (
          <input
            ref={inputRef}
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') {
                setEditName(server.name);
                setIsEditing(false);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 text-sm font-medium text-neutral-900 bg-white border border-neutral-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-neutral-400"
            autoFocus
          />
        ) : (
          <span className="flex-1 text-sm font-medium text-neutral-900 truncate">
            {server.name}
          </span>
        )}

        <span className="text-xs text-muted-foreground uppercase">
          {server.transport}
        </span>

        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-neutral-200 text-muted-foreground transition-all"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="1" />
              <circle cx="12" cy="5" r="1" />
              <circle cx="12" cy="19" r="1" />
            </svg>
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-border rounded-md shadow-lg py-1 min-w-[120px]">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    setEditName(server.name);
                    setIsEditing(true);
                  }}
                  className="w-full px-3 py-1.5 text-left text-sm text-neutral-700 hover:bg-neutral-100 flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Rename
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onExportServer();
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-left text-sm text-neutral-700 hover:bg-neutral-100 flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Export
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteServer();
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  </svg>
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Contents list */}
      {isExpanded && (
        <div className="ml-3 pl-3 border-l border-border space-y-3 pt-1 pb-2">
          {/* Tools Section */}
          <SectionList
            title="Tools"
            items={server.tools}
            itemType="tool"
            selectedItemId={selectedItemId}
            selectedItemType={selectedItemType}
            onSelect={(id) => onSelectItem(server.id, id, 'tool')}
            onDelete={onDeleteTool}
            onDuplicate={onDuplicateTool}
            onAdd={onAddTool}
          />

          {/* Resources Section */}
          <SectionList
            title="Resources"
            items={server.resources}
            itemType="resource"
            selectedItemId={selectedItemId}
            selectedItemType={selectedItemType}
            onSelect={(id) => onSelectItem(server.id, id, 'resource')}
            onDelete={onDeleteResource}
            onDuplicate={onDuplicateResource}
            onAdd={onAddResource}
          />

          {/* Prompts Section */}
          <SectionList
            title="Prompts"
            items={server.prompts}
            itemType="prompt"
            selectedItemId={selectedItemId}
            selectedItemType={selectedItemType}
            onSelect={(id) => onSelectItem(server.id, id, 'prompt')}
            onDelete={onDeletePrompt}
            onDuplicate={onDuplicatePrompt}
            onAdd={onAddPrompt}
          />
        </div>
      )}
    </div>
  );
}

function SectionList({ title, items, itemType, selectedItemId, selectedItemType, onSelect, onDelete, onDuplicate, onAdd }) {
  return (
    <div>
      <div className="flex items-center justify-between px-2 mb-1">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase">{title}</span>
        <button
          onClick={onAdd}
          className="p-1 rounded hover:bg-neutral-200 text-muted-foreground transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>
      <div className="space-y-0.5">
        {items.map((item) => (
          <SidebarItem
            key={item.id}
            item={item}
            iconType={itemType}
            isSelected={selectedItemId === item.id && selectedItemType === itemType}
            onSelect={() => onSelect(item.id)}
            onDelete={() => onDelete(item.id)}
            onDuplicate={() => onDuplicate(item)}
          />
        ))}
        {items.length === 0 && (
          <div className="px-2 py-1 text-xs text-muted-foreground/50 italic">No {title.toLowerCase()}</div>
        )}
      </div>
    </div>
  );
}

function SidebarItem({ item, iconType, isSelected, onSelect, onDelete, onDuplicate }) {
  const [showMenu, setShowMenu] = useState(false);

  const getIcon = () => {
    switch (iconType) {
      case 'tool':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
        );
      case 'resource':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        );
      case 'prompt':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={`
        group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors
        ${isSelected ? 'bg-neutral-100' : 'hover:bg-muted'}
      `}
      onClick={onSelect}
    >
      {getIcon()}

      <span className="flex-1 text-sm text-neutral-700 truncate">{item.name}</span>

      <div className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-neutral-200 text-muted-foreground transition-all"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="1" />
            <circle cx="12" cy="5" r="1" />
            <circle cx="12" cy="19" r="1" />
          </svg>
        </button>

        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowMenu(false)}
            />
            <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-border rounded-md shadow-lg py-1 min-w-[120px]">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate();
                  setShowMenu(false);
                }}
                className="w-full px-3 py-1.5 text-left text-sm text-neutral-700 hover:bg-neutral-100 flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Duplicate
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                  setShowMenu(false);
                }}
                className="w-full px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
                Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
