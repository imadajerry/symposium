import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Loader, Send } from 'lucide-react';
import { useData } from '../../context';
import type { Message } from '../../types';

const LlmDialog: React.FC = () => {
  const { conversations, startLlmConversation, sendConversationMessage } = useData();
  const [draft, setDraft] = useState('');
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isWaiting, setIsWaiting] = useState(false);
  const [optimisticMessage, setOptimisticMessage] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const llmConversations = conversations.filter((conversation) => conversation.scope === 'llm');
  const activeConversation = useMemo(
    () => llmConversations.find((conversation) => conversation.id === activeConversationId) ?? llmConversations[0],
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

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.trim() || isWaiting) return;

    const content = draft;
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
      const conversation = activeConversation ?? await startLlmConversation(content.slice(0, 60));
      setActiveConversationId(conversation.id);
      await sendConversationMessage(conversation.id, content);
    } catch {
      // On error the optimistic message stays but we stop waiting
    } finally {
      setIsWaiting(false);
    }
  };

  return (
    <div className="glass-panel p-4">
      <h3 className="font-bold text-gray-700 flex items-center gap-2 mb-3">
        <Bot className="w-4 h-4 text-blue-500" />
        LLM Help
      </h3>
      <div className="max-h-40 overflow-y-auto space-y-2 mb-3 text-sm">
        {displayMessages.length ? (
          <>
            {displayMessages.map((message) => (
              <div
                key={message.id}
                className={message.senderType === 'llm' ? 'bg-blue-50 rounded-md p-2' : 'bg-white/70 rounded-md p-2'}
              >
                <p className="text-xs font-medium text-gray-500 mb-1">
                  {message.senderType === 'llm' ? 'LLM' : message.senderName ?? 'You'}
                </p>
                <p className="text-gray-700">{message.content}</p>
              </div>
            ))}
            {isWaiting && (
              <div className="bg-blue-50 rounded-md p-2 flex items-center gap-2">
                <Loader className="w-3 h-3 animate-spin text-blue-500" />
                <p className="text-xs text-blue-500">LLM is thinking…</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        ) : (
          <p className="text-gray-400">Ask a subject-related question.</p>
        )}
      </div>
      <form onSubmit={handleSend} className="flex gap-2">
        <input
          className="input-glass text-sm"
          placeholder="Ask the LLM..."
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          disabled={isWaiting}
        />
        <button type="submit" className="btn-primary px-3" title="Send to LLM" disabled={isWaiting || !draft.trim()}>
          {isWaiting ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </div>
  );
};

export default LlmDialog;
