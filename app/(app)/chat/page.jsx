'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { ChatMessage } from '@/components/chat-message'
import { ChatInput } from '@/components/chat-input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { ArrowUpRight, Diamond, AlignLeft, HelpCircle } from 'lucide-react'

const SUGGESTIONS = [
  { icon: ArrowUpRight, text: 'Summarize my latest upload' },
  { icon: Diamond, text: 'Extract key findings' },
  { icon: AlignLeft, text: 'Compare across documents' },
  { icon: HelpCircle, text: 'Explain core concepts' },
]

function EmptyState({ onSuggestionClick }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4">
      <h1 className="text-4xl font-light text-muted-foreground mb-2">Recall</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Ask anything about your documents
      </p>
      
      <div className="grid grid-cols-2 gap-3 max-w-md w-full">
        {SUGGESTIONS.map((suggestion, i) => (
          <button
            key={i}
            onClick={() => onSuggestionClick(suggestion.text)}
            className="flex items-center gap-3 p-3 rounded-lg border border-border bg-surface hover:bg-accent/5 transition-colors text-left"
          >
            <suggestion.icon className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-[13px] text-foreground">{suggestion.text}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function ChatPage() {
  const router = useRouter()
  const { authFetch, API_URL, token } = useAuth()
  const [messages, setMessages] = useState([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [conversationId, setConversationId] = useState(null)
  const [selectedCollection, setSelectedCollection] = useState(null)
  const [collections, setCollections] = useState([])
  const [rateLimitRemaining, setRateLimitRemaining] = useState(null)
  const scrollRef = useRef(null)
  const abortControllerRef = useRef(null)

  // Fetch collections
  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const response = await authFetch('/rag/files')
        if (response.ok) {
          const data = await response.json()
          const files = data.files || []
          const collectionMap = {}
          files.forEach(file => {
            const name = file.collection || 'default'
            collectionMap[name] = (collectionMap[name] || 0) + 1
          })
          setCollections(
            Object.entries(collectionMap).map(([name, count]) => ({ name, count }))
          )
        }
      } catch (error) {
        console.error('Failed to fetch collections:', error)
      }
    }
    fetchCollections()
  }, [authFetch])

  // Auto-scroll on new messages
  useEffect(() => {
  if (scrollRef.current) {
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }
}, [messages])

  const handleSend = useCallback(async (content) => {
    if (isStreaming) return

    // Add user message
    const userMessage = { role: 'user', content }
    setMessages(prev => [...prev, userMessage])
    setIsStreaming(true)

    // Prepare assistant message with reasoning field
    const assistantMessage = { role: 'assistant', content: '', reasoning: '', sources: [] }
    setMessages(prev => [...prev, assistantMessage])
    setIsThinking(true) // Start in thinking mode

    try {
      abortControllerRef.current = new AbortController()

      const response = await fetch(`${API_URL}/rag/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Authorization': `Bearer ${token || ''}`,
        },
        body: JSON.stringify({
          query: content,
          conversation_id: conversationId,
          ...(selectedCollection && { collection: selectedCollection }),
        }),
        signal: abortControllerRef.current.signal,
      })

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After') || 60
        setRateLimitRemaining(parseInt(retryAfter))
        
        // Countdown
        const interval = setInterval(() => {
          setRateLimitRemaining(prev => {
            if (prev <= 1) {
              clearInterval(interval)
              return null
            }
            return prev - 1
          })
        }, 1000)

        setMessages(prev => prev.slice(0, -1)) // Remove empty assistant message
        toast.error('Rate limit reached. Please wait.')
        setIsStreaming(false)
        return
      }

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let rawContent = '' // Full raw content including think tags
      let reasoningBuffer = ''
      let answerBuffer = ''
      let pendingTagBuffer = '' // For handling split tags
      let inReasoningMode = false
      let hasThinkTags = false
      let sources = []
      let newConversationId = conversationId

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.content) {
                rawContent += data.content
                
                // Process content with pending tag buffer
                let contentToProcess = pendingTagBuffer + data.content
                pendingTagBuffer = ''
                
                // Check for partial tags at the end
                const partialTagMatch = contentToProcess.match(/<\/?t(?:h(?:i(?:n(?:k)?)?)?)?$/i)
                if (partialTagMatch) {
                  pendingTagBuffer = partialTagMatch[0]
                  contentToProcess = contentToProcess.slice(0, -partialTagMatch[0].length)
                }
                
                // Process the content for think tags
                while (contentToProcess.length > 0) {
                  if (!inReasoningMode) {
                    // Look for <think> tag
                    const thinkStart = contentToProcess.toLowerCase().indexOf('<think>')
                    if (thinkStart !== -1) {
                      // Add any content before the tag to the answer
                      answerBuffer += contentToProcess.slice(0, thinkStart)
                      contentToProcess = contentToProcess.slice(thinkStart + 7)
                      inReasoningMode = true
                      hasThinkTags = true
                      setIsThinking(true)
                    } else {
                      answerBuffer += contentToProcess
                      contentToProcess = ''
                    }
                  } else {
                    // Look for </think> tag
                    const thinkEnd = contentToProcess.toLowerCase().indexOf('</think>')
                    if (thinkEnd !== -1) {
                      // Add content before the tag to reasoning
                      reasoningBuffer += contentToProcess.slice(0, thinkEnd)
                      contentToProcess = contentToProcess.slice(thinkEnd + 8)
                      inReasoningMode = false
                      setIsThinking(false)
                    } else {
                      reasoningBuffer += contentToProcess
                      contentToProcess = ''
                    }
                  }
                }
                
                // Update the message with current buffers
                setMessages(prev => {
                  const newMessages = [...prev]
                  const lastMessage = newMessages[newMessages.length - 1]
                  if (lastMessage.role === 'assistant') {
                    lastMessage.content = answerBuffer.trim()
                    lastMessage.reasoning = reasoningBuffer.trim()
                  }
                  return newMessages
                })
              }

              if (data.sources) {
                sources = data.sources
              }

              if (data.conversation_id) {
                newConversationId = data.conversation_id
              }
            } catch (e) {
              // Ignore JSON parse errors for partial data
            }
          }
        }
      }
      
      // If no think tags were present, set isThinking to false
      if (!hasThinkTags) {
        setIsThinking(false)
      }

      // Update final message with sources
      setMessages(prev => {
        const newMessages = [...prev]
        const lastMessage = newMessages[newMessages.length - 1]
        if (lastMessage.role === 'assistant') {
          lastMessage.sources = sources
        }
        return newMessages
      })

      // Update conversation ID and redirect
      if (newConversationId && newConversationId !== conversationId) {
        setConversationId(newConversationId)
        router.replace(`/chat/${newConversationId}`, { scroll: false })
      }

    } catch (error) {
      if (error.name === 'AbortError') return
      
      console.error('Chat error:', error)
      toast.error('Failed to send message')
      
      // Remove failed assistant message
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setIsStreaming(false)
      setIsThinking(false)
    }
  }, [conversationId, selectedCollection, isStreaming, authFetch, API_URL, router, token])

  const handleSuggestionClick = (text) => {
    handleSend(text)
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {isEmpty ? (
        <EmptyState onSuggestionClick={handleSuggestionClick} />
      ) : (
        <div className="flex-1 relative min-h-0">
          <ScrollArea viewportRef={scrollRef} className="absolute inset-0 px-4">
          <div className="max-w-3xl mx-auto py-6 space-y-6">
            {messages.map((message, i) => (
              <ChatMessage
                key={i}
                message={message}
                isStreaming={isStreaming && i === messages.length - 1 && message.role === 'assistant'}
                isThinking={isThinking && i === messages.length - 1 && message.role === 'assistant'}
              />
            ))}
          </div>
          </ScrollArea>
        </div>
      )}

      <ChatInput
        onSend={handleSend}
        disabled={isStreaming}
        collections={collections}
        selectedCollection={selectedCollection}
        onSelectCollection={setSelectedCollection}
        rateLimitRemaining={rateLimitRemaining}
      />
    </div>
  )
}
