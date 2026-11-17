import api from './api';
import type { ChatRequest, Conversation, GlobalMessage, PrivateMessage } from '../types';

export const chatService = {
  async getGlobalMessages(): Promise<GlobalMessage[]> {
    const { data } = await api.get<{ messages: GlobalMessage[] }>('/global-messages');
    return data.messages;
  },

  async postGlobalMessage(message: string): Promise<GlobalMessage> {
    const { data } = await api.post<{ message: GlobalMessage }>('/global-messages', { message });
    return data.message;
  },

  async sendChatRequest(receiverId: number): Promise<ChatRequest> {
    const { data } = await api.post<{ request: ChatRequest }>('/chat-requests', { receiverId });
    return data.request;
  },

  async getIncomingRequests(): Promise<ChatRequest[]> {
    const { data } = await api.get<{ requests: ChatRequest[] }>('/chat-requests/incoming');
    return data.requests;
  },

  async getOutgoingRequests(): Promise<ChatRequest[]> {
    const { data } = await api.get<{ requests: ChatRequest[] }>('/chat-requests/outgoing');
    return data.requests;
  },

  async acceptRequest(requestId: number): Promise<{ id: number; conversationId: number }> {
    const { data } = await api.post<{ request: { id: number; conversationId: number } }>(
      `/chat-requests/${requestId}/accept`
    );
    return data.request;
  },

  async rejectRequest(requestId: number): Promise<void> {
    await api.post(`/chat-requests/${requestId}/reject`);
  },

  async getConversations(): Promise<Conversation[]> {
    const { data } = await api.get<{ conversations: Conversation[] }>('/conversations');
    return data.conversations;
  },

  async getPrivateMessages(conversationId: number): Promise<PrivateMessage[]> {
    const { data } = await api.get<{ messages: PrivateMessage[] }>(
      `/conversations/${conversationId}/messages`
    );
    return data.messages;
  },

  async postPrivateMessage(conversationId: number, message: string): Promise<PrivateMessage> {
    const { data } = await api.post<{ message: PrivateMessage }>(
      `/conversations/${conversationId}/messages`,
      { message }
    );
    return data.message;
  },
};
