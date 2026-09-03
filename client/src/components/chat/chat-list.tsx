import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useChat } from "@/hooks/use-chat";
import { Spinner } from "../ui/spinner";
import ChatListItem from "./chat-list-item";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import ChatListHeader from "./chat-list-header";
import { useSocket } from "@/hooks/use-socket";
import type { ChatType } from "@/types/chat.type";
import type { MessageType } from "../../types/chat.type";

const ChatList = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { socket } = useSocket();
  const {
    fetchChats,
    chats,
    isChatsLoading,
    addNewChat,
    updateChatLastMessage,
    unreadCounts,
    markChatAsRead,
  } = useChat();
  const { user } = useAuth();
  const currentUserId = user?._id || null;

  const [searchQuery, setSearchQuery] = useState("");

  const filteredChats =
    chats?.filter(
      (chat) =>
        chat.groupName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.participants?.some(
          (p) =>
            p._id !== currentUserId &&
            p.name?.toLowerCase().includes(searchQuery.toLowerCase()),
        ),
    ) || [];

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  useEffect(() => {
    if (!socket) return;

    const handleNewChat = (newChat: ChatType) => {
      console.log("Recieved new chat", newChat);
      addNewChat(newChat);
    };

    socket.on("chat:new", handleNewChat);

    return () => {
      socket.off("chat:new", handleNewChat);
    };
  }, [addNewChat, socket]);

  useEffect(() => {
    if (!socket) return;

    const handleChatUpdate = (data: {
      chatId: string;
      lastMessage: MessageType;
    }) => {
      console.log("Recieved update on chat", data.lastMessage);
      updateChatLastMessage(data.chatId, data.lastMessage);
      if (!pathname.includes(data.chatId)) {
        useChat.setState((state) => ({
          unreadCounts: {
            ...state.unreadCounts,
            [data.chatId]: (state.unreadCounts[data.chatId] || 0) + 1,
          },
        }));
      }
    };

    socket.on("chat:update", handleChatUpdate);

    return () => {
      socket.off("chat:update", handleChatUpdate);
    };
  }, [pathname, socket, updateChatLastMessage]);

  useEffect(() => {
    const activeChatId = pathname.startsWith("/chat/")
      ? pathname.split("/")[2]
      : null;
    if (activeChatId) markChatAsRead(activeChatId);
  }, [markChatAsRead, pathname]);

  const onRoute = (id: string) => {
    navigate(`/chat/${id}`);
  };

  return (
    <div
      className="fixed inset-y-0
      pb-20 lg:pb-0
      lg:max-w-94.75
      lg:block
      border-r
      border-border
      bg-sidebar
      max-w-[calc(100%-40px)]
      w-full
      left-10
      z-98
    ">
      <div className="flex-col">
        <ChatListHeader onSearch={setSearchQuery} />

        <div
          className="
         flex-1 h-[calc(100vh-100px)]
         overflow-y-auto        ">
          <div className="px-2 pb-10 pt-1 space-y-1">
            {isChatsLoading ? (
              <div className="flex items-center justify-center">
                <Spinner className="w-7 h-7" />
              </div>
            ) : filteredChats?.length === 0 ? (
              <div className="flex items-center justify-center">
                {searchQuery ? "No chat found" : "No chats created"}
              </div>
            ) : (
              filteredChats?.map((chat) => (
                <ChatListItem
                  key={chat._id}
                  chat={chat}
                  currentUserId={currentUserId}
                  unreadCount={unreadCounts[chat._id] || 0}
                  onClick={() => onRoute(chat._id)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatList;
