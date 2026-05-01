import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface MainLayoutProps {
  children: React.ReactNode;
  onViewChange: (view: any) => void;
  currentView: string;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children, onViewChange, currentView }) => {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar onViewChange={onViewChange} currentView={currentView} />
      <div style={{ flex: 1, marginLeft: '240px', display: 'flex', flexDirection: 'column' }}>
        <Header />
        <main style={{ padding: '32px', flex: 1 }}>
          {children}
        </main>
      </div>
    </div>
  );
};
