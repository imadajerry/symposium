import React, { useState } from 'react';
import classNames from 'classnames';
import { TrendingUp, AlertCircle, CheckCircle2, BarChart2 } from 'lucide-react';
import { useData } from '../../context';
import type { UnderstandingLevel } from '../../types';

const LEVELS: Array<{ value: UnderstandingLevel; label: string; score: number; color: string }> = [
  { value: 'lost',      label: 'Lost',      score: 1, color: 'border-red-300 hover:bg-red-50 data-[active=true]:bg-red-100 data-[active=true]:ring-red-400' },
  { value: 'basic',     label: 'Basic',     score: 2, color: 'border-orange-300 hover:bg-orange-50 data-[active=true]:bg-orange-100 data-[active=true]:ring-orange-400' },
  { value: 'okay',      label: 'Okay',      score: 3, color: 'border-yellow-300 hover:bg-yellow-50 data-[active=true]:bg-yellow-100 data-[active=true]:ring-yellow-400' },
  { value: 'confident', label: 'Confident', score: 4, color: 'border-blue-300 hover:bg-blue-50 data-[active=true]:bg-blue-100 data-[active=true]:ring-blue-400' },
  { value: 'mastered',  label: 'Mastered',  score: 5, color: 'border-green-300 hover:bg-green-50 data-[active=true]:bg-green-100 data-[active=true]:ring-green-400' },
];

