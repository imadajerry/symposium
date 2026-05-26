import React, { useState } from 'react';
import classNames from 'classnames';
import { TrendingUp, AlertCircle } from 'lucide-react';
import { useData } from '../../context';
import type { UnderstandingLevel } from '../../types';

const LEVELS: Array<{ value: UnderstandingLevel; label: string; score: number }> = [
  { value: 'lost', label: 'Lost', score: 1 },
  { value: 'basic', label: 'Basic', score: 2 },
  { value: 'okay', label: 'Okay', score: 3 },
  { value: 'confident', label: 'Confident', score: 4 },
  { value: 'mastered', label: 'Mastered', score: 5 },
];

const SentimentWidget: React.FC = () => {
  const { currentUser, activeCourseId, submitUnderstanding, understandingAnalytics } = useData();
  const [topic, setTopic] = useState('');
  const [tags, setTags] = useState('');
  const [lastSubmission, setLastSubmission] = useState<UnderstandingLevel | null>(null);

  const handleSubmit = async (level: UnderstandingLevel) => {
    if (!activeCourseId || !topic.trim()) return;
    await submitUnderstanding({
      topic,
      level,
      tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
    });
    setLastSubmission(level);
    setTopic('');
    setTags('');
    setTimeout(() => setLastSubmission(null), 3000);
  };

  if (currentUser.role === 'teacher' || currentUser.role === 'admin') {
    const average = understandingAnalytics?.averageScore?.toFixed(1) ?? 'N/A';
    const weakTopic = understandingAnalytics?.topics?.[0];

    return (
      <div className="glass-panel p-4 mt-4">
        <h3 className="font-bold text-gray-700 flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-purple-500" />
          Class Understanding
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-2xl font-bold">{average}</span>
            <span className="text-xs text-gray-500 ml-1">/ 5.0</span>
          </div>
          {weakTopic && weakTopic.averageScore <= 2.5 && (
            <div className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full border border-red-200">
              <AlertCircle className="w-3 h-3" />
              {weakTopic.topic}
            </div>
          )}
        </div>
        <div className="h-2 w-full bg-gray-200 rounded-full mt-2 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-red-400 to-green-400 transition-all duration-500"
            style={{ width: `${((Number(average) || 0) / 5) * 100}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {understandingAnalytics?.tags.slice(0, 6).map((tag) => (
            <span key={tag.tag} className="text-xs bg-white/70 border border-white px-2 py-1 rounded-full">
              {tag.tag} ({tag.count})
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (currentUser.role === 'student') {
    return (
      <div className="glass-panel p-4 mt-4">
        <p className="text-sm font-semibold text-gray-600 mb-3">Share your understanding</p>
        <input
          className="input-glass mb-2 text-sm"
          placeholder="Topic, e.g. Newton's laws"
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
        />
        <input
          className="input-glass mb-3 text-sm"
          placeholder="Tags, comma separated"
          value={tags}
          onChange={(event) => setTags(event.target.value)}
        />
        <div className="grid grid-cols-5 gap-2">
          {LEVELS.map((level) => (
            <button
              key={level.value}
              onClick={() => handleSubmit(level.value)}
              disabled={!topic.trim()}
              className={classNames(
                'text-xs rounded-md border px-2 py-2 transition-all',
                lastSubmission === level.value ? 'ring-2 ring-blue-500' : 'bg-white/60 hover:bg-white',
                !topic.trim() && 'opacity-50 cursor-not-allowed'
              )}
              title={level.label}
            >
              {level.score}
            </button>
          ))}
        </div>
        {lastSubmission && <p className="text-xs text-green-600 mt-2">Feedback sent.</p>}
      </div>
    );
  }

  return null;
};

export default SentimentWidget;
