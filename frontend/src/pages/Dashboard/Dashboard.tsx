import React, { useState } from 'react';
import { LogOut, Plus, Shield } from 'lucide-react';
import {
  CourseViewer,
  QuestionFeed,
  SentimentWidget,
  Header,
  CourseUpload,
  LlmDialog,
  PeerThreads,
} from '../../components';
import { useAuth, useData } from '../../context';

interface DashboardProps {
  onAdminClick?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onAdminClick }) => {
  const { user, logout, canManageCourses } = useAuth();
  const { isLoading, error } = useData();
  const [showCourseUpload, setShowCourseUpload] = useState(false);

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col gap-4 max-w-[1600px] mx-auto">
      {/* Top Bar with user info */}
      <div className="fixed top-4 right-4 z-50 glass-panel p-2 flex items-center gap-3">
        <div className="flex items-center gap-2 px-2">
          <span className="text-xl">{user?.avatar}</span>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-700">{user?.name}</p>
            <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
          </div>
        </div>
        {user?.role === 'admin' && onAdminClick && (
          <button
            onClick={onAdminClick}
            className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-colors"
            title="Admin Dashboard"
          >
            <Shield className="w-5 h-5" />
          </button>
        )}
        <button
          onClick={logout}
          className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      <Header />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Add Course Button (Teachers/Admins only) */}
      {canManageCourses && (
        <div className="flex justify-end -mt-2 mb-2">
          <button
            onClick={() => setShowCourseUpload(true)}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Course
          </button>
        </div>
      )}

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-180px)] min-h-[700px]">
        {/* Left Panel: Course Content (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-4 h-full">
          <CourseViewer />
        </div>

        {/* Right Panel: Q&A + Sentiment (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4 h-full">
          {isLoading ? (
            <div className="glass-panel p-6 text-gray-500">Loading backend data...</div>
          ) : (
            <>
              <div className="flex-1 overflow-hidden">
                <QuestionFeed />
              </div>
              <div className="shrink-0 space-y-4">
                <LlmDialog />
                <PeerThreads />
                <SentimentWidget />
              </div>
            </>
          )}
        </div>
      </main>

      {/* Course Upload Modal */}
      {showCourseUpload && (
        <CourseUpload
          onClose={() => setShowCourseUpload(false)}
          onSuccess={() => setShowCourseUpload(false)}
        />
      )}
    </div>
  );
};

export default Dashboard;
