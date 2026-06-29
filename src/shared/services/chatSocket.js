import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

import { tokenStorage } from '../api/tokenStorage'

function getBackendUrl() {
  const backendUrl = import.meta.env.VITE_BACKEND_URL
  if (backendUrl) return backendUrl.replace(/\/$/, '')
  const apiUrl = import.meta.env.VITE_API_URL || ''
  return apiUrl.replace(/\/api\/?$/, '').replace(/\/$/, '')
}

function getConnectHeaders() {
  const accessToken = tokenStorage.getAccessToken()
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
}

function createChatClient(topic, handlers = {}) {
  const client = new Client({
    webSocketFactory: () => new SockJS(`${getBackendUrl()}/ws`),
    connectHeaders: getConnectHeaders(),
    reconnectDelay: 5000,
    debug: () => {},
    onConnect: () => {
      const subscription = client.subscribe(topic, (frame) => {
        try {
          handlers.onMessage?.(JSON.parse(frame.body))
        } catch {
          handlers.onError?.(new Error('Invalid chat websocket message'))
        }
      })

      handlers.onConnect?.(subscription)
    },
    onStompError: (frame) => {
      handlers.onError?.(new Error(frame.headers?.message || 'Chat websocket error'))
    },
    onWebSocketError: () => {
      handlers.onError?.(new Error('Cannot connect chat websocket'))
    },
  })

  client.activate()

  return () => {
    if (client.active) client.deactivate()
  }
}

export function subscribeChatConversation(conversationId, handlers = {}) {
  if (!conversationId) return () => {}
  return createChatClient(`/topic/chat/${conversationId}`, handlers)
}

export function subscribeSupportChat(handlers = {}) {
  return createChatClient('/topic/chat/support', handlers)
}
