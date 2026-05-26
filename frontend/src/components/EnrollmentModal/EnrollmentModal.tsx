import React, { useCallback, useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import {
  GraduationCap,
  Loader,
  Search,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import type { Course, EnrolledUser, UserSummary } from '../../types';
import { api } from '../../utils/api';
import { logger } from '../../utils/config';

interface EnrollmentModalProps {
  course: Course;
  onClose: () => void;
}

const ROLE_COLORS: Record<string, string> = {
  student: 'bg-blue-100 text-blue-700',
  teacher: 'bg-emerald-100 text-emerald-700',
  admin: 'bg-purple-100 text-purple-700',
};

const EnrollmentModal: React.FC<EnrollmentModalProps> = ({ course, onClose }) => {
  const [tab, setTab] = useState<'enrolled' | 'add'>('enrolled');
  const [enrolled, setEnrolled] = useState<EnrolledUser[]>([]);
  const [searchResults, setSearchResults] = useState<UserSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingEnrolled, setIsLoadingEnrolled] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3000);
  };

  const loadEnrolled = useCallback(async () => {
    setIsLoadingEnrolled(true);
    try {
      setEnrolled(await api.enrollments(course.id));
    } catch (err) {
      logger.error('Failed to load enrollments', err);
    } finally {
      setIsLoadingEnrolled(false);
    }
  }, [course.id]);

  useEffect(() => {
    loadEnrolled();
  }, [loadEnrolled]);

  useEffect(() => {
    if (tab === 'add') setTimeout(() => searchRef.current?.focus(), 50);
  }, [tab]);

  // Debounced search
  useEffect(() => {
    if (tab !== 'add') return;
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        setSearchResults(await api.users(searchQuery));
      } catch (err) {
        logger.error('Failed to search users', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, tab]);

  const handleEnroll = async (user: UserSummary) => {
    setActionLoading(user.id);
    try {
      await api.enroll(course.id, user.id, user.role === 'teacher' ? 'teacher' : 'student');
      await loadEnrolled();
      showFeedback('success', `${user.name} enrolled successfully`);
    } catch (err) {
      showFeedback('error', `Failed to enroll ${user.name}`);
      logger.error('Enroll failed', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnenroll = async (user: EnrolledUser) => {
    setActionLoading(user.id);
    try {
      await api.unenroll(course.id, user.id);
      await loadEnrolled();
      showFeedback('success', `${user.name} removed from subject`);
    } catch (err) {
      showFeedback('error', `Failed to remove ${user.name}`);
      logger.error('Unenroll failed', err);
    } finally {
      setActionLoading(null);
    }
  };

  const enrolledIds = new Set(enrolled.map((e) => e.id));

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="glass-panel w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
        {/* ── Header ── */}
        <div className="flex items-start justify-between p-6 border-b border-gray-200/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-xl">
              <GraduationCap className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">Manage Enrollment</h2>
              <p className="text-sm text-gray-500 truncate max-w-xs">{course.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Feedback Toast ── */}
        {feedback && (
          <div
            className={classNames(
              'mx-6 mt-4 px-4 py-2.5 rounded-lg text-sm font-medium transition-all shrink-0',
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            )}
          >
            {feedback.message}
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="flex gap-1 px-6 pt-4 shrink-0">
          {[
            { key: 'enrolled' as const, label: 'Enrolled Members', icon: Users, count: enrolled.length },
            { key: 'add' as const, label: 'Add Students', icon: UserPlus, count: null },
          ].map(({ key, label, icon: Icon, count }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={classNames(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
                tab === key
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
              {count !== null && (
                <span
                  className={classNames(
                    'text-xs px-1.5 py-0.5 rounded-full font-semibold',
                    tab === key ? 'bg-white/25 text-white' : 'bg-gray-200 text-gray-600'
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto p-6 pt-4 space-y-3">
          {tab === 'enrolled' ? (
            /* ─ Enrolled list ─ */
            isLoadingEnrolled ? (
              <div className="flex items-center justify-center py-12 text-gray-400">
                <Loader className="w-6 h-6 animate-spin mr-2" />
                Loading members…
              </div>
            ) : enrolled.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No members enrolled yet</p>
                <p className="text-sm mt-1">Switch to "Add Students" to enroll someone.</p>
              </div>
            ) : (
              enrolled.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 bg-white/70 rounded-xl px-4 py-3 border border-gray-100 hover:border-blue-200 transition-colors group"
                >
                  <span className="text-2xl shrink-0">{member.avatar}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm truncate">{member.name}</p>
                    <p className="text-xs text-gray-500 truncate">{member.email}</p>
                  </div>
                  <span
                    className={classNames(
                      'text-xs font-semibold px-2.5 py-1 rounded-full capitalize shrink-0',
                      ROLE_COLORS[member.enrollmentRole] ?? 'bg-gray-100 text-gray-600'
                    )}
                  >
                    {member.enrollmentRole}
                  </span>
                  <button
                    onClick={() => handleUnenroll(member)}
                    disabled={actionLoading === member.id}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-40 shrink-0"
                    title={`Remove ${member.name}`}
                  >
                    {actionLoading === member.id ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ))
            )
          ) : (
            /* ─ Add students ─ */
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or email…"
                  className="input-glass pl-10 w-full"
                />
                {isSearching && (
                  <Loader className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                )}
              </div>

              {searchResults.length === 0 && !isSearching ? (
                <div className="text-center py-10 text-gray-400">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Start typing to find users</p>
                </div>
              ) : (
                searchResults.map((user) => {
                  const alreadyEnrolled = enrolledIds.has(user.id);
                  return (
                    <div
                      key={user.id}
                      className={classNames(
                        'flex items-center gap-3 rounded-xl px-4 py-3 border transition-colors',
                        alreadyEnrolled
                          ? 'bg-gray-50 border-gray-100 opacity-60'
                          : 'bg-white/70 border-gray-100 hover:border-blue-200'
                      )}
                    >
                      <span className="text-2xl shrink-0">{user.avatar}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 text-sm truncate">{user.name}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                      <span
                        className={classNames(
                          'text-xs font-semibold px-2.5 py-1 rounded-full capitalize shrink-0',
                          ROLE_COLORS[user.role] ?? 'bg-gray-100 text-gray-600'
                        )}
                      >
                        {user.role}
                      </span>
                      {alreadyEnrolled ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium shrink-0 px-2">
                          <UserCheck className="w-4 h-4" />
                          Enrolled
                        </span>
                      ) : (
                        <button
                          onClick={() => handleEnroll(user)}
                          disabled={actionLoading === user.id}
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-60 shrink-0"
                        >
                          {actionLoading === user.id ? (
                            <Loader className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <UserPlus className="w-3.5 h-3.5" />
                          )}
                          Enroll
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnrollmentModal;
