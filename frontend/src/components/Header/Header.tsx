import React from 'react';
import { useAuth } from '../../context';
import { LogOut, Shield } from 'lucide-react';

interface HeaderProps {
  onAdminClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onAdminClick }) => {
  const { user, logout } = useAuth();

  return (
    <header className="mb-6 flex items-center justify-between glass-panel px-6 py-3 rounded-2xl sticky top-4 z-40 shadow-sm border border-white/50">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30 font-bold text-lg">
          S
        </div>
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent leading-tight">
            Symposium
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 pr-4 border-r border-gray-200">
          <span className="text-2xl">{user?.avatar}</span>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-gray-800">{user?.name}</p>
            <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
          </div>
        </div>

        {user?.role === 'admin' && onAdminClick && (
          <button
            onClick={onAdminClick}
            className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-colors flex items-center gap-2"
            title="Admin Dashboard"
          >
            <Shield className="w-5 h-5" />
            <span className="text-sm font-medium hidden md:block">Admin</span>
          </button>
        )}
        
        <button
          onClick={logout}
          className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors flex items-center gap-2"
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium hidden md:block">Logout</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
