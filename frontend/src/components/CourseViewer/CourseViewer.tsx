import React, { useState } from 'react';
import classNames from 'classnames';
import { AlertTriangle, BookOpen, Check, FileText, Loader, Trash2, Users } from 'lucide-react';
import { useAuth, useData } from '../../context';
import EnrollmentModal from '../EnrollmentModal';
import GeneratedContentViewer from '../GeneratedContentViewer';

const CourseViewer: React.FC = () => {
  const { canManageCourses } = useAuth();
  const {
    courses,
    activeCourseId,
    setActiveCourseId,
    generatedContent,
    syllabi,
    materials,
    approveGeneratedContent,
    removeCourse,
  } = useData();
  const activeCourse = courses.find((c) => c.id === activeCourseId);
  const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteCourse = async () => {
    if (!activeCourse) return;
    setIsDeleting(true);
    try {
      await removeCourse(activeCourse.id);
      setConfirmDelete(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white/50 rounded-2xl overflow-hidden border border-white/50 shadow-sm">
      <div className="p-4 border-b border-gray-200/50 bg-white/30 backdrop-blur-sm">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-500" />
          Subject Material
        </h2>
        <div className="flex gap-2 mt-2 overflow-x-auto pb-2">
          {courses.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCourseId(c.id)}
              className={classNames(
                'px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors border',
                activeCourseId === c.id
                  ? 'bg-blue-100 text-blue-700 border-blue-200'
                  : 'bg-white text-gray-600 border-transparent hover:bg-gray-50'
              )}
            >
              {c.title}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto bg-gray-50/50">
        {activeCourse ? (
          <div className="w-full max-w-4xl mx-auto space-y-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-gray-800 truncate">{activeCourse.title}</h1>
                <p className="text-gray-500 mt-2">{activeCourse.description}</p>
              </div>
              {canManageCourses && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setShowEnrollmentModal(true)}
                    className="btn-secondary flex items-center gap-2 text-sm bg-white/70 hover:bg-white px-4 py-2 rounded-xl"
                  >
                    <Users className="w-4 h-4" />
                    Manage Enrollment
                  </button>

                  {confirmDelete ? (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-1.5">
                      <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                      <span className="text-xs text-red-700 font-medium">Delete this course?</span>
                      <button
                        onClick={handleDeleteCourse}
                        disabled={isDeleting}
                        className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-60"
                      >
                        {isDeleting ? <Loader className="w-3 h-3 animate-spin" /> : null}
                        {isDeleting ? 'Deleting…' : 'Yes, delete'}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(false)}
                        disabled={isDeleting}
                        className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-200"
                      title="Delete this course"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>

            <section className="glass-panel p-5">
              <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                Uploaded Syllabi
              </h3>
              {syllabi.length === 0 ? (
                <p className="text-sm text-gray-400">No syllabus uploaded for this subject yet.</p>
              ) : (
                <div className="space-y-2">
                  {syllabi.map((syllabus) => (
                    <div key={syllabus.id} className="flex flex-col gap-1.5 rounded-xl border border-gray-100 bg-white/70 px-4 py-3 text-sm shadow-sm">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-700">{syllabus.fileName}</span>
                        {syllabus.status === 'processing' ? (
                          <span className="flex items-center gap-2 text-amber-600 font-medium">
                            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Processing with AI…
                          </span>
                        ) : syllabus.status === 'failed' ? (
                          <span className="text-red-500 font-medium">Failed</span>
                        ) : (
                          <span className="text-green-600 font-medium">✓ Processed</span>
                        )}
                      </div>
                      
                      {syllabus.charCount !== undefined && syllabus.charCount > 0 && (
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-0.5">
                          <span>Length: <strong className="text-gray-700">{syllabus.charCount.toLocaleString()}</strong> characters</span>
                          <span>•</span>
                          {syllabus.isTruncated ? (
                            <span className="text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              ⚠️ Truncated to 12,000 characters for AI processing
                            </span>
                          ) : (
                            <span className="text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                              Under 12,000 character limit (Full content processed)
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="glass-panel p-5">
              <h3 className="font-semibold text-gray-700 mb-3">Generated Content</h3>
              {generatedContent.length === 0 ? (
                <p className="text-sm text-gray-400">Generated content will appear here after syllabus processing.</p>
              ) : (
                <div className="space-y-3">
                  {generatedContent.map((content) => (
                    <div key={content.id} className="rounded-xl border border-gray-200/60 bg-white/80 p-4 text-sm space-y-3">
                      <div className="flex justify-between items-center gap-3">
                        <span
                          className={classNames(
                            'text-xs font-semibold px-2.5 py-1 rounded-full capitalize',
                            content.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-700'
                              : content.status === 'ready_for_review'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-gray-100 text-gray-600'
                          )}
                        >
                          {content.status.replaceAll('_', ' ')}
                        </span>
                        {content.status === 'ready_for_review' && canManageCourses && (
                          <button
                            onClick={() => approveGeneratedContent(content.id)}
                            className="text-green-700 bg-green-50 border border-green-200 px-3 py-1 rounded-lg flex items-center gap-1.5 text-xs font-semibold hover:bg-green-100 transition-colors"
                          >
                            <Check className="w-3 h-3" />
                            Approve & Publish
                          </button>
                        )}
                      </div>
                      <GeneratedContentViewer contentJson={content.contentJson} />
                    </div>
                  ))}
                </div>
              )}
            </section>

            {materials.length > 0 && (
              <section className="glass-panel p-5">
                <h3 className="font-semibold text-gray-700 mb-3">Materials</h3>
                <div className="space-y-2">
                  {materials.map((material) => (
                    <div key={material.id} className="rounded-md bg-white/70 px-3 py-2 text-sm">
                      {material.title}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : (
          <p className="text-gray-400 text-center mt-20">Select or create a subject to view material.</p>
        )}
      </div>

      {showEnrollmentModal && activeCourse && (
        <EnrollmentModal
          course={activeCourse}
          onClose={() => setShowEnrollmentModal(false)}
        />
      )}
    </div>
  );
};

export default CourseViewer;
