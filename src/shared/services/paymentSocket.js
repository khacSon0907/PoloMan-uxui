import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

function getBackendUrl() {
  const backendUrl = import.meta.env.VITE_BACKEND_URL
  if (backendUrl) return backendUrl.replace(/\/$/, '')

  const apiUrl = import.meta.env.VITE_API_URL || ''
  return apiUrl.replace(/\/api\/?$/, '').replace(/\/$/, '')
}

export function subscribePaymentStatus(orderId, handlers = {}) {
  if (!orderId) {
    throw new Error('orderId is required to subscribe payment status')
  }

  const client = new Client({
    webSocketFactory: () => new SockJS(`${getBackendUrl()}/ws`),
    reconnectDelay: 5000,
    debug: () => {},
    onConnect: () => {
      const subscription = client.subscribe(`/topic/payment/${orderId}`, (frame) => {
        try {
          handlers.onMessage?.(JSON.parse(frame.body))
        } catch {
          handlers.onError?.(new Error('Invalid payment websocket message'))
        }
      })

      handlers.onConnect?.(subscription)
    },
    onStompError: (frame) => {
      handlers.onError?.(new Error(frame.headers?.message || 'Payment websocket error'))
    },
    onWebSocketError: () => {
      handlers.onError?.(new Error('Cannot connect payment websocket'))
    },
  })

  client.activate()

  return () => {
    if (client.active) client.deactivate()
  }
}
