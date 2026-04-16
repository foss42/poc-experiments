import { useState } from 'react';
import { MainLayout } from './components/Layout/MainLayout';
import { EvalProvider } from './context/EvalContext';
import { ResultsDashboard } from './pages/ResultsDashboard';
import { EvalForge } from './pages/EvalForge';
import { MCPPanel } from './pages/MCPPanel';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

// Only 3 working views — Datasets and Leaderboard removed (no implementation)
type ViewType = 'dashboard' | 'forge' | 'mcp';

function App() {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <ErrorBoundary><ResultsDashboard /></ErrorBoundary>;
      case 'forge':     return <ErrorBoundary><EvalForge /></ErrorBoundary>;
      case 'mcp':       return <ErrorBoundary><MCPPanel /></ErrorBoundary>;
      default:          return <ErrorBoundary><ResultsDashboard /></ErrorBoundary>;
    }
  };

  return (
    <EvalProvider>
      <MainLayout onViewChange={(view: any) => setCurrentView(view)} currentView={currentView}>
        {renderView()}
      </MainLayout>
    </EvalProvider>
  );
}

export default App;
