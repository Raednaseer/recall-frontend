'use client'

import { useState, useRef, useEffect } from 'react'
import { ArrowUp, ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export function ChatInput({
  onSend,
  disabled = false,
  collections = [],
  selectedCollection,
  onSelectCollection,
  rateLimitRemaining = null,
}) {
  const [message, setMessage] = useState('')
  const textareaRef = useRef(null)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      const newHeight = Math.min(textarea.scrollHeight, 160) // Max 5 rows roughly
      textarea.style.height = `${newHeight}px`
    }
  }, [message])

  const handleSubmit = (e) => {
    e?.preventDefault()
    if (!message.trim() || disabled) return
    
    onSend(message.trim())
    setMessage('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const hasContent = message.trim().length > 0

  if (rateLimitRemaining !== null && rateLimitRemaining <= 0) {
    return (
      <div className="px-4 py-3 bg-muted/50 border-t border-border">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm text-muted-foreground">
            Rate limit reached — retry in {rateLimitRemaining}s
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 pb-4 pt-2 shrink-0">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-end gap-2 p-2 rounded-xl border border-border bg-surface">
          {/* Collection Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[13px] text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors shrink-0">
                <span className="truncate max-w-[100px]">
                  {selectedCollection || 'All files'}
                </span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem onClick={() => onSelectCollection(null)}>
                All files
              </DropdownMenuItem>
              {collections.map(col => (
                <DropdownMenuItem 
                  key={col.name}
                  onClick={() => onSelectCollection(col.name)}
                >
                  <span className="text-muted-foreground mr-1">/</span>
                  {col.name}
                  <span className="ml-auto text-[11px] text-muted-foreground">
                    {col.count}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message Recall..."
            disabled={disabled}
            rows={1}
            className="flex-1 resize-none bg-transparent border-0 outline-none text-[14px] text-foreground placeholder:text-muted-foreground leading-relaxed py-1.5 min-h-[36px] max-h-[160px]"
          />

          {/* Send Button */}
          <button
            onClick={handleSubmit}
            disabled={!hasContent || disabled}
            className={cn(
              'p-2 rounded-lg transition-colors shrink-0',
              hasContent && !disabled
                ? 'bg-accent text-accent-foreground hover:bg-accent/90'
                : 'bg-muted text-muted-foreground'
            )}
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>

        {/* Helper text */}
        <p className="text-center text-[11px] text-muted-foreground mt-2">
          ↵ to send · Shift + ↵ for new line
        </p>
      </div>
    </div>
  )
}
