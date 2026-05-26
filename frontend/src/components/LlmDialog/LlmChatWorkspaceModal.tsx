import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  Send,
  Loader,
  X,
  Plus,
  MessageSquare,
  Sparkles,
  HelpCircle,
  Clock,
  User,
  GraduationCap
} from 'lucide-react';
import type { Message, Conversation } from '../../types';
import { InteractiveContentRenderer } from './InteractiveContentRenderer';

interface LlmChatWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[];
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  startLlmConversation: (title: string) => Promise<Conversation>;
  sendConversationMessage: (conversationId: string, content: string) => Promise<void>;
  isWaiting: boolean;
  setIsWaiting: (waiting: boolean) => void;
}

export const LlmChatWorkspaceModal: React.FC<LlmChatWorkspaceModalProps> = ({
  isOpen,
  onClose,
  conversations,
  activeConversationId,
  setActiveConversationId,
  startLlmConversation,
  sendConversationMessage,
  isWaiting,
  setIsWaiting
}) => {
  const [draft, setDraft] = useState('');
  const [optimisticMessage, setOptimisticMessage] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const llmConversations = useMemo(
    () => conversations.filter((c) => c.scope === 'llm'),
    [conversations]
  );

  const activeConversation = useMemo(
    () => llmConversations.find((c) => c.id === activeConversationId) || null,
    [activeConversationId, llmConversations]
  );

  // Suggested prompt ideas depending on syllabus contexts
  const suggestedPrompts = [
    { text: '📋 Briefly summarize the subject syllabus', label: 'Summary' },
    { text: '🎯 Detail the main learning objectives', label: 'Objectives' },
    { text: '📊 Explain the internal & external exam scheme', label: 'Exam Pattern' },
    { text: '📚 List recommended books & reference resources', label: 'Reference Books' },
    { text: '💡 Generate a 5-week study plan for this subject', label: 'Study Plan' },
    { text: '📝 Create 3 sample practice questions with answers', label: 'Practice Quiz' }
  ];

  // Combine real messages and optimistic user messages
  const displayMessages = useMemo(() => {
    const realMessages = activeConversation?.messages ?? [];
    if (
      optimisticMessage &&
      !realMessages.some((m) => m.content === optimisticMessage.content && m.senderType === 'user')
    ) {
      return [...realMessages, optimisticMessage];
    }
    return realMessages;
  }, [activeConversation, optimisticMessage]);

  // Clear optimistic message once it saves in context
  useEffect(() => {
    if (
      optimisticMessage &&
      activeConversation?.messages.some((m) => m.content === optimisticMessage.content && m.senderType === 'user')
    ) {
      setOptimisticMessage(null);
    }
  }, [activeConversation, optimisticMessage]);

  // Auto-scroll when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayMessages, isWaiting]);

  // Focus textarea when conversation changes
  useEffect(() => {
    if (isOpen) {
      textareaRef.current?.focus();
    }
  }, [isOpen, activeConversationId]);

  if (!isOpen) return null;

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isWaiting) return;

    setDraft('');
    const content = textToSend.trim();

    // Show message optimistically
    setOptimisticMessage({
      id: 'optimistic-' + Date.now(),
      conversationId: activeConversationId ?? '',
      senderId: undefined,
      senderName: 'You',
      senderType: 'user',
      content,
      createdAt: new Date()
    });

    setIsWaiting(true);
    try {
      let targetConv = activeConversation;
      if (!targetConv) {
        // Create new conversation titled with first message slice
        const title = content.length > 30 ? content.slice(0, 30) + '...' : content;
        targetConv = await startLlmConversation(title);
        setActiveConversationId(targetConv.id);
      }
      await sendConversationMessage(targetConv.id, content);
    } catch (e) {
      console.error('Failed to send LLM message', e);
    } finally {
      setIsWaiting(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend(draft);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(draft);
    }
  };

  const startNewChat = () => {
    setActiveConversationId(null);
    setOptimisticMessage(null);
    setDraft('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-6xl h-[85vh] bg-white rounded-2xl shadow-2xl flex border border-gray-200 overflow-hidden glass-panel">
        
        {/* Sidebar: LLM Conversations list */}
        <div className="w-72 border-r border-gray-200/80 flex flex-col bg-slate-50/70 shrink-0">
          <div className="p-4 border-b border-gray-200/80 flex items-center justify-between">
            <span className="font-bold text-gray-700 flex items-center gap-1.5 text-sm">
              <Bot className="w-4 h-4 text-blue-500" />
              Chat Assistant
            </span>
            <button
              onClick={startNewChat}
              className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors flex items-center justify-center"
              title="New Conversation"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Conversations Scroll */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {llmConversations.length === 0 ? (
              <div className="p-4 text-center text-xs text-gray-400">
                No past conversations.
              </div>
            ) : (
              llmConversations.map((conv) => {
                const isActive = conv.id === activeConversationId;
                const lastMsg = conv.messages[conv.messages.length - 1]?.content || 'Empty chat';
                return (
                  <button
                    key={conv.id}
                    onClick={() => {
                      setActiveConversationId(conv.id);
                      setOptimisticMessage(null);
                    }}
                    className={`w-full text-left p-3 rounded-xl transition-all flex items-start gap-2.5 ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-200/50'
                        : 'hover:bg-slate-100 text-gray-600'
                    }`}
                  >
                    <MessageSquare className={`w-4 h-4 mt-0.5 shrink-0 ${isActive ? 'text-white' : 'text-blue-500'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-xs truncate">
                        {conv.title || 'Untitled Chat'}
                      </p>
                      <p className={`text-[10px] truncate mt-0.5 ${isActive ? 'text-blue-100' : 'text-gray-400'}`}>
                        {lastMsg}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
          
          <div className="p-3 border-t border-gray-200/60 bg-gray-100/50 text-[10px] text-gray-400 flex items-center gap-1.5 justify-center">
            <Clock className="w-3.5 h-3.5" />
            <span>History saved per course</span>
          </div>
        </div>

        {/* Main Work Area */}
        <div className="flex-1 flex flex-col bg-white">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-slate-50/40">
            <div>
              <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                {activeConversation ? activeConversation.title : 'New AI Learning Session'}
              </h3>
              <p className="text-xs text-gray-400">
                Ask doubts, generate study guides, and test your knowledge interactively.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
              title="Close Workspace"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50/30">
            {displayMessages.length === 0 ? (
              /* Welcome Interface */
              <div className="h-full flex flex-col items-center justify-center max-w-xl mx-auto text-center space-y-6 animate-fade-in py-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-200/40">
                  <Bot className="w-9 h-9 text-white animate-bounce" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-lg font-bold text-gray-800">
                    Welcome to your AI Tutor Workspace
                  </h2>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Ask me anything about your syllabus. I will format the information into interactive tables, tabs, and code blocks for easy study.
                  </p>
                </div>

                {/* Prompt Cards Grid */}
                <div className="grid grid-cols-2 gap-3 w-full mt-4">
                  {suggestedPrompts.slice(0, 4).map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(p.text)}
                      className="p-4 text-left bg-white border border-gray-200/80 rounded-xl hover:border-blue-400 hover:shadow-md hover:translate-y-[-1px] transition-all group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-semibold mb-2 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <GraduationCap className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-gray-700 block">{p.label}</span>
                      <span className="text-[11px] text-gray-400 mt-1 block line-clamp-2">
                        {p.text}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Conversation Messages list */
              <div className="space-y-4 max-w-4xl mx-auto">
                {displayMessages.map((message) => {
                  const isLlm = message.senderType === 'llm';
                  return (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${isLlm ? 'justify-start' : 'justify-end'}`}
                    >
                      {/* Avatar for AI */}
                      {isLlm && (
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-md">
                          <Bot className="w-4.5 h-4.5 text-white" />
                        </div>
                      )}

                      <div
                        className={`flex flex-col max-w-[85%] ${
                          isLlm ? 'items-start' : 'items-end'
                        }`}
                      >
                        {/* Name header */}
                        <span className="text-[10px] font-semibold text-gray-400 mb-1 px-1">
                          {isLlm ? 'AI Assistant' : 'You'}
                        </span>

                        {/* Speech Bubble */}
                        <div
                          className={`rounded-2xl p-4 shadow-sm border ${
                            isLlm
                              ? 'bg-white border-gray-200 text-gray-800 rounded-tl-none'
                              : 'bg-gradient-to-br from-blue-600 to-indigo-600 border-blue-600 text-white rounded-tr-none'
                          }`}
                        >
                          {isLlm ? (
                            <InteractiveContentRenderer content={message.content} />
                          ) : (
                            <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                          )}
                        </div>
                      </div>

                      {/* Avatar for User */}
                      {!isLlm && (
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 border border-blue-200">
                          <User className="w-4.5 h-4.5 text-blue-600" />
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* AI Thinking Animation */}
                {isWaiting && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-md animate-pulse">
                      <Bot className="w-4.5 h-4.5 text-white" />
                    </div>
                    <div className="flex flex-col items-start max-w-[85%]">
                      <span className="text-[10px] font-semibold text-gray-400 mb-1 px-1">
                        AI Assistant
                      </span>
                      <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-none p-4 shadow-sm min-w-[200px]">
                        <div className="flex items-center gap-2 text-xs text-blue-500 font-semibold mb-2">
                          <Loader className="w-4 h-4 animate-spin" />
                          <span>AI is composing response...</span>
                        </div>
                        <div className="space-y-2 animate-pulse">
                          <div className="h-3 bg-gray-100 rounded w-full" />
                          <div className="h-3 bg-gray-100 rounded w-5/6" />
                          <div className="h-3 bg-gray-100 rounded w-2/3" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Footer Input Area */}
          <div className="p-4 border-t border-gray-200/80 bg-white flex flex-col gap-3">
            {/* Horizontal Scrollable Suggestions Row */}
            <div className="flex gap-2 overflow-x-auto pb-1 max-w-4xl mx-auto w-full no-scrollbar">
              {suggestedPrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(p.text)}
                  disabled={isWaiting}
                  className="px-3 py-1.5 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-full border border-gray-200 hover:border-blue-300 text-xs font-medium transition-all shrink-0 flex items-center gap-1 hover:translate-y-[-1px]"
                >
                  <HelpCircle className="w-3.5 h-3.5 shrink-0 text-blue-400" />
                  {p.label}
                </button>
              ))}
            </div>

            {/* Input Row */}
            <form onSubmit={onSubmit} className="flex gap-2.5 max-w-4xl mx-auto w-full">
              <div className="relative flex-1">
                <textarea
                  ref={textareaRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask the AI Tutor (Shift+Enter for new line, Enter to send)..."
                  disabled={isWaiting}
                  rows={2}
                  className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-gray-200 focus:border-blue-500 focus:bg-white rounded-xl outline-none resize-none text-sm transition-all focus:shadow-md max-h-32"
                />
              </div>
              <button
                type="submit"
                disabled={isWaiting || !draft.trim()}
                className="btn-primary px-5 self-end h-[46px] rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20"
              >
                {isWaiting ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span className="text-xs font-semibold">Send</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
