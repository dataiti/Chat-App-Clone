import { Message, MessageGroup } from "~/types/message";
import { User } from "~/types/user";

export interface CurrentConversationPayload {
     limit: number;
     senderId: string;
     recepientId: string;
     conversationType?: "SINGLE" | "GROUP";
}

export interface Conversation {
     _id: string;
     createtorId: string;
     paticipants: User[];
     conversationType?: "SINGLE" | "GROUP";
     isDeleted?: boolean;
     createdAt?: string;
     updatedAt?: string;
     messages?: Message[];
}

export interface ConversationResponse {
     status: string;
     message: string;
     data: Conversation;
}

export interface ConversationDetailResponse {
     status: string;
     message: string;
     data: MessageGroup[];
}