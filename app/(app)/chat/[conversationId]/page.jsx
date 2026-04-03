'use client'

import { useState, useRef, useEffect, useCallback, use } from 'react'
import { useAuth } from '@/lib/auth-context'
import { ChatMessage } from '@/components/chat-message'
import { ChatInput } from '@/components/chat-input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'

export default function ConversationPage({ params }) {
  const { conversationId } = use(params)
  const { authFetch, API_URL } = useAuth()
  const [messages, setMessages] = useState([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCollection, setSelectedCollection] = useState(null)
  const [collections, setCollections] = useState([])
  const [rateLimitRemaining, setRateLimitRemaining] = useState(null)
  const scrollRef = useRef(null)
  const abortControllerRef = useRef(null)

  // Fetch conversation history
  useEffect(() => {
    const fetchConversation = async () => {
      setIsLoading(true)
      try {
        const response = await authFetch(`/history/${conversationId}`)
        if (response.ok) {
          const data = await response.json()
          // Transform conversation messages to our format
          const conversationMessages = data.messages || []
          setMessages(conversationMessages.map(m => ({
            role: m.role,
            content: m.content,
            sources: m.sources || [],
          })))
        }
      } catch (error) {
        console.error('Failed to fetch conversation:', error)
        toast.error('Failed to load conversation')
      } finally {
        setIsLoading(false)
      }
    }
    
    if (conversationId) {
      fetchConversation()
    }
  }, [conversationId, authFetch])

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
      const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight
      }
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
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify({
          query: content,
          conversation_id: conversationId,
          collection: selectedCollection,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After') || 60
        setRateLimitRemaining(parseInt(retryAfter))
        
        const interval = setInterval(() => {
          setRateLimitRemaining(prev => {
            if (prev <= 1) {
              clearInterval(interval)
              return null
            }
            return prev - 1
          })
        }, 1000)

        setMessages(prev => prev.slice(0, -1))
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
            } catch (e) {
              // Ignore JSON parse errors
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

    } catch (error) {
      if (error.name === 'AbortError') return
      
      console.error('Chat error:', error)
      toast.error('Failed to send message')
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setIsStreaming(false)
      setIsThinking(false)
    }
  }, [conversationId, selectedCollection, isStreaming, API_URL])

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center">
          <div className="space-y-3 w-full max-w-3xl px-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className="h-16 rounded-lg bg-muted skeleton-pulse"
                  style={{ width: `${50 + Math.random() * 30}%` }}
                />
              </div>
            ))}
          </div>
        </div>
        <ChatInput
          onSend={handleSend}
          disabled={true}
          collections={collections}
          selectedCollection={selectedCollection}
          onSelectCollection={setSelectedCollection}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea ref={scrollRef} className="flex-1 px-4">
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
