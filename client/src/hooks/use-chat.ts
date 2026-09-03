import { create } from 'zustand'
import type { UserType } from '@/types/auth.type'
import type {
    ChatType,
    CreateChatType,
    CreateMessageType,
    MessageType,
} from '@/types/chat.type'
import { API } from '@/lib/axios-client'
import { toast } from 'sonner'
import { useAuth } from './use-auth'
import { generateUUID } from '@/lib/helper'

interface ChatState {
    chats: ChatType[]
    unreadCounts: Record<string, number>
    users: UserType[]
    singleChat: {
        chat: ChatType
        messages: MessageType[]
        page?: number
    } | null

    currentAIStreamId: string | null

    isChatsLoading: boolean
    isUsersLoading: boolean
    isCreatingChat: boolean
    isSingleChatLoading: boolean
    isSendingMsg: boolean
    isEditingMsg: boolean
    isLoadingOlder: boolean
    hasMoreMessages: boolean
    searchResults: MessageType[]

    fetchAllUsers: () => void
    fetchChats: () => void
    createChat: (payload: CreateChatType) => Promise<ChatType | null>
    fetchSingleChat: (chatId: string) => void
    sendMessage: (payload: CreateMessageType, isAIChat?: boolean) => void
    editMessage: (messageId: string, content: string) => Promise<boolean>
    deleteMessage: (messageId: string) => Promise<boolean>
    toggleReaction: (messageId: string, emoji: string) => Promise<void>
    loadOlderMessages: (chatId: string) => Promise<void>
    searchMessages: (chatId: string, query: string) => Promise<void>
    markMessagesRead: (chatId: string) => Promise<void>

    addNewChat: (newChat: ChatType) => void
    updateChatLastMessage: (chatId: string, lastMessage: MessageType) => void
    markChatAsRead: (chatId: string) => void
    addNewMessage: (chatId: string, message: MessageType) => void

    addOrUpdateMessage: (
        chatId: string,
        msg: MessageType,
        tempId?: string
    ) => void
}

