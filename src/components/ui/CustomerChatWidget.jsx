import { useEffect, useMemo, useRef, useState } from 'react'
import { ImagePlus, MessageCircle, Minus, Send, X } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'

import { chatApi } from '../../features/chat'
import { getApiMessage, hasAnyRole, tokenStorage } from '../../shared/api'
import { subscribeChatConversation } from '../../shared/services/chatSocket'
import { uploadImageToCloudinary } from '../../shared/services/cloudinaryUpload'

function getConversationId(conversation) {
  return conversation?.id || conversation?._id || conversation?.conversationId || ''
}

function getMessageId(message) {
  return message?.id || message?._id || `${message?.conversationId}-${message?.createdAt}-${message?.content}`
}

function formatTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function mergeMessage(list, message) {
  if (!message) return list
  const messageId = getMessageId(message)
  if (messageId && list.some((item) => getMessageId(item) === messageId)) return list
  return [...list, message]
}

function getSenderLabel(message) {
  return message?.senderName || message?.senderType || message?.senderId || 'Nguoi dung'
}

function getSenderAvatar(message) {
  return message?.senderAvatarUrl || ''
}

function getInitial(value) {
  return String(value || 'U').trim().charAt(0).toUpperCase() || 'U'
}

function CustomerChatWidget() {
  const navigate = useNavigate()
  const location = useLocation()
  const fileInputRef = useRef(null)
  const bottomRef = useRef(null)
  const previewUrlRef = useRef('')
  const [authSnapshot, setAuthSnapshot] = useState(tokenStorage.getSnapshot())
  const [isOpen, setIsOpen] = useState(false)
  const [conversation, setConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [content, setContent] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const user = authSnapshot.user
  const isAuthenticated = authSnapshot.isAuthenticated
  const canAccessAdmin = hasAnyRole(user, ['ADMIN', 'STAFF'])
  const isCustomer = hasAnyRole(user, ['USER']) && !canAccessAdmin
  const conversationId = getConversationId(conversation)
  const shouldHide = location.pathname.startsWith('/admin') || location.pathname === '/chat'

  const statusText = useMemo(() => {
    if (conversation?.status === 'CLOSED') return 'Hoi thoai da dong'
    if (conversation?.status === 'WAITING_ADMIN') return 'Dang cho nhan vien ho tro'
    return 'Thuong gap trong vai phut'
  }, [conversation?.status])

  useEffect(() => tokenStorage.subscribe(setAuthSnapshot), [])

  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    },
    [],
  )

  useEffect(() => {
    if (!isOpen || !isCustomer || conversation) return undefined

    let isMounted = true

    chatApi
      .getMyConversation()
      .then(async (nextConversation) => {
        const nextConversationId = getConversationId(nextConversation)
        const nextMessages = nextConversationId ? await chatApi.getMyMessages(nextConversationId) : []

        if (!isMounted) return
        setConversation(nextConversation)
        setMessages(nextMessages)
      })
      .catch((error) => {
        if (isMounted) setErrorMessage(getApiMessage(error, 'Khong the mo chat ho tro.'))
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [conversation, isCustomer, isOpen])

  useEffect(() => {
    if (!isOpen || !conversationId) return undefined

    return subscribeChatConversation(conversationId, {
      onMessage: (event) => {
        if (event?.conversation) setConversation(event.conversation)
        if (event?.message) setMessages((current) => mergeMessage(current, event.message))
      },
    })
  }, [conversationId, isOpen])

  useEffect(() => {
    if (isOpen) bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [isOpen, messages.length])

  if (shouldHide || !isAuthenticated || !isCustomer) return null

  const setSelectedImage = (file) => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)

    if (!file) {
      previewUrlRef.current = ''
      setImageFile(null)
      setImagePreview('')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    const previewUrl = URL.createObjectURL(file)
    previewUrlRef.current = previewUrl
    setImageFile(file)
    setImagePreview(previewUrl)
  }

  const handleSend = async (event) => {
    event.preventDefault()

    if (!conversationId || isSending) return
    if (!content.trim() && !imageFile) {
      setErrorMessage('Nhap noi dung hoac chon anh truoc khi gui.')
      return
    }

    setIsSending(true)
    setErrorMessage('')

    try {
      let uploadedImage = null
      if (imageFile) uploadedImage = await uploadImageToCloudinary(imageFile, 'CHAT')

      const sentMessage = await chatApi.sendMyMessage(conversationId, {
        content: content.trim(),
        imageUrl: uploadedImage?.secure_url || '',
        imagePublicId: uploadedImage?.public_id || '',
      })

      setMessages((current) => mergeMessage(current, sentMessage))
      setContent('')
      setSelectedImage(null)
    } catch (error) {
      setErrorMessage(getApiMessage(error, 'Gui tin nhan that bai.'))
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="fixed bottom-5 right-4 z-[70] sm:right-6">
      {isOpen ? (
        <div className="flex h-[min(620px,calc(100vh-7rem))] w-[min(390px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-[0_24px_80px_rgba(6,78,59,0.22)]">
          <div className="flex items-center gap-3 bg-emerald-950 px-4 py-3 text-white">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/12">
              <MessageCircle size={20} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black">PoloMan ho tro</p>
              <p className="mt-0.5 truncate text-xs font-semibold text-emerald-50/75">{statusText}</p>
            </div>
            <button type="button" onClick={() => navigate('/chat')} className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/10" aria-label="Mo trang chat">
              <Minus size={18} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => setIsOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/10" aria-label="Dong chat">
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          {errorMessage && (
            <div className="border-b border-red-100 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700">
              {errorMessage}
            </div>
          )}

          <div className="flex-1 overflow-y-auto bg-[linear-gradient(180deg,#f8fcf8_0%,#ffffff_100%)] px-3 py-4">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <div className="h-9 w-9 animate-spin rounded-full border-2 border-emerald-100 border-t-emerald-700" />
              </div>
            ) : messages.length ? (
              <div className="space-y-3">
                {messages.map((message) => {
                  const isMine = message?.senderType === 'USER'
                  const senderLabel = getSenderLabel(message)
                  const senderAvatar = getSenderAvatar(message)

                  return (
                    <div key={getMessageId(message)} className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
                      {!isMine && (
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-100 text-[10px] font-black text-emerald-800">
                          {senderAvatar ? <img src={senderAvatar} alt="" className="h-full w-full object-cover" /> : getInitial(senderLabel)}
                        </span>
                      )}
                      <div
                        className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                          isMine
                            ? 'rounded-br-md bg-emerald-700 text-white'
                            : 'rounded-bl-md border border-emerald-100 bg-white text-neutral-900'
                          }`}
                      >
                        <p className={`mb-1 text-[10px] font-black uppercase tracking-[0.1em] ${isMine ? 'text-white/70' : 'text-emerald-700'}`}>
                          {senderLabel}
                        </p>
                        {message?.imageUrl && (
                          <img src={message.imageUrl} alt="Anh chat" className="mb-2 max-h-56 w-full rounded-xl object-cover" />
                        )}
                        {message?.content && <p className="whitespace-pre-wrap break-words leading-5">{message.content}</p>}
                        <p className={`mt-1 text-[10px] ${isMine ? 'text-white/65' : 'text-neutral-400'}`}>
                          {formatTime(message?.createdAt)}
                        </p>
                      </div>
                      {isMine && (
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-700 text-[10px] font-black text-white">
                          {senderAvatar ? <img src={senderAvatar} alt="" className="h-full w-full object-cover" /> : getInitial(senderLabel)}
                        </span>
                      )}
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>
            ) : (
              <div className="flex h-full items-center justify-center px-6 text-center text-sm font-semibold text-neutral-500">
                Gui tin nhan cho cua hang, PoloMan se ho tro ban som nhat.
              </div>
            )}
          </div>

          <form onSubmit={handleSend} className="border-t border-emerald-100 p-3">
            {imagePreview && (
              <div className="mb-2 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 p-2">
                <img src={imagePreview} alt="Anh da chon" className="h-12 w-12 rounded-lg object-cover" />
                <p className="min-w-0 flex-1 truncate text-xs font-semibold text-emerald-950">{imageFile?.name}</p>
                <button type="button" onClick={() => setSelectedImage(null)} className="flex h-8 w-8 items-center justify-center rounded-lg text-emerald-900 hover:bg-white" aria-label="Bo anh">
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
            )}
            <div className="flex items-end gap-2">
              <input ref={fileInputRef} type="file" accept="image/*" onChange={(event) => setSelectedImage(event.target.files?.[0] || null)} className="hidden" />
              <button type="button" onClick={() => fileInputRef.current?.click()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-100 text-emerald-800 hover:bg-emerald-50" aria-label="Chon anh">
                <ImagePlus size={18} aria-hidden="true" />
              </button>
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                rows={1}
                placeholder="Nhap tin nhan..."
                className="max-h-24 min-h-11 flex-1 resize-none rounded-xl border border-emerald-100 px-3 py-2.5 text-sm outline-none focus:border-emerald-700"
              />
              <button type="submit" disabled={isSending || (!content.trim() && !imageFile)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-800 text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-45" aria-label="Gui tin nhan">
                <Send size={17} aria-hidden="true" />
              </button>
            </div>
          </form>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setErrorMessage('')
            setIsLoading(!conversation)
            setIsOpen(true)
          }}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-800 text-white shadow-[0_18px_45px_rgba(6,78,59,0.28)] ring-4 ring-white transition hover:bg-emerald-900"
          aria-label="Mo chat ho tro"
        >
          <MessageCircle size={26} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

export default CustomerChatWidget
