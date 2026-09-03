import { z } from 'zod';
import mongoose from 'mongoose';

const objectIdSchema = z.string().trim().refine(mongoose.isValidObjectId, {
    message: 'Invalid identifier',
});

export const sendMessageSchema = z
    .object({
        chatId: objectIdSchema,
        content: z.string().trim().optional(),
        image: z.string().trim().optional(),
        replyToId: objectIdSchema.optional(),
    })
    .refine((data) => data.content || data.image, {
        message: 'Either content or image must be provided',
        path: ['content'],
    });

export const editMessageSchema = z.object({
    content: z.string().trim().min(1, 'Message content is required'),
});

export const messageSearchSchema = z.object({
    chatId: objectIdSchema,
    q: z.string().trim().min(1),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const reactionSchema = z.object({
    emoji: z.string().trim().min(1).max(16),
});

export const readMessagesSchema = z.object({
    chatId: objectIdSchema,
    upToMessageId: objectIdSchema.optional(),
});