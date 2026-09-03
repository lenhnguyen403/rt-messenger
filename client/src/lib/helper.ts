import { v4 as uuidv4 } from 'uuid'
import { useSocket } from '@/hooks/use-socket'
import type { ChatType } from '@/types/chat.type'
import { format, isToday, isYesterday, isThisWeek } from 'date-fns'

export const isUserOnline = (userId?: string) => {
    if (!userId) return false
    const { onlineUsers } = useSocket.getState()
    return onlineUsers.includes(userId)
}


export const isSameId = (left: unknown, right: unknown) => {
    const getId = (value: unknown) => {
        if (value && typeof value === "object" && "_id" in value) {
            return (value as { _id: unknown })._id
        }
        return value
    }

    const leftId = getId(left)
    const rightId = getId(right)
    return leftId != null && rightId != null && String(leftId) === String(rightId)
}
export const getOtherUserAndGroup = (
    chat: ChatType,
    currentUserId: string | null
) => {
    const isGroup = chat?.isGroup

    if (isGroup) {
        return {
            name: chat.groupName || "Unnamed Group",
            subheading: `${chat.participants.length} members`,
            avatar: "",
            isGroup,
        }
    }

    const other = chat?.participants.find((p) => !isSameId(p, currentUserId));
    const isOnline = isUserOnline(other?._id ?? "")

    const subheading = other?.isAI
        ? "Assistant"
        : isOnline ? "Online" : "Offline"

    return {
        name: other?.name || "Unknown",
        subheading,
        avatar: other?.avatar || "",
        isGroup: false,
        isOnline,
        isAI: other?.isAI || false
    }
}

export const formatChatTime = (date: string | Date) => {
    if (!date) return ""
    const newDate = new Date(date)
    if (isNaN(newDate.getTime())) return "Invalid date"

    if (isToday(newDate)) return format(newDate, "h:mm a")
    if (isYesterday(newDate)) return "Yesterday"
    if (isThisWeek(newDate)) return format(newDate, "EEEE")
    return format(newDate, "M/d")
}

export function generateUUID(): string {
    return uuidv4()
}