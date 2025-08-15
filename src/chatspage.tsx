const ChatsPage: React.FC = () => {
  const { user, token, logout } = useAuth()
  const navigate = useNavigate()

  const [chats, setChats] = useState<Chat[]>([])
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState<string>('')
  const [loadingChats, setLoadingChats] = useState<boolean>(false)
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false)
  const [chatsError, setChatsError] = useState<string | null>(null)
  const [messagesError, setMessagesError] = useState<string | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    const fetchChats = async () => {
      setLoadingChats(true)
      try {
        const res = await fetch('/api/chats', {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        })
        if (res.status === 401) {
          logout()
          navigate('/login')
          return
        }
        if (!res.ok) throw new Error('Failed to load chats')
        const data = await res.json()
        setChats(data)
        setChatsError(null)
      } catch (e: any) {
        if (e.name === 'AbortError') return
        setChatsError(e.message)
      } finally {
        setLoadingChats(false)
      }
    }
    fetchChats()
    return () => {
      controller.abort()
    }
  }, [token, logout, navigate])

  useEffect(() => {
    if (!selectedChat || !token) return
    const controller = new AbortController()
    const fetchMessages = async () => {
      setLoadingMessages(true)
      try {
        const res = await fetch(
          `/api/chats/${selectedChat.id}/messages`,
          {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          }
        )
        if (res.status === 401) {
          logout()
          navigate('/login')
          return
        }
        if (!res.ok) throw new Error('Failed to load messages')
        const data = await res.json()
        setMessages(data)
        setMessagesError(null)
      } catch (e: any) {
        if (e.name === 'AbortError') return
        setMessagesError(e.message)
      } finally {
        setLoadingMessages(false)
      }
    }
    fetchMessages()
    return () => {
      controller.abort()
    }
  }, [selectedChat, token, logout, navigate])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSelectChat = (chat: Chat) => {
    setSelectedChat(chat)
    setMessages([])
    setMessagesError(null)
    setSendError(null)
  }

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedChat) return
    setSendError(null)
    const temp: Message = {
      id: Date.now().toString(),
      senderId: user.id,
      content: newMessage.trim(),
      timestamp: new Date().toISOString(),
    }
    setMessages(prev => [...prev, temp])
    setNewMessage('')
    try {
      const res = await fetch(
        `/api/chats/${selectedChat.id}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content: temp.content }),
        }
      )
      if (res.status === 401) {
        logout()
        navigate('/login')
        return
      }
      if (!res.ok) throw new Error('Failed to send message')
      const saved = await res.json()
      setMessages(prev =>
        prev.map(msg => (msg.id === temp.id ? saved : msg))
      )
    } catch (e: any) {
      setSendError(e.message)
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <aside
        style={{
          width: '250px',
          borderRight: '1px solid #ddd',
          padding: '1rem',
          overflowY: 'auto',
        }}
      >
        <h2>Chats</h2>
        {loadingChats && <p>Loading...</p>}
        {chatsError && <p style={{ color: 'red' }}>{chatsError}</p>}
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {chats.map(chat => (
            <li
              key={chat.id}
              onClick={() => handleSelectChat(chat)}
              style={{
                padding: '0.5rem',
                cursor: 'pointer',
                background:
                  selectedChat?.id === chat.id
                    ? '#f0f0f0'
                    : 'transparent',
              }}
            >
              {chat.name}
            </li>
          ))}
        </ul>
      </aside>
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {selectedChat ? (
          <>
            <header
              style={{
                padding: '1rem',
                borderBottom: '1px solid #ddd',
              }}
            >
              <h2>{selectedChat.name}</h2>
            </header>
            <div
              style={{
                flex: 1,
                padding: '1rem',
                overflowY: 'auto',
              }}
            >
              {loadingMessages && <p>Loading messages...</p>}
              {messagesError && (
                <p style={{ color: 'red' }}>{messagesError}</p>
              )}
              {messages.map(msg => (
                <div
                  key={msg.id}
                  style={{
                    marginBottom: '0.5rem',
                    textAlign:
                      msg.senderId === user.id ? 'right' : 'left',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '0.5rem 1rem',
                      borderRadius: '1rem',
                      background:
                        msg.senderId === user.id
                          ? '#daf1da'
                          : '#f1f1f1',
                    }}
                  >
                    {msg.content}
                  </span>
                  <div
                    style={{
                      fontSize: '0.75rem',
                      color: '#888',
                    }}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            {sendError && (
              <p style={{ color: 'red', margin: '0.5rem 1rem' }}>
                {sendError}
              </p>
            )}
            <form
              onSubmit={handleSendMessage}
              style={{
                padding: '1rem',
                borderTop: '1px solid #ddd',
                display: 'flex',
              }}
            >
              <input
                type="text"
                name="message"
                aria-label="Type a message"
                value={newMessage}
                onChange={e => {
                  setNewMessage(e.target.value)
                  setSendError(null)
                }}
                placeholder="Type a message..."
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  marginRight: '0.5rem',
                }}
              />
              <button
                type="submit"
                style={{ padding: '0.5rem 1rem' }}
              >
                Send
              </button>
            </form>
          </>
        ) : (
          <div
            style={{
              flex: 1,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <p>Select a chat to start messaging</p>
          </div>
        )}
      </main>
    </div>
  )
}

export default ChatsPage