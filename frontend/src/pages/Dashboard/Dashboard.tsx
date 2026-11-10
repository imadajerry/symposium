import React, { useState } from 'react';
import { Plus, Bot, X } from 'lucide-react';
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
  const { canManageCourses } = useAuth();
  const { isLoading, error } = useData();
  const [showCourseUpload, setShowCourseUpload] = useState(false);
  const [activeTab, setActiveTab] = useState<'learning' | 'discussions' | 'insights'>('learning');
  const [isLlmOpen, setIsLlmOpen] = useState(false);

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col gap-4 max-w-[1600px] mx-auto relative">
      <Header onAdminClick={onAdminClick} />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Action Bar & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 mb-2">
        <div className="flex items-center gap-6 overflow-x-auto">
          <button 
            onClick={() => setActiveTab('learning')}
            className={`whitespace-nowrap pb-3 px-1 font-medium text-sm transition-colors border-b-2 ${activeTab === 'learning' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Learning Material
          </button>
          <button 
            onClick={() => setActiveTab('discussions')}
            className={`whitespace-nowrap pb-3 px-1 font-medium text-sm transition-colors border-b-2 ${activeTab === 'discussions' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Discussions & Q&A
          </button>
          <button 
            onClick={() => setActiveTab('insights')}
            className={`whitespace-nowrap pb-3 px-1 font-medium text-sm transition-colors border-b-2 ${activeTab === 'insights' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Insights
          </button>
        </div>

        {/* Add Course Button (Teachers/Admins only) */}
        {canManageCourses && (
          <div className="flex justify-end pb-2">
            <button
              onClick={() => setShowCourseUpload(true)}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Course
            </button>
          </div>
        )}
      </div>

      <main className="flex-1 min-h-[700px]">
        {activeTab === 'learning' && (
          <div className="h-full animate-in fade-in duration-500">
            <CourseViewer />
          </div>
        )}

        {activeTab === 'discussions' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-280px)] min-h-[600px] animate-in fade-in duration-500">
            <div className="lg:col-span-8 h-full flex flex-col">
              {isLoading ? (
                <div className="glass-panel p-6 text-gray-500">Loading backend data...</div>
              ) : (
                <QuestionFeed />
              )}
            </div>
            <div className="lg:col-span-4 h-full flex flex-col gap-4 overflow-y-auto">
              {!isLoading && <PeerThreads />}
            </div>
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
            {isLoading ? (
              <div className="glass-panel p-6 text-gray-500">Loading backend data...</div>
            ) : (
              <SentimentWidget />
            )}
          </div>
        )}
      </main>

      {/* Floating LLM Dialog */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {isLlmOpen && (
          <div className="w-80 sm:w-96 shadow-2xl rounded-2xl overflow-hidden bg-white/50 backdrop-blur-xl border border-white/60 mb-4 animate-in slide-in-from-bottom-4 duration-300 relative">
            <LlmDialog pageContext={activeTab} onClose={() => setIsLlmOpen(false)} />
          </div>
        )}
        <button 
          onClick={() => setIsLlmOpen(!isLlmOpen)}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30 hover:scale-105 transition-all duration-300 ${isLlmOpen ? 'bg-gray-800 text-white shadow-gray-500/30 rotate-180' : 'btn-primary'}`}
          title="AI Learning Assistant"
        >
          {isLlmOpen ? <X className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
        </button>
      </div>

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
