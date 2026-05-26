import React, { useState } from 'react';
import { MessageCircle, Send, CheckCircle } from 'lucide-react';
import { useData } from '../../context';

const QuestionFeed: React.FC = () => {
  const { questions, activeCourseId, currentUser, addQuestion, addReply } = useData();
  const [newQText, setNewQText] = useState('');
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});

  const filteredQuestions = questions.filter((q) => (q.courseId ?? q.subjectId) === activeCourseId);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQText.trim() || !activeCourseId) return;
    await addQuestion(activeCourseId, newQText);
    setNewQText('');
  };

  const handleReply = async (qid: string) => {
    if (!replyText[qid]?.trim()) return;
    await addReply(qid, replyText[qid]);
    setReplyText((prev) => ({ ...prev, [qid]: '' }));
  };

  return (
    <div className="flex flex-col h-full bg-white/50 rounded-2xl overflow-hidden border border-white/50 shadow-sm relative">
      <div className="p-4 border-b border-gray-200/50 bg-white/30 backdrop-blur-sm flex justify-between items-center">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-emerald-500" />
          Subject Q&A
        </h2>
        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Async</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filteredQuestions.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <p>No questions yet. Be the first to ask.</p>
          </div>
        ) : (
          filteredQuestions.map((q) => (
            <div key={q.id} className="glass-panel p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs">
                    {q.authorName.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="font-medium text-sm text-gray-700">{q.authorName}</span>
                  <span className="text-xs text-gray-400">{q.timestamp.toLocaleTimeString()}</span>
                </div>
                {q.isAnswered && <CheckCircle className="w-4 h-4 text-green-500" />}
              </div>
              <p className="text-gray-800 mb-3">{q.content}</p>

              <div className="space-y-2 pl-4 border-l-2 border-indigo-100">
                {q.replies.map((r) => (
                  <div key={r.id} className="bg-white/40 p-2 rounded-md text-sm">
                    <p className="font-semibold text-xs text-indigo-600 mb-1 flex items-center gap-1">
                      {(r.authorRole ?? r.role) === 'teacher' && 'Teacher'} {r.authorName}
                    </p>
                    <p className="text-gray-700">{r.content}</p>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  placeholder="Add a reply..."
                  className="input-glass py-1 text-sm bg-white/30"
                  value={replyText[q.id] || ''}
                  onChange={(e) => setReplyText((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && handleReply(q.id)}
                />
                <button
                  onClick={() => handleReply(q.id)}
                  className="bg-indigo-50 text-indigo-600 p-1.5 rounded-md hover:bg-indigo-100"
                  title="Send reply"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {currentUser.role === 'student' && (
        <div className="p-4 bg-white/60 border-t border-white/50">
          <form onSubmit={handleAsk} className="flex gap-2">
            <input
              type="text"
              className="input-glass"
              placeholder="Type your question here..."
              value={newQText}
              onChange={(e) => setNewQText(e.target.value)}
            />
            <button type="submit" className="btn-primary flex items-center gap-2">
              Ask <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default QuestionFeed;
