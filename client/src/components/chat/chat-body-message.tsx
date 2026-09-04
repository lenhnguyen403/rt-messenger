import { memo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import type { MessageType } from "@/types/chat.type";
import AvatarWithBadge from "../avatar-with-badge";
import { formatChatTime, isSameId } from "@/lib/helper";
import { Button } from "../ui/button";
import { CheckCheck, Pencil, ReplyIcon, Smile, Trash2 } from "lucide-react";
import { Response } from "../ui/ai-response";
import { RiCircleFill } from "@remixicon/react";

interface Props {
  message: MessageType;
  onReply: (message: MessageType) => void;
  onEdit: (message: MessageType) => void;
  onDelete: (message: MessageType) => void;
  onReaction: (message: MessageType, emoji: string) => void;
  searchQuery?: string;
  onImageLoad?: () => void;
}
const ChatMessageBody = memo(
  ({
    message,
    onReply,
    onEdit,
    onDelete,
    onReaction,
    onImageLoad,
    searchQuery = "",
  }: Props) => {
    const { user } = useAuth();
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);

    const userId = user?._id || null;
    const isCurrentUser = isSameId(message.sender, userId);
    const senderName = isCurrentUser ? "You" : message.sender?.name;

    const replySendername = isSameId(message.replyTo?.sender, userId)
      ? "You"
      : message.replyTo?.sender?.name;

    const containerClass = cn(
      "group flex gap-2 py-3 px-4",
      isCurrentUser && "flex-row-reverse text-left",
    );

    const contentWrapperClass = cn(
      "max-w-[70%]  flex flex-col relative",
      isCurrentUser && "items-end",
    );

    const messageClass = cn(
      "min-w-[200px] px-3 py-2 text-sm break-words shadow-sm",
      isCurrentUser
        ? "bg-accent dark:bg-primary/40 rounded-tr-xl rounded-l-xl"
        : "bg-[#F5F5F5] dark:bg-accent rounded-bl-xl rounded-r-xl",
    );

    const replyBoxClass = cn(
      `mb-2 p-2 text-xs rounded-md border-l-4 shadow-md !text-left`,
      isCurrentUser
        ? "bg-primary/20 border-l-primary"
        : "bg-gray-200 dark:bg-secondary border-l-[#CC4A31]",
    );
    const highlightContent = (content: string) => {
      if (!searchQuery.trim()) return content;
      const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const parts = content.split(new RegExp(`(${escapedQuery})`, "gi"));
      return parts.map((part, index) =>
        part.toLowerCase() === searchQuery.toLowerCase() ? (
          <mark key={index} className="rounded bg-yellow-300/70 text-inherit">
            {part}
          </mark>
        ) : (
          part
        ),
      );
    };
    const isSeen =
      isCurrentUser &&
      message.readBy?.some((entry) => !isSameId(entry.userId, userId));
    const reactionCounts = (message.reactions || []).reduce<
      Record<string, number>
    >((counts, reaction) => {
      counts[reaction.emoji] = (counts[reaction.emoji] || 0) + 1;
      return counts;
    }, {});
    return (
      <div id={`message-${message._id}`} className={containerClass}>
        {!isCurrentUser && (
          <div className="shrink-0 flex items-start">
            <AvatarWithBadge
              name={message.sender?.name || "No name"}
              src={message.sender?.avatar || ""}
            />
          </div>
        )}

        <div className={contentWrapperClass}>
          <div
            className={cn(
              "flex items-start gap-1",
              isCurrentUser && "flex-row-reverse",
            )}>
            <div className="flex min-w-0 flex-col">
              <div className={messageClass}>
                {/* {Header} */}

                <div className="flex items-center gap-2 mb-0.5 pb-1">
                  <span className="text-xs font-semibold">{senderName}</span>
                  <span className="text-[11px] text-gray-700 dark:text-gray-300">
                    {formatChatTime(message?.createdAt)}
                  </span>
                  {message.isEdited && (
                    <span className="text-[11px] text-gray-500">(edited)</span>
                  )}
                </div>

                {/* ReplyToBox */}
                {message.replyTo && (
                  <div className={replyBoxClass}>
                    <h5 className="font-medium">{replySendername}</h5>
                    <p
                      className="font-normal text-muted-foreground
                 max-w-62.5 truncate
                ">
                      {message.replyTo.isDeleted
                        ? "Tin nhắn đã bị xóa"
                        : message.replyTo.content ||
                          (message.replyTo.image
                            ? "📷 Photo"
                            : "Message unavailable")}
                    </p>
                  </div>
                )}

                {message?.image && (
                  <img
                    src={message?.image || ""}
                    alt=""
                    className="rounded-lg max-w-xs"
                    onLoad={onImageLoad}
                  />
                )}

                {message.isDeleted ? (
                  <span className="italic text-muted-foreground">
                    Tin nhắn đã bị xóa
                  </span>
                ) : message.content ? (
                  searchQuery ? (
                    <div className="whitespace-pre-wrap">
                      {highlightContent(message.content)}
                    </div>
                  ) : (
                    <Response>{message.content}</Response>
                  )
                ) : null}

                {message?.streaming && (
                  <span>
                    <RiCircleFill className="h-4 w-4 animate-bounce rounded-full dark:text-white mt-1" />
                  </span>
                )}
              </div>

              {!message.isDeleted && (
                <div
                  className={cn(
                    "mt-1 flex items-center gap-1",
                    isCurrentUser ? "justify-end" : "justify-start",
                  )}>
                  {Object.entries(reactionCounts).map(([emoji, count]) => {
                    const isSelected = message.reactions?.some(
                      (reaction) =>
                        reaction.emoji === emoji &&
                        isSameId(reaction.userId, userId),
                    );
                    return (
                      <button
                        type="button"
                        key={emoji}
                        aria-label={`React with ${emoji}`}
                        aria-pressed={isSelected}
                        onClick={() => onReaction(message, emoji)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs shadow-sm transition-colors",
                          isSelected
                            ? "border-primary bg-primary/10"
                            : "border-border bg-background hover:bg-accent",
                        )}>
                        <span>{emoji}</span>
                        <span>{count}</span>
                      </button>
                    );
                  })}
                  <div className="relative">
                    <button
                      type="button"
                      aria-label="Choose emoji"
                      aria-expanded={isEmojiPickerOpen}
                      className="inline-flex size-7 items-center justify-center rounded-full border border-transparent text-muted-foreground transition-colors hover:border-border hover:bg-accent"
                      title="Choose emoji"
                      onClick={() => setIsEmojiPickerOpen((open) => !open)}>
                      <Smile size={14} />
                    </button>
                    {isEmojiPickerOpen && (
                      <div className="absolute bottom-8 z-10 grid w-48 grid-cols-6 gap-1 rounded-md border border-border bg-popover p-2 text-base shadow-md ltr:left-0 rtl:right-0">
                        {[
                          "😀",
                          "😂",
                          "😍",
                          "🤣",
                          "😊",
                          "😎",
                          "😮",
                          "😢",
                          "😡",
                          "👏",
                          "🔥",
                          "🎉",
                          "👍",
                          "👎",
                          "❤️",
                          "💯",
                          "🙏",
                          "✅",
                        ].map((emoji) => (
                          <button
                            type="button"
                            key={emoji}
                            className="rounded p-1 hover:bg-accent"
                            aria-label={`React with ${emoji}`}
                            onClick={() => {
                              onReaction(message, emoji);
                              setIsEmojiPickerOpen(false);
                            }}>
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* {Reply Icon Button} */}
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {isCurrentUser && !message.streaming && !message.isDeleted && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onEdit(message)}
                  aria-label="Edit message"
                  className="rounded-full size-8!">
                  <Pencil size={15} />
                </Button>
              )}
              {isCurrentUser && !message.streaming && !message.isDeleted && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onDelete(message)}
                  aria-label="Delete message"
                  className="rounded-full size-8!">
                  <Trash2 size={15} />
                </Button>
              )}
              {!message.isDeleted && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onReply(message)}
                  aria-label="Reply to message"
                  className="flex rounded-full size-8!">
                  <ReplyIcon
                    size={16}
                    className={cn(
                      "text-gray-500 dark:text-white stroke-[1.9]!",
                      isCurrentUser && "scale-x-[-1]",
                    )}
                  />
                </Button>
              )}
            </div>
          </div>

          {message.status && (
            <span
              className="block
           text-[10px] text-gray-400 mt-0.5">
              {message.status}
            </span>
          )}
          {isSeen && (
            <span className="flex items-center gap-1 text-[10px] text-primary mt-0.5">
              <CheckCheck size={12} /> Đã xem
            </span>
          )}
        </div>
      </div>
    );
  },
);

ChatMessageBody.displayName = "ChatMessageBody";

export default ChatMessageBody;
