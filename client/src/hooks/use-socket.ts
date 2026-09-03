import { io, Socket } from 'socket.io-client'
import { create } from 'zustand'

const BASE_URL =
    import.meta.env.MODE === "development"
        ? import.meta.env.VITE_API_URL
        : "/"

interface SocketState {
    socket: Socket | null
    onlineUsers: string[]
    connectSocket: () => void
    disconnectSocket: () => void
    joinChat: (chatId: string) => () => void
    leaveChat: (chatId: string) => void
    startTyping: (chatId: string) => void
    stopTyping: (chatId: string) => void
    onMentionNotification: (handler: (payload: MentionNotification) => void) => () => void
}

export interface MentionNotification {
    chatId: string
    messageId: string
    senderName: string
    content: string
}

export const useSocket = create<SocketState>()((set, get) => ({
    socket: null,
    onlineUsers: [],

    connectSocket: () => {
        const { socket } = get()
        if (socket && (socket.connected || socket.active)) return

        const newSocket = io(BASE_URL, {
            withCredentials: true,
            autoConnect: true
        })

        set({ socket: newSocket })

        newSocket.on("connect", () => { })

        newSocket.on("online:users", (userIds: string[]) => {
            set({ onlineUsers: userIds })
        })
    },

    disconnectSocket: () => {
        const { socket } = get()
        if (socket) {
            socket.disconnect()
            set({ socket: null, onlineUsers: [] })
        }
    },

    joinChat: (chatId: string) => {
        const { socket } = get()
        if (!socket) return () => { }

        const join = () => socket.emit("chat:join", chatId)
        if (socket.connected) join()
        socket.on("connect", join)

        return () => {
            socket.off("connect", join)
            socket.emit("chat:leave", chatId)
        }
    },

    leaveChat: (chatId: string) => {
        get().socket?.emit("chat:leave", chatId)
    },

    startTyping: (chatId) => get().socket?.emit("typing:start", chatId),
    stopTyping: (chatId) => get().socket?.emit("typing:stop", chatId),
    onMentionNotification: (handler) => {
        const socket = get().socket
        if (!socket) return () => { }
        socket.on("mention:notification", handler)
        return () => socket.off("mention:notification", handler)
    },
}))