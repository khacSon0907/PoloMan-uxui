import { getApiData, http } from '../../../shared/api'

function unwrapApiResponse(response) {
  const data = getApiData(response)
  return data?.data ?? data
}

function normalizeList(data) {
  const value = unwrapApiResponse(data)
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.items)) return value.items
  if (Array.isArray(value?.conversations)) return value.conversations
  if (Array.isArray(value?.messages)) return value.messages
  return []
}

function normalizeMessagePayload(payload) {
  return {
    content: payload?.content || '',
    imageUrl: payload?.imageUrl || '',
    imagePublicId: payload?.imagePublicId || '',
  }
}

export const chatApi = {
  async getMyConversation() {
    const response = await http.get('/chat/conversations/me')
    return unwrapApiResponse(response)
  },

  async getMyMessages(conversationId) {
    const response = await http.get(`/chat/conversations/${conversationId}/messages`)
    return normalizeList(response)
  },

  async sendMyMessage(conversationId, payload) {
    const response = await http.post(
      `/chat/conversations/${conversationId}/messages`,
      normalizeMessagePayload(payload),
    )
    return unwrapApiResponse(response)
  },

  async getSupportConversations() {
    const response = await http.get('/chat/support/conversations')
    return normalizeList(response)
  },

  async getSupportMessages(conversationId) {
    const response = await http.get(`/chat/support/conversations/${conversationId}/messages`)
    return normalizeList(response)
  },

  async acceptConversation(conversationId) {
    const response = await http.post(`/chat/support/conversations/${conversationId}/accept`)
    return unwrapApiResponse(response)
  },

  async closeConversation(conversationId) {
    const response = await http.post(`/chat/support/conversations/${conversationId}/close`)
    return unwrapApiResponse(response)
  },

  async sendSupportMessage(conversationId, payload) {
    const response = await http.post(
      `/chat/support/conversations/${conversationId}/messages`,
      normalizeMessagePayload(payload),
    )
    return unwrapApiResponse(response)
  },
}
