import React from 'react';
import classNames from 'classnames';
import { useData } from '../../context';
import type { Role } from '../../types';

const RoleSwitcher: React.FC = () => {
  const { currentUser } = useData();
  const roles: Role[] = ['student', 'teacher', 'admin'];

  return (
    <div className="fixed top-4 right-4 z-50 glass-panel p-2 flex gap-2">
      {roles.map((role) => (
        <button
          key={role}
          type="button"
          disabled
          className={classNames(
            'px-3 py-1 rounded-md text-sm capitalize transition-all cursor-default',
            currentUser.role === role
              ? 'bg-blue-500 text-white shadow-md'
              : 'text-gray-400'
          )}
        >
          {role}
        </button>
      ))}
    </div>
  );
};

export default RoleSwitcher;
