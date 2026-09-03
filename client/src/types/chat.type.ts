import type { UserType } from './auth.type'

export type ChatType = {
    _id: string
    lastMessage: MessageType | null
    participants: UserType[]
    isGroup: boolean
    isAiChat: boolean
    createdBy: string
    groupName?: string
    createdAt: string
    updatedAt: string
}

export type MessageType = {
    _id: string
    content: string | null
    image: string | null
    sender: UserType | null
    replyTo: MessageType | null
    isEdited?: boolean
    isDeleted?: boolean
    reactions?: { userId: string; emoji: string }[]
    readBy?: { userId: string; readAt: string }[]
    chatId: string
    createdAt: string
    updatedAt: string
    // only frontend
    status?: string
    streaming?: boolean
}

export type MessageSearchResult = {
    messages: MessageType[]
    page: number
    hasMore: boolean
}

export type CreateChatType = {
    participantId?: string
    isGroup?: boolean
    participants?: string[]
    groupName?: string
}

export type CreateMessageType = {
    chatId: string | null
    content?: string
    image?: string
    replyTo?: MessageType | null
}