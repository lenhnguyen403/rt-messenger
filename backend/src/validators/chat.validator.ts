import { z } from 'zod';
import mongoose from 'mongoose';

const objectIdSchema = z.string().trim().refine(mongoose.isValidObjectId, {
    message: 'Invalid identifier',
});

export const createChatSchema = z.object({
    participantId: objectIdSchema.optional(),
    isGroup: z.boolean().optional(),
    participants: z.array(objectIdSchema).optional(),
    groupName: z.string().trim().min(1).optional(),
});

export const chatIdSchema = z.object({
    id: objectIdSchema,
});