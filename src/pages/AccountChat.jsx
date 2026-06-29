import { useEffect, useMemo, useRef, useState } from 'react'
import { ImagePlus, MessageCircle, Send, X } from 'lucide-react'

import { chatApi } from '../features/chat'
import { getApiMessage, tokenStorage } from '../shared/api'
import { subscribeChatConversation } from '../shared/services/chatSocket'
import { uploadImageToCloudinary } from '../shared/services/cloudinaryUpload'

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

function getSenderLabel(message) {
  return message?.senderName || message?.senderType || message?.senderId || 'Nguoi dung'
}

function getSenderAvatar(message) {
  return message?.senderAvatarUrl || ''
}

function getInitial(value) {
  return String(value || 'U').trim().charAt(0).toUpperCase() || 'U'
}

function AccountChat() {
  const fileInputRef = useRef(null)
  const bottomRef = useRef(null)
  const previewUrlRef = useRef('')
  const [conversation, setConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [content, setContent] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const user = tokenStorage.getUser()
  const conversationId = getConversationId(conversation)

  const title = useMemo(() => {
    if (conversation?.status === 'CLOSED') return 'Hoi thoai da dong'
    if (conversation?.status === 'WAITING_ADMIN') return 'Dang cho nhan vien ho tro'
    return 'Dang chat voi Poloman'
  }, [conversation?.status])

  useEffect(() => {
    let isMounted = true

    async function loadChat() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const nextConversation = await chatApi.getMyConversation()
        const nextConversationId = getConversationId(nextConversation)
        const nextMessages = nextConversationId ? await chatApi.getMyMessages(nextConversationId) : []

        if (!isMounted) return
        setConversation(nextConversation)
        setMessages(nextMessages)
      } catch (error) {
        if (isMounted) setErrorMessage(getApiMessage(error, 'Khong the tai chat ho tro.'))
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadChat()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!conversationId) return undefined

    return subscribeChatConversation(conversationId, {
      onMessage: (event) => {
        if (event?.conversation) setConversation(event.conversation)
        if (event?.message) setMessages((current) => mergeMessage(current, event.message))
      },
    })
  }, [conversationId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length])

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
      if (imageFile) {
        uploadedImage = await uploadImageToCloudinary(imageFile, 'CHAT')
      }

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
    <div className="-mx-4 min-h-[calc(100vh-9rem)] bg-[#f7fbf7] px-4 py-6 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
      <div className="mx-auto flex max-w-5xl flex-col overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-[0_24px_80px_rgba(20,83,45,0.10)]">
        <div className="flex items-center gap-4 border-b border-emerald-100 bg-emerald-950 px-5 py-4 text-white">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/12">
            <MessageCircle size={22} aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-base font-black">Chat ho tro</h1>
            <p className="mt-1 text-xs font-semibold text-emerald-50/75">{title}</p>
          </div>
        </div>

        {errorMessage && (
          <div className="border-b border-red-100 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="h-[60vh] min-h-[420px] overflow-y-auto bg-[linear-gradient(180deg,#f8fcf8_0%,#ffffff_100%)] px-4 py-5 sm:px-6">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-100 border-t-emerald-700" />
            </div>
          ) : messages.length ? (
            <div className="space-y-4">
              {messages.map((message) => {
                const isMine = message?.senderType === 'USER'
                const senderLabel = getSenderLabel(message)
                const senderAvatar = getSenderAvatar(message)

                return (
                  <div key={getMessageId(message)} className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
                    {!isMine && (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-100 text-xs font-black text-emerald-800">
                        {senderAvatar ? <img src={senderAvatar} alt="" className="h-full w-full object-cover" /> : getInitial(senderLabel)}
                      </span>
                    )}
                    <div
                      className={`max-w-[78%] rounded-2xl px-4 py-3 shadow-sm ${
                        isMine
                          ? 'rounded-br-md bg-emerald-700 text-white'
                          : 'rounded-bl-md border border-emerald-100 bg-white text-neutral-900'
                      }`}
                    >
                      <p className={`mb-1 text-[11px] font-black uppercase tracking-[0.12em] ${isMine ? 'text-white/70' : 'text-emerald-700'}`}>
                        {senderLabel}
                      </p>
                      {message?.imageUrl && (
                        <img
                          src={message.imageUrl}
                          alt="Anh chat"
                          className="mb-2 max-h-72 w-full rounded-xl object-cover"
                        />
                      )}
                      {message?.content && <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.content}</p>}
                      <p className={`mt-2 text-[11px] ${isMine ? 'text-white/65' : 'text-neutral-400'}`}>
                        {formatTime(message?.createdAt)}
                      </p>
                    </div>
                    {isMine && (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-700 text-xs font-black text-white">
                        {senderAvatar ? <img src={senderAvatar} alt="" className="h-full w-full object-cover" /> : getInitial(senderLabel)}
                      </span>
                    )}
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-center text-sm font-semibold text-neutral-500">
              Hay gui loi nhan dau tien de Poloman ho tro ban.
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
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-emerald-100 text-emerald-800 hover:bg-emerald-50"
              aria-label="Chon anh"
            >
              <ImagePlus size={20} aria-hidden="true" />
            </button>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={1}
              placeholder={`Xin chao ${user?.fullName || user?.username || ''}, ban can ho tro gi?`}
              className="max-h-32 min-h-12 flex-1 resize-none rounded-xl border border-emerald-100 px-4 py-3 text-sm outline-none focus:border-emerald-700"
            />
            <button
              type="submit"
              disabled={isSending || (!content.trim() && !imageFile)}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-800 text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-45"
              aria-label="Gui tin nhan"
            >
              <Send size={19} aria-hidden="true" />
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AccountChat
