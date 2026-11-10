import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Loader, Send, Maximize2, ClipboardList, BarChart2, X } from 'lucide-react';
import { useData } from '../../context';
import type { Message } from '../../types';
import { InteractiveContentRenderer } from './InteractiveContentRenderer';
import { LlmChatWorkspaceModal } from './LlmChatWorkspaceModal';

interface LlmDialogProps {
  pageContext?: string;
  onClose?: () => void;
}

const LlmDialog: React.FC<LlmDialogProps> = ({ pageContext, onClose }) => {
  const { conversations, startLlmConversation, sendConversationMessage } = useData();
  const [draft, setDraft] = useState('');
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isWaiting, setIsWaiting] = useState(false);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const [optimisticMessage, setOptimisticMessage] = useState<Message | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const llmConversations = useMemo(
    () => conversations.filter((conversation) => conversation.scope === 'llm'),
    [conversations]
  );

  const activeConversation = useMemo(
    () => llmConversations.find((conversation) => conversation.id === activeConversationId) ?? null,
    [activeConversationId, llmConversations]
  );


  // Build the display messages: real messages + optimistic user message if pending
  const displayMessages = useMemo(() => {
    const realMessages = activeConversation?.messages ?? [];
    if (optimisticMessage && !realMessages.some((m) => m.content === optimisticMessage.content && m.senderType === 'user')) {
      return [...realMessages, optimisticMessage];
    }
    return realMessages;
  }, [activeConversation, optimisticMessage]);

  // Clear optimistic message once the real conversation catches up
  useEffect(() => {
    if (optimisticMessage && activeConversation?.messages.some(
      (m) => m.content === optimisticMessage.content && m.senderType === 'user'
    )) {
      setOptimisticMessage(null);
    }
  }, [activeConversation, optimisticMessage]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayMessages, isWaiting]);

  const handleSend = async (contentToSend: string) => {
    if (!contentToSend.trim() || isWaiting) return;

    setError(null);
    const content = contentToSend.trim();
    setDraft('');

    // Show the user's message immediately (optimistic)
    setOptimisticMessage({
      id: 'optimistic-' + Date.now(),
      conversationId: activeConversationId ?? '',
      senderId: undefined,
      senderName: 'You',
      senderType: 'user',
      content,
      createdAt: new Date(),
    });

    setIsWaiting(true);
    try {
      const finalContent = pageContext
        ? `[System: User is currently viewing the ${pageContext} tab. Provide relevant context if applicable.]\n${content}`
        : content;

      const conversation = activeConversation ?? await startLlmConversation(content.slice(0, 30));
      setActiveConversationId(conversation.id);
      await sendConversationMessage(conversation.id, finalContent);
    } catch (e) {
      console.error(e);
      setOptimisticMessage(null);
      setError(e instanceof Error ? e.message : 'An error occurred');
    } finally {
      setIsWaiting(false);
    }
  };

  const handleFormSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    handleSend(draft);
  };

  const sidebarSuggestedPrompts: { text: string; label: string; icon: React.ElementType }[] = [
    { text: 'Explain syllabus', label: 'Explain syllabus', icon: ClipboardList },
    { text: 'Explain the exam pattern', label: 'Exam pattern', icon: BarChart2 }
  ];

  return (
    <div className="glass-panel p-4 flex flex-col hover:shadow-md transition-shadow duration-300">
      {/* Header bar with Maximize button */}
      <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
        <h3 className="font-bold text-gray-700 flex items-center gap-1.5 text-xs uppercase tracking-wider">
          <Bot className="w-4 h-4 text-blue-500" />
          AI Learning Assistant
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsWorkspaceOpen(true)}
            className="p-1.5 hover:bg-blue-50 text-blue-500 hover:text-blue-600 rounded-lg transition-colors"
            title="Open Workspace Modal"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
              title="Close Assistant"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Message List */}
      <div className="max-h-56 overflow-y-auto space-y-3 mb-3 text-sm pr-1">
        {displayMessages.length ? (
          <>
            {displayMessages.map((message) => {
              const isLlm = message.senderType === 'llm';
              return (
                <div
                  key={message.id}
                  className={`p-3 rounded-xl border transition-all ${
                    isLlm 
                      ? 'bg-blue-50/50 border-blue-100/50 text-gray-800' 
                      : 'bg-white/90 border-gray-100 text-gray-700 ml-4'
                  }`}
                >
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    {isLlm ? 'AI Assistant' : message.senderName ?? 'You'}
                  </p>
                  {isLlm ? (
                    <InteractiveContentRenderer content={message.content} />
                  ) : (
                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {message.content.replace(/^\[System: .*?\]\n/, '')}
                    </p>
                  )}
                </div>
              );
            })}
            {isWaiting && (
              <div className="bg-blue-50/40 border border-blue-50 rounded-xl p-3 flex items-center gap-2.5">
                <Loader className="w-3.5 h-3.5 animate-spin text-blue-500" />
                <p className="text-xs text-blue-500 font-semibold">AI is formulating answer...</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        ) : (
          <div className="py-4 text-center space-y-2">
            <p className="text-xs text-gray-400">Ask a subject-related question to get started.</p>
            {/* Quick suggested chips */}
            <div className="flex justify-center gap-1.5">
              {sidebarSuggestedPrompts.map((p, idx) => {
                const Icon = p.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSend(p.text)}
                    className="px-2.5 py-1 rounded-full border border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-[11px] font-medium text-gray-500 hover:text-blue-600 transition-all flex items-center gap-1"
                  >
                    <Icon className="w-3 h-3 text-blue-400" />
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-2 px-3 py-2 bg-red-50 border border-red-100 rounded-lg flex items-center justify-between text-xs text-red-600">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="hover:text-red-800">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Input bar */}
      <form onSubmit={handleFormSubmit} className="flex gap-2">
        <input
          className="input-glass text-xs"
          placeholder="Ask the AI Tutor..."
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          disabled={isWaiting}
        />
        <button 
          type="submit" 
          className="btn-primary px-3 rounded-lg" 
          title="Send to LLM" 
          disabled={isWaiting || !draft.trim()}
        >
          {isWaiting ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
        </button>
      </form>

      {/* Expanded Workspace Modal */}
      <LlmChatWorkspaceModal
        isOpen={isWorkspaceOpen}
        onClose={() => setIsWorkspaceOpen(false)}
        conversations={conversations}
        activeConversationId={activeConversationId}
        setActiveConversationId={setActiveConversationId}
        startLlmConversation={startLlmConversation}
        sendConversationMessage={sendConversationMessage}
        isWaiting={isWaiting}
        setIsWaiting={setIsWaiting}
        optimisticMessage={optimisticMessage}
        setOptimisticMessage={setOptimisticMessage}
        error={error}
        setError={setError}
      />
    </div>
  );
};

export default LlmDialog;
