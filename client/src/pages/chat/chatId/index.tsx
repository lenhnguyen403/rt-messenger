import ChatBody from "@/components/chat/chat-body";
import ChatFooter from "@/components/chat/chat-footer";
import ChatHeader from "@/components/chat/chat-header";
import EmptyState from "@/components/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/hooks/use-auth";
import { useChat } from "@/hooks/use-chat";
import useChatId from "@/hooks/use-chat-id";
import { useSocket } from "@/hooks/use-socket";
import type { MessageType } from "@/types/chat.type";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const SingleChat = () => {
  const chatId = useChatId();
  const {
    fetchSingleChat,
    isSingleChatLoading,
    singleChat,
    loadOlderMessages,
    deleteMessage,
    toggleReaction,
    markMessagesRead,
    searchMessages,
    searchResults,
  } = useChat();
  const { socket, joinChat } = useSocket();
  const { user } = useAuth();

  const [replyTo, setReplyTo] = useState<MessageType | null>(null);
  const [editingMessage, setEditingMessage] = useState<MessageType | null>(
    null,
  );
  const [typingUserId, setTypingUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const chatViewportRef = useRef<HTMLDivElement | null>(null);

  const currentUserId = user?._id || null;
  const chat = singleChat?.chat;
  const messages = singleChat?.messages || [];
  const isAIChat = chat?.isAiChat || false;

  useLayoutEffect(() => {
    const viewport = chatViewportRef.current;
    if (!viewport || !messages.length || isSingleChatLoading) return;

    const scrollToLatest = () => {
      viewport.scrollTop = viewport.scrollHeight;
    };

    scrollToLatest();
    const frame = requestAnimationFrame(scrollToLatest);
    const content = viewport.firstElementChild;
    const observer = new ResizeObserver(scrollToLatest);
    if (content) observer.observe(content);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [chatId, isSingleChatLoading, messages.length]);

  useEffect(() => {
    if (!chatId) return;
    fetchSingleChat(chatId);
  }, [fetchSingleChat, chatId]);

  useEffect(() => {
    if (chatId && messages.length) void markMessagesRead(chatId);
  }, [chatId, messages.length, markMessagesRead]);

  useEffect(() => {
    if (!chatId) return;
    const timer = setTimeout(
      () => void searchMessages(chatId, searchQuery),
      300,
    );
    return () => clearTimeout(timer);
  }, [chatId, searchQuery, searchMessages]);

  //Socket Chat room
  useEffect(() => {
    if (!chatId || !socket) return;

    const cleanupJoin = joinChat(chatId);
    return cleanupJoin;
  }, [chatId, socket, joinChat]);

  if (isSingleChatLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Spinner className="w-11 h-11 text-primary!" />
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-lg">Chat not found</p>
      </div>
    );
  }

  return (
    <div className="relative h-svh min-h-0 flex flex-col">
      <ChatHeader chat={chat} currentUserId={currentUserId} />

      <div className="border-b border-border bg-card px-4 py-2">
        <div className="relative mx-auto max-w-6xl">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search messages"
            className="pl-9"
          />
        </div>
        {searchQuery && searchResults.length > 0 && (
          <div className="mx-auto mt-2 max-w-6xl space-y-1">
            {searchResults.map((result) => (
              <button
                type="button"
                key={result._id}
                className="block w-full truncate rounded px-2 py-1 text-left text-xs hover:bg-accent"
                onClick={() =>
                  document
                    .getElementById(`message-${result._id}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "center" })
                }>
                {result.content}
              </button>
            ))}
          </div>
        )}
      </div>

      <div
        ref={chatViewportRef}
        className="flex-1 min-h-0 overflow-y-auto bg-background">
        <ChatBody
          chatId={chatId}
          messages={messages}
          onReply={setReplyTo}
          onEdit={(message) => {
            setEditingMessage(message);
            setReplyTo(null);
          }}
          onDelete={(message) => void deleteMessage(message._id)}
          onReaction={(message, emoji) =>
            void toggleReaction(message._id, emoji)
          }
          searchQuery={searchQuery}
          onTypingChange={(userId, isTyping) =>
            setTypingUserId(isTyping ? userId : null)
          }
          onLoadOlder={() => {
            if (chatId) {
              const viewport = chatViewportRef.current;
              const previousHeight = viewport?.scrollHeight || 0;
              void loadOlderMessages(chatId).then(() => {
                if (viewport)
                  viewport.scrollTop += viewport.scrollHeight - previousHeight;
              });
            }
          }}
          viewportRef={chatViewportRef}
        />
        {messages.length === 0 && (
          <EmptyState
            title="Start a conversation"
            description="No messages yet. Send the first message"
          />
        )}
      </div>

      {typingUserId && (
        <div className="px-4 text-xs text-muted-foreground">
          Someone is typing...
        </div>
      )}
      <ChatFooter
        replyTo={replyTo}
        chatId={chatId}
        isAIChat={isAIChat}
        currentUserId={currentUserId}
        onCancelReply={() => setReplyTo(null)}
        editingMessage={editingMessage}
        onCancelEdit={() => setEditingMessage(null)}
        participants={chat.participants}
        isGroup={chat.isGroup}
      />
    </div>
  );
};

export default SingleChat;
