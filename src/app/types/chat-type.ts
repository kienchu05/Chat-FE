export enum ConversationType {
  PRIVATE = 'PRIVATE',
  GROUP = 'GROUP',
}

export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  FILE = 'FILE',
}

export interface ParticipantResponse {
  userId: string;
  username: string;
  email: string;
}

export interface ConversationDetailResponse {
  id: string;
  conversationType: ConversationType;
  name: string;
  conversationAvatar: string | null;
  participantInfo: ParticipantResponse[];
  lastMessageId: string | null;
  lastMessageContent: string | null;
  lastMessageTime: string | null;
  createdAt: string;
  isOnline: boolean;
  lastOnlineAt: string | null;
}

export interface MessageMediaResponse {
  id: string;
  mediaUrl: string;
  mediaType: string;
}

export interface ChatMessageResponse {
  id: string;
  tempId: string | null;
  conversationId: string;
  conversationAvatar: string | null;
  senderId: string;
  senderName: string;
  content: string;
  messageType: MessageType;
  messageMedia: MessageMediaResponse[] | null;
  createdAt: string;
}

export interface CreateConversationRequest {
  name?: string;
  conversationAvatar?: string;
  conversationType: ConversationType;
  participantIds: string[];
}

export interface ChatMessageRequest {
  tempId?: string;
  conversationId: string;
  content?: string;
  messageType: MessageType;
  messageMedia?: MessageMediaRequest[];
}

export interface MessageMediaRequest {
  mediaUrl: string;
  mediaType: string;
}