import React, { useState } from 'react';
import { AuthProvider, DataProvider, useAuth } from './context';
import { Dashboard, LoginPage, AdminDashboard } from './pages';
import './index.css';

// Protected route wrapper
const AppContent: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [currentView, setCurrentView] = useState<'dashboard' | 'admin'>('dashboard');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-blue-500/30 mx-auto mb-4 animate-pulse">
            Q
          </div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  if (currentView === 'admin' && user?.role === 'admin') {
    return <AdminDashboard onBack={() => setCurrentView('dashboard')} />;
  }

  return (
    <DataProvider>
      <Dashboard onAdminClick={() => setCurrentView('admin')} />
    </DataProvider>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
