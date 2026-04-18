import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { Canvas } from './components/layout/Canvas';
import { SettingsPage } from './components/settings/SettingsPage';
import { CreateServerModal } from './components/modals/CreateServerModal';
import { CreateToolModal } from './components/modals/CreateToolModal';
import { CreateResourceModal } from './components/modals/CreateResourceModal';
import { CreatePromptModal } from './components/modals/CreatePromptModal';
import { AddNodePicker } from './components/modals/AddNodePicker';
import { ExportServerModal } from './components/modals/ExportServerModal';
import { ImportServerModal } from './components/modals/ImportServerModal';
import { NodeDetailView } from './components/ndv/NodeDetailView';
import { useMcpStore } from './stores/mcpStore';

export default function App() {
  const { isExportServerModalOpen, closeExportServerModal, getExportServer, activeTab } = useMcpStore();
  const exportServer = getExportServer();

  return (
    <div className="h-screen w-screen flex flex-col bg-white overflow-hidden">
      <Header />

      <div className="flex-1 flex overflow-hidden">
        {activeTab !== 'settings' && <Sidebar />}
        {activeTab === 'settings' ? <SettingsPage /> : <Canvas />}
      </div>

      {/* Modals */}
      <CreateServerModal />
      <CreateToolModal />
      <CreateResourceModal />
      <CreatePromptModal />
      <AddNodePicker />
      <ExportServerModal
        isOpen={isExportServerModalOpen}
        onClose={closeExportServerModal}
        server={exportServer}
      />
      <ImportServerModal />

      {/* Node Detail View */}
      <NodeDetailView />
    </div>
  );
}
