import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, ImagePlus, MessageCircle, Send, X, XCircle } from 'lucide-react'

import { chatApi } from '../../features/chat'
import { getApiMessage } from '../../shared/api'
import { subscribeChatConversation, subscribeSupportChat } from '../../shared/services/chatSocket'
import { uploadImageToCloudinary } from '../../shared/services/cloudinaryUpload'

function getConversationId(conversation) {
  return conversation?.id || conversation?._id || conversation?.conversationId || ''
}

function getMessageId(message) {
  return message?.id || message?._id || `${message?.conversationId}-${message?.createdAt}-${message?.content}`
}

function formatTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  }).format(date)
}

function mergeMessage(list, message) {
  if (!message) return list
  const messageId = getMessageId(message)
  if (messageId && list.some((item) => getMessageId(item) === messageId)) return list
  return [...list, message]
}

function upsertConversation(list, conversation) {
  if (!conversation) return list
  const conversationId = getConversationId(conversation)
  const next = list.filter((item) => getConversationId(item) !== conversationId)
  return [conversation, ...next].sort(
    (first, second) =>
      new Date(second?.lastMessageTime || second?.updatedAt || second?.createdAt || 0).getTime() -
      new Date(first?.lastMessageTime || first?.updatedAt || first?.createdAt || 0).getTime(),
  )
}

