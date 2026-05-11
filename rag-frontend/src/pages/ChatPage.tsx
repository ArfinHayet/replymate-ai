import { useState, useRef, useEffect, type KeyboardEvent } from 'react'
import { Send, Loader2, Bot, User, Zap, Trash2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { sendChat } from '@/lib/api'

interface Message {
  role: 'user' | 'assistant'
  content: string
  cached?: boolean
}

const SESSION_KEY = 'rag-session-id'

function getOrCreateSession(): string {
  let id = localStorage.getItem(SESSION_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(SESSION_KEY, id)
  }
  return id
}

export function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const sessionId = useRef(getOrCreateSession())
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setLoading(true)
    try {
      const res = await sendChat(text, sessionId.current)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: res.answer, cached: res.cached },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Something went wrong. Please try again.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void send()
    }
  }

  const clearChat = () => {
    setMessages([])
    // New session so history is fresh
    const newId = crypto.randomUUID()
    localStorage.setItem(SESSION_KEY, newId)
    sessionId.current = newId
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-6 py-4 shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Chat</h1>
          <p className="text-sm text-muted-foreground">
            Ask questions about your uploaded documents
          </p>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearChat} className="gap-1.5 text-muted-foreground">
            <Trash2 className="h-4 w-4" />
            New chat
          </Button>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0 px-6">
        <div className="py-6 space-y-5 max-w-3xl mx-auto">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground">
              <Bot className="h-12 w-12 mb-4 opacity-20" />
              <p className="font-medium text-base">Ask anything about your documents</p>
              <p className="text-sm mt-1">
                Answers come from uploaded PDFs via semantic search
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn('flex items-start gap-3', msg.role === 'user' && 'flex-row-reverse')}
            >
              {/* Avatar */}
              <div
                className={cn(
                  'shrink-0 h-8 w-8 rounded-full flex items-center justify-center',
                  msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted',
                )}
              >
                {msg.role === 'user' ? (
                  <User className="h-4 w-4" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
              </div>

              {/* Bubble + cached badge */}
              <div className={cn('flex flex-col gap-1.5 max-w-xl', msg.role === 'user' && 'items-end')}>
                <div
                  className={cn(
                    'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-tr-sm whitespace-pre-wrap'
                      : 'bg-muted rounded-tl-sm prose prose-sm max-w-none prose-p:my-1 prose-headings:mt-3 prose-headings:mb-1 prose-li:my-0 prose-ul:my-1 prose-ol:my-1 prose-pre:bg-background prose-pre:border prose-code:text-foreground prose-code:bg-background prose-code:px-1 prose-code:rounded',
                  )}
                >
                  {msg.role === 'user' ? (
                    msg.content
                  ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  )}
                </div>
                {msg.cached && (
                  <Badge variant="secondary" className="text-xs gap-1 w-fit">
                    <Zap className="h-3 w-3" />
                    Cached
                  </Badge>
                )}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div className="flex items-start gap-3">
              <div className="shrink-0 h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                <Bot className="h-4 w-4" />
              </div>
              <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input bar */}
      <div className="border-t p-4 shrink-0 bg-background">
        <div className="max-w-3xl mx-auto flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question… (Enter to send · Shift+Enter for new line)"
            className="resize-none min-h-[44px] max-h-[200px]"
            rows={1}
            disabled={loading}
          />
          <Button
            size="icon"
            onClick={() => void send()}
            disabled={!input.trim() || loading}
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
