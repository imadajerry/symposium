import React, { useState } from 'react';
import { Send, Users } from 'lucide-react';
import { useData } from '../../context';

const PeerThreads: React.FC = () => {
  const { currentUser, peerThreads, addPeerThread, addPeerReply } = useData();
  const [title, setTitle] = useState('');
  const [replyText, setReplyText] = useState<Record<string, string>>({});

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    await addPeerThread(title);
    setTitle('');
  };

  const handleReply = async (threadId: string) => {
    if (!replyText[threadId]?.trim()) return;
    await addPeerReply(threadId, replyText[threadId]);
    setReplyText((prev) => ({ ...prev, [threadId]: '' }));
  };

  return (
    <div className="glass-panel p-4">
      <h3 className="font-bold text-gray-700 flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-emerald-500" />
        Peer Threads
      </h3>
      {currentUser.role === 'student' && (
        <form onSubmit={handleCreate} className="flex gap-2 mb-3">
          <input
            className="input-glass text-sm"
            placeholder="Start a general student thread"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <button type="submit" className="btn-primary px-3" title="Create thread">
            <Send className="w-4 h-4" />
          </button>
        </form>
      )}
      <div className="max-h-44 overflow-y-auto space-y-3 text-sm">
        {peerThreads.length === 0 ? (
          <p className="text-gray-400">No peer threads yet.</p>
        ) : (
          peerThreads.map((thread) => (
            <div key={thread.id} className="rounded-md bg-white/70 p-3">
              <p className="font-semibold text-gray-700">{thread.title}</p>
              <p className="text-xs text-gray-400 mb-2">Started by {thread.ownerName}</p>
              {thread.messages.slice(-2).map((message) => (
                <p key={message.id} className="text-gray-600 border-l-2 border-emerald-100 pl-2 mb-1">
                  {message.content}
                </p>
              ))}
              <div className="flex gap-2 mt-2">
                <input
                  className="input-glass py-1 text-sm"
                  placeholder="Reply"
                  value={replyText[thread.id] ?? ''}
                  onChange={(event) => setReplyText((prev) => ({ ...prev, [thread.id]: event.target.value }))}
                />
                <button onClick={() => handleReply(thread.id)} className="bg-emerald-50 text-emerald-700 p-1.5 rounded-md">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PeerThreads;