function getCustomerLabel(conversation) {
  return conversation?.customerName || conversation?.customerId || 'Khach hang'
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

function formatLastMessage(value) {
  if (!value) return 'Chua co tin nhan'
  return value === '[Anh]' ? 'Tin nhan anh' : value
}

function AdminSupportChat() {
  const fileInputRef = useRef(null)
  const bottomRef = useRef(null)
  const previewUrlRef = useRef('')
  const [conversations, setConversations] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [messages, setMessages] = useState([])
  const [content, setContent] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [isLoadingList, setIsLoadingList] = useState(true)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isMutating, setIsMutating] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => getConversationId(conversation) === selectedId) || null,
    [conversations, selectedId],
  )

  useEffect(() => {
    let isMounted = true

    async function loadConversations() {
      setIsLoadingList(true)
      setErrorMessage('')

      try {
        const list = await chatApi.getSupportConversations()
        if (!isMounted) return
        setConversations(list)
        setSelectedId((current) => current || getConversationId(list[0]) || '')
      } catch (error) {
        if (isMounted) setErrorMessage(getApiMessage(error, 'Khong the tai danh sach hoi thoai.'))
      } finally {
        if (isMounted) setIsLoadingList(false)
      }
    }

    loadConversations()
    return () => {
      isMounted = false
    }
  }, [])

  useEffect(
    () =>
      subscribeSupportChat({
        onMessage: (event) => {
          if (event?.conversation) {
            setConversations((current) => upsertConversation(current, event.conversation))
            setSelectedId((current) => current || getConversationId(event.conversation))
          }
          if (event?.message && event.message.conversationId === selectedId) {
            setMessages((current) => mergeMessage(current, event.message))
          }
        },
      }),
    [selectedId],
  )

  useEffect(() => {
    if (!selectedId) {
      return undefined
    }

    let isMounted = true

    chatApi
      .getSupportMessages(selectedId)
      .then((list) => {
        if (isMounted) setMessages(list)
      })
      .catch((error) => {
        if (isMounted) setErrorMessage(getApiMessage(error, 'Khong the tai tin nhan.'))
      })
      .finally(() => {
        if (isMounted) setIsLoadingMessages(false)
      })

    return () => {
      isMounted = false
    }
  }, [selectedId])

  useEffect(() => {
    if (!selectedId) return undefined

    return subscribeChatConversation(selectedId, {
      onMessage: (event) => {
        if (event?.conversation) setConversations((current) => upsertConversation(current, event.conversation))
        if (event?.message) setMessages((current) => mergeMessage(current, event.message))
      },
    })
  }, [selectedId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length, selectedId])

  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    },
    [],
  )

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

  const refreshConversation = (conversation) => {
    if (conversation) setConversations((current) => upsertConversation(current, conversation))
  }

  const handleAccept = async () => {
    if (!selectedId || isMutating) return
    setIsMutating(true)
    setErrorMessage('')
    try {
      refreshConversation(await chatApi.acceptConversation(selectedId))
    } catch (error) {
      setErrorMessage(getApiMessage(error, 'Nhan hoi thoai that bai.'))
    } finally {
      setIsMutating(false)
    }
  }

  const handleClose = async () => {
    if (!selectedId || isMutating) return
    setIsMutating(true)
    setErrorMessage('')
    try {
      refreshConversation(await chatApi.closeConversation(selectedId))
    } catch (error) {
      setErrorMessage(getApiMessage(error, 'Dong hoi thoai that bai.'))
    } finally {
      setIsMutating(false)
    }
  }

  const handleSend = async (event) => {
    event.preventDefault()
    if (!selectedId || isSending) return
    if (!content.trim() && !imageFile) {
      setErrorMessage('Nhap noi dung hoac chon anh truoc khi gui.')
      return
    }

    setIsSending(true)
    setErrorMessage('')
    try {
      let uploadedImage = null
      if (imageFile) uploadedImage = await uploadImageToCloudinary(imageFile, 'CHAT')

      const sentMessage = await chatApi.sendSupportMessage(selectedId, {
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
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-emerald-950">Chat ho tro</h1>
        <p className="mt-1 text-sm font-semibold text-neutral-500">
          ADMIN va STAFF deu co the tra loi cung mot hoi thoai.
        </p>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="grid min-h-[calc(100vh-12rem)] overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm lg:grid-cols-[360px_1fr]">
        <aside className="border-b border-emerald-100 bg-emerald-50/40 lg:border-b-0 lg:border-r">
          <div className="flex h-16 items-center justify-between border-b border-emerald-100 px-4">
            <div className="flex items-center gap-2">
              <MessageCircle size={18} className="text-emerald-800" aria-hidden="true" />
              <span className="text-sm font-black text-emerald-950">Hoi thoai</span>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-emerald-800">
              {conversations.length}
            </span>
          </div>

          <div className="max-h-[calc(100vh-16rem)] overflow-y-auto p-3">
            {isLoadingList ? (
              <div className="flex h-40 items-center justify-center">
                <div className="h-9 w-9 animate-spin rounded-full border-2 border-emerald-100 border-t-emerald-700" />
              </div>
            ) : conversations.length ? (
              conversations.map((conversation) => {
                const conversationId = getConversationId(conversation)
                const isActive = conversationId === selectedId

                return (
                  <button
                    type="button"
                    key={conversationId}
                    onClick={() => {
                      setMessages([])
                      setIsLoadingMessages(true)
                      setSelectedId(conversationId)
                    }}
                    className={`mb-2 w-full rounded-xl border p-3 text-left transition ${
                      isActive
                        ? 'border-emerald-500 bg-white shadow-sm'
                        : 'border-transparent bg-white/65 hover:border-emerald-100 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-100 text-sm font-black text-emerald-800">
                          {conversation?.customerAvatarUrl ? (
                            <img src={conversation.customerAvatarUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            getInitial(getCustomerLabel(conversation))
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black text-emerald-950">{getCustomerLabel(conversation)}</p>
                          <p className="mt-1 truncate text-xs font-semibold text-neutral-500">
                            {formatLastMessage(conversation?.lastMessage)}
                          </p>
                        </div>
                      </div>
                      {conversation?.unreadCount > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-700 px-1 text-[10px] font-black text-white">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.08em]">
                      <span className={conversation?.status === 'CLOSED' ? 'text-red-600' : 'text-emerald-700'}>
                        {conversation?.status || 'OPEN'}
                      </span>
                      <span className="text-neutral-400">{formatTime(conversation?.lastMessageTime || conversation?.updatedAt)}</span>
                    </div>
                  </button>
                )
              })
            ) : (
              <div className="p-8 text-center text-sm font-semibold text-neutral-500">Chua co hoi thoai ho tro.</div>
            )}
          </div>
        </aside>

        <section className="flex min-h-[620px] flex-col">
          {selectedConversation ? (
            <>
              <div className="flex flex-wrap items-center gap-3 border-b border-emerald-100 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-black text-emerald-950">{getCustomerLabel(selectedConversation)}</p>
                  <p className="mt-1 text-xs font-semibold text-neutral-500">
                    {selectedConversation.status || 'OPEN'} - Last sender: {selectedConversation.lastSender || '-'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAccept}
                  disabled={isMutating}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-200 px-4 text-sm font-bold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
                >
                  <CheckCircle2 size={17} aria-hidden="true" />
                  Nhan xu ly
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isMutating}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-red-200 px-4 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  <XCircle size={17} aria-hidden="true" />
                  Dong
                </button>
              </div>

              <div className="flex-1 overflow-y-auto bg-[linear-gradient(180deg,#f8fcf8_0%,#ffffff_100%)] px-4 py-5 sm:px-6">
                {isLoadingMessages ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-100 border-t-emerald-700" />
                  </div>
                ) : (
                  <div className="space-y-4">
                   {messages.map((message) => {
                      const isCustomer = message?.senderType === 'USER'
                      const senderLabel = getSenderLabel(message)
                      const senderAvatar = getSenderAvatar(message)

                      return (
                        <div key={getMessageId(message)} className={`flex items-end gap-2 ${isCustomer ? 'justify-start' : 'justify-end'}`}>
                          {isCustomer && (
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-100 text-xs font-black text-emerald-800">
                              {senderAvatar ? <img src={senderAvatar} alt="" className="h-full w-full object-cover" /> : getInitial(senderLabel)}
                            </span>
                          )}
                          <div
                            className={`max-w-[78%] rounded-2xl px-4 py-3 shadow-sm ${
                              isCustomer
                                ? 'rounded-bl-md border border-emerald-100 bg-white text-neutral-900'
                                : 'rounded-br-md bg-emerald-700 text-white'
                            }`}
                          >
                            <p className={`mb-1 text-[11px] font-black uppercase tracking-[0.12em] ${isCustomer ? 'text-emerald-700' : 'text-white/70'}`}>
                              {senderLabel}
                            </p>
                            {message?.imageUrl && (
                              <img src={message.imageUrl} alt="Anh chat" className="mb-2 max-h-72 w-full rounded-xl object-cover" />
                            )}
                            {message?.content && <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.content}</p>}
                            <p className={`mt-2 text-[11px] ${isCustomer ? 'text-neutral-400' : 'text-white/65'}`}>
                              {formatTime(message?.createdAt)}
                            </p>
                          </div>
                          {!isCustomer && (
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-700 text-xs font-black text-white">
                              {senderAvatar ? <img src={senderAvatar} alt="" className="h-full w-full object-cover" /> : getInitial(senderLabel)}
                            </span>
                          )}
                        </div>
                      )
                    })}
                    <div ref={bottomRef} />
                  </div>
                )}
              </div>

              <form onSubmit={handleSend} className="border-t border-emerald-100 bg-white p-4">
                {imagePreview && (
                  <div className="mb-3 flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-2">
                    <img src={imagePreview} alt="Anh da chon" className="h-16 w-16 rounded-lg object-cover" />
                    <p className="min-w-0 flex-1 truncate text-sm font-semibold text-emerald-950">{imageFile?.name}</p>
                    <button type="button" onClick={() => setSelectedImage(null)} className="flex h-9 w-9 items-center justify-center rounded-lg text-emerald-900 hover:bg-white">
                      <X size={18} aria-hidden="true" />
                    </button>
                  </div>
                )}
                <div className="flex items-end gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(event) => setSelectedImage(event.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-emerald-100 text-emerald-800 hover:bg-emerald-50" aria-label="Chon anh">
                    <ImagePlus size={20} aria-hidden="true" />
                  </button>
                  <textarea
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    rows={1}
                    placeholder="Tra loi khach hang..."
                    className="max-h-32 min-h-12 flex-1 resize-none rounded-xl border border-emerald-100 px-4 py-3 text-sm outline-none focus:border-emerald-700"
                  />
                  <button type="submit" disabled={isSending || (!content.trim() && !imageFile)} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-800 text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-45" aria-label="Gui tin nhan">
                    <Send size={19} aria-hidden="true" />
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-center text-sm font-semibold text-neutral-500">
              Chon mot hoi thoai de bat dau ho tro.
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default AdminSupportChat
