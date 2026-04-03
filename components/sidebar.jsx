'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Plus,
  Search,
  MoreHorizontal,
  Sun,
  Moon,
  LogOut,
  ChevronRight,
  ChevronDown,
  Folder,
  X,
  Menu,
  FileText,
  Settings,
  MessageSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'

function groupConversationsByDate(conversations) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const lastWeek = new Date(today)
  lastWeek.setDate(lastWeek.getDate() - 7)

  const groups = {
    today: [],
    yesterday: [],
    lastWeek: [],
    older: [],
  }

  conversations.forEach(conv => {
    const date = new Date(conv.updated_at || conv.created_at)
    if (date >= today) {
      groups.today.push(conv)
    } else if (date >= yesterday) {
      groups.yesterday.push(conv)
    } else if (date >= lastWeek) {
      groups.lastWeek.push(conv)
    } else {
      groups.older.push(conv)
    }
  })

  return groups
}

function ConversationItem({ conversation, isActive, onDelete }) {
  const [showDelete, setShowDelete] = useState(false)

  return (
    <div
      className={cn(
        'group relative flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer transition-colors',
        isActive 
          ? 'bg-sidebar-accent border-l-2 border-l-sidebar-primary' 
          : 'hover:bg-sidebar-accent/50'
      )}
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
    >
      <Link 
        href={`/chat/${conversation.id}`} 
        className="flex-1 truncate text-[13px] text-sidebar-foreground"
      >
        {conversation.title || 'New conversation'}
      </Link>
      
      {showDelete && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 rounded hover:bg-sidebar-accent">
              <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32">
            <DropdownMenuItem
              onClick={() => onDelete(conversation.id)}
              className="text-destructive focus:text-destructive"
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}

function ConversationGroup({ title, conversations, activeId, onDelete }) {
  if (conversations.length === 0) return null

  return (
    <div className="mb-4">
      <h3 className="px-2 mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <div className="space-y-0.5">
        {conversations.map(conv => (
          <ConversationItem
            key={conv.id}
            conversation={conv}
            isActive={conv.id === activeId}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  )
}

function CollectionsSection({ collections, selectedCollection, onSelectCollection }) {
  const [isExpanded, setIsExpanded] = useState(true)

  if (collections.length === 0) return null

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1 px-2 mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors w-full"
      >
        {isExpanded ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        Collections
      </button>
      
      {isExpanded && (
        <div className="space-y-0.5">
          {collections.map(collection => (
            <button
              key={collection.name}
              onClick={() => onSelectCollection(
                selectedCollection === collection.name ? null : collection.name
              )}
              className={cn(
                'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] transition-colors',
                selectedCollection === collection.name
                  ? 'bg-sidebar-accent text-sidebar-foreground'
                  : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              )}
            >
              <span className="text-muted-foreground">/</span>
              <span className="flex-1 text-left truncate">{collection.name}</span>
              <span className="text-[11px] text-muted-foreground">{collection.count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function HealthIndicator({ status }) {
  const getColor = () => {
    if (!status) return 'bg-muted-foreground'
    if (status.status === 'ok') return 'bg-success'
    if (status.status === 'degraded') return 'bg-amber-500'
    return 'bg-destructive'
  }

  const getTooltip = () => {
    if (!status) return 'Checking status...'
    const services = []
    if (status.mongodb !== undefined) services.push(`MongoDB ${status.mongodb ? '✓' : '✗'}`)
    if (status.redis !== undefined) services.push(`Redis ${status.redis ? '✓' : '✗'}`)
    if (status.qdrant !== undefined) services.push(`Qdrant ${status.qdrant ? '✓' : '✗'}`)
    return services.join(' · ') || 'Services status'
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('w-2 h-2 rounded-full', getColor())} />
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {getTooltip()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function Sidebar({ 
  conversations = [], 
  collections = [],
  activeConversationId,
  selectedCollection,
  onSelectCollection,
  onDeleteConversation,
  onNewChat,
  onLoadMore,
  hasMore,
  healthStatus,
  isOpen,
  onClose,
}) {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const [searchQuery, setSearchQuery] = useState('')
  const observerRef = useRef(null)

  const groupedConversations = groupConversationsByDate(
    conversations.filter(c => 
      !searchQuery || 
      c.title?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  )

  // Infinite scroll
  const lastItemRef = useCallback(node => {
    if (observerRef.current) observerRef.current.disconnect()
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && onLoadMore) {
        onLoadMore()
      }
    })
    if (node) observerRef.current.observe(node)
  }, [hasMore, onLoadMore])

  const userInitial = user?.email?.charAt(0).toUpperCase() || '?'

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}
      
      <aside 
        className={cn(
          'fixed md:relative z-50 flex flex-col h-full w-[260px] bg-sidebar border-r border-sidebar-border transition-transform duration-200',
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
          <Link href="/chat" className="flex items-center gap-1.5">
            <span className="text-muted-foreground text-sm">◆</span>
            <span className="font-semibold text-sidebar-foreground">Recall</span>
          </Link>
          <button 
            onClick={onClose}
            className="p-1 rounded hover:bg-sidebar-accent md:hidden"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <Button
            onClick={onNewChat}
            variant="outline"
            className="w-full justify-start gap-2 h-9 border-sidebar-border bg-transparent hover:bg-sidebar-accent text-sidebar-foreground"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </div>

        {/* Navigation */}
        <nav className="px-3 pb-2">
          <Link
            href="/chat"
            onClick={onClose}
            className={cn(
              'flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] transition-colors',
              pathname === '/chat' || pathname.startsWith('/chat/')
                ? 'bg-sidebar-accent text-sidebar-foreground'
                : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
            )}
          >
            <MessageSquare className="h-4 w-4" />
            Chat
          </Link>
          <Link
            href="/documents"
            onClick={onClose}
            className={cn(
              'flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] transition-colors',
              pathname === '/documents'
                ? 'bg-sidebar-accent text-sidebar-foreground'
                : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
            )}
          >
            <FileText className="h-4 w-4" />
            Documents
          </Link>
          <Link
            href="/settings"
            onClick={onClose}
            className={cn(
              'flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] transition-colors',
              pathname === '/settings'
                ? 'bg-sidebar-accent text-sidebar-foreground'
                : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
            )}
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </nav>

        {/* Search */}
        <div className="px-3 pb-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 bg-transparent border-sidebar-border text-[13px] placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Conversations & Collections */}
        <ScrollArea className="flex-1 px-2">
          <ConversationGroup
            title="Today"
            conversations={groupedConversations.today}
            activeId={activeConversationId}
            onDelete={onDeleteConversation}
          />
          <ConversationGroup
            title="Yesterday"
            conversations={groupedConversations.yesterday}
            activeId={activeConversationId}
            onDelete={onDeleteConversation}
          />
          <ConversationGroup
            title="Previous 7 Days"
            conversations={groupedConversations.lastWeek}
            activeId={activeConversationId}
            onDelete={onDeleteConversation}
          />
          <ConversationGroup
            title="Older"
            conversations={groupedConversations.older}
            activeId={activeConversationId}
            onDelete={onDeleteConversation}
          />
          
          {hasMore && (
            <div ref={lastItemRef} className="h-4" />
          )}

          <div className="border-t border-sidebar-border my-4" />

          <CollectionsSection
            collections={collections}
            selectedCollection={selectedCollection}
            onSelectCollection={onSelectCollection}
          />
        </ScrollArea>

        {/* Footer */}
        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-7 h-7 rounded-full bg-sidebar-accent flex items-center justify-center text-[11px] font-medium text-sidebar-foreground">
                {userInitial}
              </div>
              <span className="text-[13px] text-sidebar-foreground truncate flex-1">
                {user?.email}
              </span>
            </div>
            
            <div className="flex items-center gap-1">
              <HealthIndicator status={healthStatus} />
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                      className="p-1.5 rounded hover:bg-sidebar-accent transition-colors"
                    >
                      {theme === 'dark' ? (
                        <Sun className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Moon className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    Toggle theme
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={logout}
                      className="p-1.5 rounded hover:bg-sidebar-accent transition-colors"
                    >
                      <LogOut className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    Sign out
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

export function MobileHeader({ onOpenSidebar }) {
  return (
    <div className="fixed top-0 left-0 right-0 h-12 bg-background border-b border-border flex items-center px-4 md:hidden z-30">
      <button
        onClick={onOpenSidebar}
        className="p-1.5 rounded hover:bg-accent/10 transition-colors"
      >
        <Menu className="h-5 w-5 text-foreground" />
      </button>
      <div className="flex-1 text-center">
        <span className="text-muted-foreground text-sm mr-1">◆</span>
        <span className="font-semibold text-foreground">Recall</span>
      </div>
      <div className="w-8" />
    </div>
  )
}
