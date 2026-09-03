import { z } from "zod";
import type { MessageType } from "@/types/chat.type";
import type { UserType } from "@/types/auth.type";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Check, Paperclip, Send, X } from "lucide-react";
import { Form, FormField, FormItem } from "../ui/form";
import { Input } from "../ui/input";
import ChatReplyBar from "./chat-reply-bar";
import { useChat } from "@/hooks/use-chat";
import { useSocket } from "@/hooks/use-socket";

interface Props {
  chatId: string | null;
  currentUserId: string | null;
  replyTo: MessageType | null;
  isAIChat: boolean;
  onCancelReply: () => void;
  editingMessage: MessageType | null;
  onCancelEdit: () => void;
  participants: UserType[];
  isGroup: boolean;
}
const ChatFooter = ({
  chatId,
  currentUserId,
  replyTo,
  isAIChat,
  onCancelReply,
  editingMessage,
  onCancelEdit,
  participants,
  isGroup,
}: Props) => {
  const messageSchema = z.object({
    message: z.string().optional(),
  });

  const { sendMessage, editMessage, isSendingMsg, isEditingMsg } = useChat();
  const { startTyping, stopTyping } = useSocket();

  const [image, setImage] = useState<string | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const messageInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const form = useForm({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      message: "",
    },
  });

  useEffect(() => {
    if (replyTo || editingMessage) {
      form.setValue("message", editingMessage?.content || "");
      messageInputRef.current?.focus();
    }
  }, [replyTo, editingMessage, form]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImage(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const handleMessageChange = (
    value: string,
    onChange: (value: string) => void,
  ) => {
    onChange(value);
    if (isGroup && !editingMessage) {
      const mentionMatch = value.match(/(?:^|\s)@([^\s@]*)$/);
      setMentionQuery(mentionMatch ? mentionMatch[1].toLowerCase() : null);
    } else {
      setMentionQuery(null);
    }
    if (!chatId || editingMessage) return;
    startTyping(chatId);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => stopTyping(chatId), 800);
  };

  const mentionSuggestions =
    mentionQuery === null
      ? []
      : participants.filter(
          (participant) =>
            participant._id !== currentUserId &&
            participant.name.toLowerCase().includes(mentionQuery),
        );

  const handleMentionSelect = (participant: UserType) => {
    const value = form.getValues("message") || "";
    const updatedValue = value.replace(
      /(^|\s)@[^\s@]*$/,
      `$1@${participant.name} `,
    );
    form.setValue("message", updatedValue, { shouldDirty: true });
    setMentionQuery(null);
    messageInputRef.current?.focus();
  };

  const onSubmit = (values: { message?: string }) => {
    if (isSendingMsg || isEditingMsg) return;
    if (!values.message?.trim() && !image) {
      toast.error("Please enter a message or select an image");
      return;
    }
    if (editingMessage) {
      void editMessage(editingMessage._id, values.message?.trim() || "").then(
        (success) => {
          if (success) {
            onCancelEdit();
            form.reset();
          }
        },
      );
      return;
    }
    if (chatId) stopTyping(chatId);
    const payload = {
      chatId,
      content: values.message,
      image: image || undefined,
      replyTo: replyTo,
    };
    //Send Message
    sendMessage(payload, isAIChat);

    onCancelReply();
    handleRemoveImage();
    form.reset();
  };
  return (
    <>
      <div
        className="sticky bottom-0
       inset-x-0 z-999
       bg-card border-t border-border py-4
      ">
        {image && !isSendingMsg && (
          <div className="max-w-6xl mx-auto px-8.5">
            <div className="relative w-fit">
              <img
                src={image}
                className="object-contain h-16 bg-muted min-w-16"
              />

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-px right-1
                 bg-black/50 text-white rounded-full
                 cursor-pointer
                "
                onClick={handleRemoveImage}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
        {mentionSuggestions.length > 0 && (
          <div className="max-w-6xl mx-auto px-8.5 pb-2">
            <div className="w-full max-w-xs rounded-md border border-border bg-popover p-1 shadow-md">
              {mentionSuggestions.map((participant) => (
                <button
                  type="button"
                  key={participant._id}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleMentionSelect(participant)}>
                  <span className="truncate">{participant.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <Form {...form}>
          <form
            onSubmit={(e) => {
              void form.handleSubmit(onSubmit)(e);
            }}
            className="max-w-6xl px-8.5 mx-auto
            flex items-end gap-2
            ">
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={isSendingMsg || !!editingMessage}
                className="rounded-full"
                onClick={() => imageInputRef.current?.click()}>
                <Paperclip className="h-4 w-4" />
              </Button>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                disabled={isSendingMsg || !!editingMessage}
                ref={imageInputRef}
                onChange={handleImageChange}
              />
            </div>
            <FormField
              control={form.control}
              name="message"
              disabled={isSendingMsg || isEditingMsg}
              render={({ field }) => (
                <FormItem className="flex-1">
                  <Input
                    {...field}
                    onChange={(event) =>
                      handleMessageChange(event.target.value, field.onChange)
                    }
                    ref={(element) => {
                      field.ref(element);
                      messageInputRef.current = element;
                    }}
                    autoComplete="off"
                    placeholder="Type new message"
                    className="min-h-10 bg-background"
                  />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              size="icon"
              className="rounded-lg"
              disabled={isSendingMsg || isEditingMsg}>
              {editingMessage ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
            </Button>
          </form>
        </Form>
      </div>

      {replyTo && !editingMessage && !isSendingMsg && (
        <ChatReplyBar
          replyTo={replyTo}
          currentUserId={currentUserId}
          onCancel={onCancelReply}
        />
      )}
      {editingMessage && !isEditingMsg && (
        <div className="max-w-6xl mx-auto px-8.5 py-2 text-xs text-muted-foreground flex justify-between">
          <span>Editing message</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancelEdit}>
            Cancel
          </Button>
        </div>
      )}
    </>
  );
};

export default ChatFooter;
