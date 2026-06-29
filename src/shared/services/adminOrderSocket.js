import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

import { tokenStorage } from '../api/tokenStorage'

export const ADMIN_NEW_ORDER_EVENT = 'admin:new-order'

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

export function subscribeAdminOrderNotifications(handlers = {}) {
  const client = new Client({
    webSocketFactory: () => new SockJS(`${getBackendUrl()}/ws`),
    connectHeaders: getConnectHeaders(),
    reconnectDelay: 5000,
    debug: () => {},
    onConnect: () => {
      const subscription = client.subscribe('/topic/admin/orders', (frame) => {
        try {
          handlers.onMessage?.(JSON.parse(frame.body))
        } catch {
          handlers.onError?.(new Error('Invalid admin order websocket message'))
        }
      })

      handlers.onConnect?.(subscription)
    },
    onStompError: (frame) => {
      handlers.onError?.(new Error(frame.headers?.message || 'Admin order websocket error'))
    },
    onWebSocketError: () => {
      handlers.onError?.(new Error('Cannot connect admin order websocket'))
    },
  })

  client.activate()

  return () => {
    if (client.active) client.deactivate()
  }
}
