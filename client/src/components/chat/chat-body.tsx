import { useChat } from "@/hooks/use-chat";
import { useSocket } from "@/hooks/use-socket";
import type { MessageType } from "@/types/chat.type";
import { useEffect, useState } from "react";
import ChatBodyMessage from "./chat-body-message";

interface Props {
  chatId: string | null;
  messages: MessageType[];
  onReply: (message: MessageType) => void;
  onEdit: (message: MessageType) => void;
  onTypingChange: (userId: string, isTyping: boolean) => void;
  onLoadOlder: () => void;
  onDelete: (message: MessageType) => void;
  onReaction: (message: MessageType, emoji: string) => void;
  searchQuery?: string;
  viewportRef: React.RefObject<HTMLDivElement | null>;
}

interface AIStreamPayload {
  chatId: string;
  chunk: string | null;
  done: boolean;
  message: MessageType | null;
}
const ChatBody = ({
  chatId,
  messages,
  onReply,
  onEdit,
  onTypingChange,
  onLoadOlder,
  onDelete,
  onReaction,
  searchQuery,
  viewportRef,
}: Props) => {
  const { socket } = useSocket();
  const { addNewMessage, addOrUpdateMessage } = useChat();
  const [_, setAiChunk] = useState<string>("");

  useEffect(() => {
    if (!chatId) return;
    if (!socket) return;

    const handleNewMessage = (msg: MessageType) => addNewMessage(chatId, msg);
    const handleUpdatedMessage = (msg: MessageType) =>
      addOrUpdateMessage(chatId, msg, msg._id);
    const handleTyping = (data: {
      chatId: string;
      userId: string;
      isTyping: boolean;
    }) => {
      if (data.chatId === chatId) onTypingChange(data.userId, data.isTyping);
    };

    socket.on("message:new", handleNewMessage);
    socket.on("message:updated", handleUpdatedMessage);
    socket.on("typing:update", handleTyping);
    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("message:updated", handleUpdatedMessage);
      socket.off("typing:update", handleTyping);
    };
  }, [socket, chatId, addNewMessage, addOrUpdateMessage, onTypingChange]);

  useEffect(() => {
    if (!chatId) return;
    if (!socket) return;

    const handleAIStream = ({
      chatId: streamChatId,
      chunk,
      done,
      message,
    }: AIStreamPayload) => {
      if (streamChatId !== chatId) return;

      const lastMsg = messages.at(-1);
      if (!lastMsg?._id || !lastMsg.streaming) {
        return;
      }

      if (chunk?.trim() && !done) {
        setAiChunk((prev) => {
          const newContent = prev + chunk;
          addOrUpdateMessage(
            chatId,
            {
              ...lastMsg,
              content: newContent,
            },
            lastMsg?._id,
          );

          return newContent;
        });

        return;
      }

      if (done) {
        if (message && lastMsg?._id) {
          addOrUpdateMessage(chatId, message, lastMsg._id);
        }
        setAiChunk("");
      }
    };

    socket.on("chat:ai", handleAIStream);

    return () => {
      socket.off("chat:ai", handleAIStream);
    };
  }, [addOrUpdateMessage, chatId, messages, socket]);

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col px-3 py-2">
      <button
        type="button"
        className="text-xs text-muted-foreground py-2"
        onClick={onLoadOlder}>
        Load older messages
      </button>
      {messages.map((message) => (
        <ChatBodyMessage
          key={message._id}
          message={message}
          onReply={onReply}
          onEdit={onEdit}
          onDelete={onDelete}
          onReaction={onReaction}
          searchQuery={searchQuery}
          onImageLoad={() =>
            viewportRef.current?.scrollTo({
              top: viewportRef.current.scrollHeight,
              behavior: "auto",
            })
          }
        />
      ))}
    </div>
  );
};

export default ChatBody;
