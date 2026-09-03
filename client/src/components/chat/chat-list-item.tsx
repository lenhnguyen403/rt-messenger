import { getOtherUserAndGroup } from "@/lib/helper";
import { cn } from "@/lib/utils";
import type { ChatType } from "@/types/chat.type";
import { useLocation } from "react-router-dom";
import AvatarWithBadge from "../avatar-with-badge";
import { formatChatTime } from "../../lib/helper";

interface PropsType {
  chat: ChatType;
  currentUserId: string | null;
  onClick?: () => void;
  unreadCount: number;
}
const ChatListItem = ({
  chat,
  currentUserId,
  onClick,
  unreadCount,
}: PropsType) => {
  const { pathname } = useLocation();
  const { lastMessage, createdAt } = chat;

  const { name, avatar, isOnline, isGroup } = getOtherUserAndGroup(
    chat,
    currentUserId,
  );

  const getLastMessageText = () => {
    if (!lastMessage) {
      return isGroup
        ? chat.createdBy === currentUserId
          ? "Group created"
          : "You were added"
        : "Send a message";
    }
    if (lastMessage.image) return "📷 Photo";

    if (isGroup && lastMessage.sender) {
      return `${
        lastMessage.sender._id === currentUserId
          ? "You"
          : lastMessage.sender.name
      }: ${lastMessage.content}`;
    }

    return lastMessage.content;
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        `w-full flex items-center gap-2 p-2 rounded-sm
         hover:bg-sidebar-accent transition-colors text-left`,
        pathname.includes(chat._id) && "bg-sidebar-accent!",
        unreadCount > 0 && "bg-primary/10 font-semibold",
      )}>
      <AvatarWithBadge
        name={name}
        src={avatar}
        isGroup={isGroup}
        isOnline={isOnline}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <h5
            className={cn(
              "min-w-0 truncate text-sm",
              unreadCount > 0 && "font-bold",
            )}>
            {name}
          </h5>
          <div className="flex shrink-0 items-center gap-2">
            {unreadCount > 0 && (
              <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {formatChatTime(lastMessage?.updatedAt || createdAt)}
            </span>
          </div>
        </div>
        <p
          className={cn(
            "truncate text-xs text-muted-foreground -mt-px",
            unreadCount > 0 && "font-bold text-foreground",
          )}>
          {getLastMessageText()}
        </p>
      </div>
    </button>
  );
};

export default ChatListItem;