const SentimentWidget: React.FC = () => {
  const {
    currentUser,
    activeCourseId,
    submitUnderstanding,
    understandingAnalytics,
    syllabusTopics,       // improvement 1: use canonical topics from context
  } = useData();

  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [tags, setTags] = useState('');
  const [lastSubmission, setLastSubmission] = useState<UnderstandingLevel | null>(null);

  // Improvement 1: group topics by module for a richer select UX
  const groupedTopics = syllabusTopics.reduce<Record<string, typeof syllabusTopics>>((acc, t) => {
    const key = t.moduleTitle ?? 'General';
    (acc[key] ??= []).push(t);
    return acc;
  }, {});

  const handleSubmit = async (level: UnderstandingLevel) => {
    if (!activeCourseId) return;
    const canonical = syllabusTopics.find((t) => t.id === selectedTopicId);
    const topicName = isCustom ? customTopic.trim() : (canonical?.topicName ?? '');
    if (!topicName) return;

    await submitUnderstanding({
      topic: topicName,
      topicId: isCustom ? null : (canonical?.id ?? null),  // improvement 1: send topicId
      level,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
    });
    setLastSubmission(level);
    setSelectedTopicId('');
    setCustomTopic('');
    setTags('');
    setIsCustom(false);
    setTimeout(() => setLastSubmission(null), 3000);
  };

  // ---------- Teacher / Admin view ----------
  if (currentUser.role === 'teacher' || currentUser.role === 'admin') {
    const average = understandingAnalytics?.averageScore?.toFixed(1) ?? 'N/A';
    const weakTopic = understandingAnalytics?.topics?.[0];
    // Improvement 3: participation rate
    const participation = understandingAnalytics?.participationRate != null
      ? `${Math.round(understandingAnalytics.participationRate * 100)}%`
      : '—';
    // Improvement 3: weekly trend (last 4 weeks)
    const trend = understandingAnalytics?.weeklyTrend?.slice(-4) ?? [];

    return (
      <div className="glass-panel p-4 mt-4 space-y-3">
        <h3 className="font-bold text-gray-700 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-purple-500" />
          Class Understanding
        </h3>

        {/* Score + participation */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-2xl font-bold">{average}</span>
            <span className="text-xs text-gray-500 ml-1">/ 5.0</span>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs text-gray-500">Participation</span>
            <span className="text-sm font-semibold text-indigo-600">{participation}</span>
          </div>
        </div>

        {/* Score bar */}
        <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-red-400 to-green-400 transition-all duration-500"
            style={{ width: `${((Number(average) || 0) / 5) * 100}%` }}
          />
        </div>

        {/* Weak topic alert */}
        {weakTopic && weakTopic.averageScore <= 2.5 && (
          <div className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full border border-red-200 w-fit">
            <AlertCircle className="w-3 h-3" />
            Weak: {weakTopic.topic}
          </div>
        )}

        {/* Improvement 3: weekly trend mini-chart */}
        {trend.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <BarChart2 className="w-3 h-3" /> 4-Week Trend
            </p>
            <div className="flex items-end gap-1 h-8">
              {trend.map((w) => (
                <div key={w.weekStart} className="flex-1 flex flex-col items-center gap-0.5" title={`${w.weekStart}: ${w.averageScore.toFixed(1)}`}>
                  <div
                    className="w-full rounded-t bg-indigo-400 transition-all"
                    style={{ height: `${(w.averageScore / 5) * 32}px` }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top tags */}
        <div className="flex flex-wrap gap-2">
          {understandingAnalytics?.tags.slice(0, 6).map((tag) => (
            <span key={tag.tag} className="text-xs bg-white/70 border border-white px-2 py-1 rounded-full">
              {tag.tag} ({tag.count})
            </span>
          ))}
        </div>
      </div>
    );
  }

  // ---------- Student view ----------
  if (currentUser.role === 'student') {
    const hasTopics = syllabusTopics.length > 0;
    const currentTopicName = isCustom
      ? customTopic
      : (syllabusTopics.find((t) => t.id === selectedTopicId)?.topicName ?? '');
    const canSubmit = currentTopicName.trim().length > 0;

    return (
      <div className="glass-panel p-4 mt-4">
        <p className="text-sm font-semibold text-gray-600 mb-3">Share your understanding</p>

        {/* Topic selector — improvement 1: uses canonical syllabusTopics */}
        {hasTopics && !isCustom ? (
          <div className="mb-2">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Topic from Syllabus</label>
            <select
              className="input-glass text-sm w-full bg-white/80 border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={selectedTopicId}
              onChange={(e) => {
                if (e.target.value === '__custom__') {
                  setIsCustom(true);
                  setSelectedTopicId('');
                } else {
                  setSelectedTopicId(e.target.value);
                }
              }}
            >
              <option value="">— Choose a Topic —</option>
              {Object.entries(groupedTopics).map(([module, topics]) => (
                <optgroup key={module} label={module}>
                  {topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.topicName}
                      {t.coveredOn ? ' ✓' : ''}   {/* improvement 2: covered indicator */}
                    </option>
                  ))}
                </optgroup>
              ))}
              <option value="__custom__">✍️ Enter a custom topic…</option>
            </select>
          </div>
        ) : (
          <div className="mb-2">
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-gray-500">Topic</label>
              {hasTopics && (
                <button
                  type="button"
                  onClick={() => { setIsCustom(false); setCustomTopic(''); }}
                  className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold"
                >
                  Choose from syllabus
                </button>
              )}
            </div>
            <input
              className="input-glass text-sm w-full"
              placeholder="Topic, e.g. Newton's laws"
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
            />
          </div>
        )}

        <input
          className="input-glass mb-3 text-sm"
          placeholder="Tags, comma separated"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />

        <div className="grid grid-cols-5 gap-1.5">
          {LEVELS.map((level) => (
            <button
              key={level.value}
              data-active={lastSubmission === level.value}
              onClick={() => handleSubmit(level.value)}
              disabled={!canSubmit}
              className={classNames(
                'text-xs rounded-md border px-1 py-2 transition-all ring-offset-1',
                level.color,
                !canSubmit && 'opacity-50 cursor-not-allowed'
              )}
              title={level.label}
            >
              <div className="font-bold">{level.score}</div>
              <div className="text-[9px] leading-tight">{level.label}</div>
            </button>
          ))}
        </div>

        {lastSubmission && (
          <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Feedback recorded.
          </p>
        )}
      </div>
    );
  }

  return null;
};

export default SentimentWidget;
