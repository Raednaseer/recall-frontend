'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Sidebar, MobileHeader } from '@/components/sidebar'
import { toast } from 'sonner'

export function AppShell({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const { authFetch, isAuthenticated, isLoading } = useAuth()
  
  const [conversations, setConversations] = useState([])
  const [collections, setCollections] = useState([])
  const [selectedCollection, setSelectedCollection] = useState(null)
  const [healthStatus, setHealthStatus] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [skip, setSkip] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Get active conversation ID from pathname
  const activeConversationId = pathname.startsWith('/chat/') 
    ? pathname.split('/chat/')[1] 
    : null

  // Fetch conversation history
  const fetchHistory = useCallback(async (reset = false) => {
    if (loadingHistory) return
    
    setLoadingHistory(true)
    try {
      const currentSkip = reset ? 0 : skip
      const response = await authFetch(`/history?limit=20&skip=${currentSkip}`)
      
      if (response.ok) {
        const data = await response.json()
        
        if (reset) {
          setConversations(data.conversations || [])
          setSkip(20)
        } else {
          setConversations(prev => [...prev, ...(data.conversations || [])])
          setSkip(prev => prev + 20)
        }
        
        setHasMore((data.conversations || []).length === 20)
      }
    } catch (error) {
      console.error('Failed to fetch history:', error)
    } finally {
      setLoadingHistory(false)
    }
  }, [authFetch, skip, loadingHistory])

  // Fetch collections from files
  const fetchCollections = useCallback(async () => {
    try {
      const response = await authFetch('/rag/files')
      
      if (response.ok) {
        const data = await response.json()
        const files = data.files || []
        
        // Get unique collections with counts
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
  }, [authFetch])

  // Fetch health status
  const fetchHealth = useCallback(async () => {
    try {
      const response = await authFetch('/health')
      if (response.ok) {
        const data = await response.json()
        setHealthStatus(data)
      }
    } catch (error) {
      console.error('Failed to fetch health:', error)
    }
  }, [authFetch])

  // Initial fetch
  useEffect(() => {
    if (isAuthenticated) {
      fetchHistory(true)
      fetchCollections()
      fetchHealth()
    }
  }, [isAuthenticated])

  // Poll health every 60 seconds
  useEffect(() => {
    if (!isAuthenticated) return
    
    const interval = setInterval(fetchHealth, 60000)
    return () => clearInterval(interval)
  }, [isAuthenticated, fetchHealth])

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isLoading, isAuthenticated, router])

  const handleDeleteConversation = async (conversationId) => {
    try {
      const response = await authFetch(`/history/${conversationId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setConversations(prev => prev.filter(c => c.id !== conversationId))
        
        if (activeConversationId === conversationId) {
          router.push('/chat')
        }
        
        toast.success('Conversation deleted')
      } else {
        toast.error('Failed to delete conversation')
      }
    } catch (error) {
      toast.error('Failed to delete conversation')
    }
  }

  const handleNewChat = () => {
    router.push('/chat')
    setSidebarOpen(false)
  }

  const handleLoadMore = () => {
    if (hasMore && !loadingHistory) {
      fetchHistory()
    }
  }

  // Refresh conversations when a new message is sent
  const refreshConversations = useCallback(() => {
    fetchHistory(true)
  }, [fetchHistory])

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="h-screen flex bg-background">
      <Sidebar
        conversations={conversations}
        collections={collections}
        activeConversationId={activeConversationId}
        selectedCollection={selectedCollection}
        onSelectCollection={setSelectedCollection}
        onDeleteConversation={handleDeleteConversation}
        onNewChat={handleNewChat}
        onLoadMore={handleLoadMore}
        hasMore={hasMore}
        healthStatus={healthStatus}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <MobileHeader onOpenSidebar={() => setSidebarOpen(true)} />
        <div className="flex-1 overflow-hidden pt-12 md:pt-0">
          {typeof children === 'function' 
            ? children({ 
                selectedCollection, 
                onSelectCollection: setSelectedCollection,
                refreshConversations,
                collections,
              }) 
            : children}
        </div>
      </main>
    </div>
  )
}
