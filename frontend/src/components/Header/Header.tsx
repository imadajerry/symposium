import React from 'react';
import { useData } from '../../context';

const Header: React.FC = () => {
  const { currentUser } = useData();

  return (
    <header className="mb-4">
      <h1 className="text-2xl font-bold flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
          Q
        </div>
        <span className="bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent">
          QuickQuery
        </span>
      </h1>
      <p className="text-gray-500 text-sm ml-14">Real-time learning doubts & feedback</p>
      <div className="mt-2 text-xs text-blue-500 font-medium ml-14 px-2 py-1 bg-blue-50 inline-block rounded-md">
        Logged in as: {currentUser.role.toUpperCase()}
      </div>
    </header>
  );
};

export default Header;