export const useChat = create<ChatState>()((set, get) => ({
    chats: [],
    unreadCounts: {},
    users: [],
    singleChat: null,

    isChatsLoading: false,
    isUsersLoading: false,
    isCreatingChat: false,
    isSingleChatLoading: false,
    isSendingMsg: false,
    isEditingMsg: false,
    isLoadingOlder: false,
    hasMoreMessages: false,
    searchResults: [],

    currentAIStreamId: null,

    fetchAllUsers: async () => {
        set({ isUsersLoading: true });
        try {
            const { data } = await API.get("/user/all");
            set({ users: data.users });
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Failed to fetch users");
        } finally {
            set({ isUsersLoading: false });
        }
    },

    fetchChats: async () => {
        set({ isChatsLoading: true });
        try {
            const { data } = await API.get("/chat/all");
            set({ chats: data.chats });
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Failed to fetch chats");
        } finally {
            set({ isChatsLoading: false });
        }
    },

    createChat: async (payload: CreateChatType) => {
        set({ isCreatingChat: true });
        try {
            const response = await API.post("/chat/create", {
                ...payload,
            });
            get().addNewChat(response.data.chat);
            toast.success("Chat created successfully");
            return response.data.chat;
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Failed to fetch chats");
            return null;
        } finally {
            set({ isCreatingChat: false });
        }
    },

    fetchSingleChat: async (chatId: string) => {
        set({ isSingleChatLoading: true });
        try {
            const { data } = await API.get(`/chat/${chatId}`);
            set({ singleChat: data, hasMoreMessages: data.hasMore ?? false });
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Failed to fetch chats");
        } finally {
            set({ isSingleChatLoading: false });
        }
    },

    sendMessage: async (payload: CreateMessageType, isAIChat?: boolean) => {
        set({ isSendingMsg: true });
        const { chatId, replyTo, content, image } = payload;
        const { user } = useAuth.getState();
        const chat = get().singleChat?.chat
        const aiSender = chat?.participants.find((p) => p.isAI)

        if (!chatId || !user?._id) {
            set({ isSendingMsg: false });
            return;
        }

        const tempUserId = generateUUID();
        const tempAIId = generateUUID();

        const tempMessage = {
            _id: tempUserId,
            chatId,
            content: content || "",
            image: image || null,
            sender: user,
            replyTo: replyTo || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: !isAIChat ? "sending..." : "",
        };

        get().addOrUpdateMessage(chatId, tempMessage, tempUserId)

        if (isAIChat && aiSender) {
            const tempAIMessage = {
                _id: tempAIId,
                chatId,
                content: "",
                image: null,
                sender: aiSender,
                replyTo: null,
                streaming: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            }
            get().addOrUpdateMessage(chatId, tempAIMessage, tempAIId)
        }

        // set((state) => {
        //     if (state.singleChat?.chat?._id !== chatId) return state;
        //     return {
        //         singleChat: {
        //             ...state.singleChat,
        //             messages: [...state.singleChat.messages, tempMessage],
        //         },
        //     };
        // });

        try {
            const { data } = await API.post("/chat/message/send", {
                chatId,
                content,
                image,
                replyToId: replyTo?._id,
            });
            const { userMessage, aiResponse } = data;

            get().addOrUpdateMessage(
                chatId,
                {
                    ...userMessage,
                    replyTo: userMessage.replyTo || replyTo || null,
                    status: undefined,
                },
                tempUserId,
            )
            get().updateChatLastMessage(chatId, userMessage)

            if (isAIChat && aiSender && aiResponse) {
                get().addOrUpdateMessage(chatId, aiResponse, tempAIId)
                get().updateChatLastMessage(chatId, aiResponse)
            }

            //replace the temp user message
            // set((state) => {
            //     if (!state.singleChat) return state;
            //     return {
            //         singleChat: {
            //             ...state.singleChat,
            //             messages: state.singleChat.messages.map((msg) =>
            //                 msg._id === tempUserId ? userMessage : msg
            //             ),
            //         },
            //     };
            // });
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Failed to send message");
        } finally {
            set({ isSendingMsg: false });
        }
    },

    editMessage: async (messageId, content) => {
        set({ isEditingMsg: true });
        try {
            const { data } = await API.put(`/chat/message/${messageId}`, { content });
            const chatId = get().singleChat?.chat._id;
            if (chatId) get().addOrUpdateMessage(chatId, data.updatedMessage, messageId);
            toast.success("Message updated");
            return true;
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Failed to update message");
            return false;
        } finally {
            set({ isEditingMsg: false });
        }
    },

    deleteMessage: async (messageId) => {
        try {
            const { data } = await API.delete(`/chat/message/${messageId}`);
            const chatId = get().singleChat?.chat._id;
            if (chatId) get().addOrUpdateMessage(chatId, data.deletedMessage, messageId);
            return true;
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Failed to delete message");
            return false;
        }
    },

    toggleReaction: async (messageId, emoji) => {
        try {
            const { data } = await API.post(`/chat/message/${messageId}/reaction`, { emoji });
            const chatId = get().singleChat?.chat._id;
            if (chatId) get().addOrUpdateMessage(chatId, data.updatedMessage, messageId);
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Failed to update reaction");
        }
    },

    loadOlderMessages: async (chatId) => {
        if (get().isLoadingOlder || !get().hasMoreMessages) return;
        const currentPage = get().singleChat?.page || 1;
        set({ isLoadingOlder: true });
        try {
            const { data } = await API.get(`/chat/${chatId}?page=${currentPage + 1}`);
            const current = get().singleChat;
            if (!current) return;
            const messages = Array.from(
                new Map([...data.messages, ...current.messages].map((message) => [message._id, message])).values(),
            ).sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
            set({
                singleChat: { ...current, messages, page: data.page },
                hasMoreMessages: data.hasMore,
            });
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Failed to load older messages");
        } finally {
            set({ isLoadingOlder: false });
        }
    },

    searchMessages: async (chatId, query) => {
        if (!query.trim()) { set({ searchResults: [] }); return; }
        try {
            const { data } = await API.get(`/chat/message/search?chatId=${chatId}&q=${encodeURIComponent(query)}`);
            set({ searchResults: data.messages });
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Failed to search messages");
        }
    },

    markMessagesRead: async (chatId) => {
        try {
            await API.post(`/chat/${chatId}/read`);
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Failed to mark messages read");
        }
    },

    addNewChat: (newChat: ChatType) => {
        set((state) => {
            const existingChatIndex = state.chats.findIndex(
                (c) => c._id === newChat._id
            );
            if (existingChatIndex !== -1) {
                const existingChat = state.chats[existingChatIndex];
                const mergedChat = {
                    ...existingChat,
                    ...newChat,
                    lastMessage: newChat.lastMessage || existingChat.lastMessage,
                };
                //move the chat to the top
                return {
                    chats: [mergedChat, ...state.chats.filter((c) => c._id !== newChat._id)],
                };
            } else {
                return {
                    chats: [newChat, ...state.chats],
                };
            }
        });
    },

    updateChatLastMessage: (chatId, lastMessage) => {
        set((state) => {
            const chat = state.chats.find((c) => c._id === chatId);
            if (!chat) return state;
            const currentTime = chat.lastMessage?.updatedAt || chat.updatedAt;
            if (currentTime && new Date(lastMessage.updatedAt).getTime() < new Date(currentTime).getTime()) {
                return state;
            }
            return {
                chats: [
                    { ...chat, lastMessage },
                    ...state.chats.filter((c) => c._id !== chatId),
                ],
            };
        });
    },

    markChatAsRead: (chatId) => {
        set((state) => {
            if (!state.unreadCounts[chatId]) return state;
            const unreadCounts = { ...state.unreadCounts };
            delete unreadCounts[chatId];
            return { unreadCounts };
        });
    },

    addNewMessage: (chatId, message) => {
        const chat = get().singleChat;
        if (chat?.chat._id === chatId) {
            get().updateChatLastMessage(chatId, message)
            const messages = [...chat.messages.filter((item) => item._id !== message._id), message]
                .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())
            set({
                singleChat: {
                    ...chat,
                    messages,
                },
            });
        }
    },

    addOrUpdateMessage: (chatId: string, msg: MessageType, tempId?: string) => {
        const singleChat = get().singleChat
        if (!singleChat || singleChat.chat._id !== chatId) {
            return
        }

        const messages = singleChat.messages
        const msgIndex = messages.findIndex((item) => item._id === (tempId || msg._id))

        let updatedMessages
        if (msgIndex !== -1) {
            updatedMessages = messages.map((m, i) =>
                i === msgIndex
                    ? {
                        ...m,
                        ...msg,
                        sender: msg.sender && typeof msg.sender === "object"
                            ? msg.sender
                            : m.sender,
                        replyTo: msg.replyTo && typeof msg.replyTo === "object"
                            ? msg.replyTo
                            : m.replyTo,
                    }
                    : m
            )
        } else {
            updatedMessages = [...messages, msg]
        }

        const deduplicatedMessages = Array.from(
            new Map(updatedMessages.map((message) => [message._id, message])).values(),
        ).sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())

        set({
            singleChat: {
                ...singleChat,
                messages: deduplicatedMessages
            }
        })
    }
}))