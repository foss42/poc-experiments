import { useState, useRef, useEffect } from 'react';
import { useMcpStore } from '../../stores/mcpStore';
import { CreateTab } from '../sidebar/CreateTab';
import { TestTab } from '../sidebar/TestTab';

export function Sidebar() {
  const { activeTab, setActiveTab } = useMcpStore();

  const [width, setWidth] = useState(256); // w-64 is 256px
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isResizing = useRef(false);

  const startResizing = (e) => {
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const stopResizing = () => {
    isResizing.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  const resize = (e) => {
    if (isResizing.current) {
      let newWidth = e.clientX;
      if (newWidth < 200) newWidth = 200; // Min width
      if (newWidth > 400) newWidth = 400; // Max width
      setWidth(newWidth);
      if (isCollapsed && newWidth > 200) {
        setIsCollapsed(false);
      }
    }
  };

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isCollapsed]);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  if (isCollapsed) {
    return (
      <aside className="w-12 h-full border-r border-border bg-white flex flex-col items-center py-4">
        <button
          onClick={toggleCollapse}
          className="p-2 rounded hover:bg-muted text-muted-foreground transition-colors"
          title="Expand Sidebar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="13 17 18 12 13 7"></polyline>
            <polyline points="6 17 11 12 6 7"></polyline>
          </svg>
        </button>
      </aside>
    );
  }

  return (
    <aside
      style={{ width: `${width}px` }}
      className="h-full border-r border-border bg-white flex flex-col relative shrink-0 transition-[width] duration-75 ease-out"
    >
      {/* Tab buttons */}
      <div className="flex border-b border-border pl-1 pr-1">
        <button
          onClick={toggleCollapse}
          className="px-2 mr-1 text-muted-foreground hover:text-neutral-900 transition-colors flex items-center justify-center shrink-0"
          title="Collapse Sidebar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="11 17 6 12 11 7"></polyline>
            <polyline points="18 17 13 12 18 7"></polyline>
          </svg>
        </button>
        <button
          onClick={() => setActiveTab('create')}
          className={`
            flex-1 px-2 py-3 text-sm font-medium transition-colors
            ${activeTab === 'create'
              ? 'text-neutral-900 border-b-2 border-neutral-900 -mb-px'
              : 'text-muted-foreground hover:text-neutral-600'
            }
          `}
        >
          Create
        </button>
        <button
          onClick={() => setActiveTab('test')}
          className={`
            flex-1 px-2 py-3 text-sm font-medium transition-colors
            ${activeTab === 'test'
              ? 'text-neutral-900 border-b-2 border-neutral-900 -mb-px'
              : 'text-muted-foreground hover:text-neutral-600'
            }
          `}
        >
          Test
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {activeTab === 'create' && <CreateTab />}
        {activeTab === 'test' && <TestTab />}
      </div>

      {/* Resize Handle */}
      <div
        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-neutral-300 group-hover:bg-neutral-300 transition-colors z-10"
        onMouseDown={startResizing}
      />
    </aside>
  );
}
