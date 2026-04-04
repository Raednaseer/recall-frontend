'use client'

import { memo, useState } from 'react'
import { Copy, Check, ChevronRight, ChevronDown, FileText, Diamond } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

function CodeBlock({ code, language }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative my-3 rounded-lg bg-surface-elevated border border-border overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-surface">
        <span className="text-[11px] font-mono text-muted-foreground">
          {language || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="p-1 rounded hover:bg-accent/10 transition-colors"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-success" />
          ) : (
            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-[13px] leading-relaxed">
        <code className="font-mono text-foreground">{code}</code>
      </pre>
    </div>
  )
}

function SourceCard({ source }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-md bg-surface border border-border">
      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium text-foreground truncate">
          {source.filename}
        </p>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          {source.collection && (
            <Badge variant="secondary" className="h-4 text-[10px] px-1.5">
              {source.collection}
            </Badge>
          )}
          {source.page && <span>Page {source.page}</span>}
        </div>
      </div>
    </div>
  )
}

function Sources({ sources }) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!sources || sources.length === 0) return null

  return (
    <div className="mt-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        {sources.length} source{sources.length !== 1 ? 's' : ''}
      </button>
      
      {isExpanded && (
        <div className="grid gap-2 mt-2 sm:grid-cols-2">
          {sources.map((source, i) => (
            <SourceCard key={i} source={source} />
          ))}
        </div>
      )}
    </div>
  )
}

function ReasoningToggle({ reasoning }) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!reasoning) return null

  return (
    <div className="mt-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1.5 text-[12px] text-muted-foreground hover:underline transition-colors"
      >
        <Diamond className="h-3 w-3" />
        {isExpanded ? 'Hide reasoning' : 'View reasoning'}
      </button>
      
      {isExpanded && (
        <div className="mt-2 p-4 rounded-md bg-surface-elevated border-l-2 border-muted-foreground/30 max-h-60 overflow-y-auto">
          <p className="text-[13px] text-muted-foreground italic whitespace-pre-wrap leading-relaxed">
            {reasoning}
          </p>
        </div>
      )}
    </div>
  )
}

function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground animate-pulse">
      <Diamond className="h-3 w-3" />
      <span>Thinking...</span>
    </div>
  )
}

function parseMarkdown(text) {
  if (!text) return []
  
  const blocks = []
  const lines = text.split('\n')
  let currentBlock = null
  let codeBlock = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Code block start/end
    if (line.startsWith('```')) {
      if (codeBlock) {
        blocks.push({
          type: 'code',
          language: codeBlock.language,
          content: codeBlock.content.join('\n'),
        })
        codeBlock = null
      } else {
        codeBlock = {
          language: line.slice(3).trim(),
          content: [],
        }
      }
      continue
    }

    if (codeBlock) {
      codeBlock.content.push(line)
      continue
    }

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/)
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        content: headingMatch[2],
      })
      continue
    }

    // List item
    if (line.match(/^[-*]\s+/)) {
      blocks.push({
        type: 'listItem',
        content: line.replace(/^[-*]\s+/, ''),
      })
      continue
    }

    // Numbered list
    if (line.match(/^\d+\.\s+/)) {
      blocks.push({
        type: 'numberedListItem',
        content: line.replace(/^\d+\.\s+/, ''),
      })
      continue
    }

    // Empty line
    if (!line.trim()) {
      blocks.push({ type: 'break' })
      continue
    }

    // Regular paragraph
    blocks.push({ type: 'paragraph', content: line })
  }

  return blocks
}

function InlineFormatting({ text }) {
  if (!text) return null

  // Process inline formatting
  let result = text
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`(.+?)`/g, '<code class="px-1 py-0.5 rounded bg-surface-elevated text-[12px] font-mono">$1</code>')
    // Links
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-accent hover:underline" target="_blank" rel="noopener">$1</a>')

  return <span dangerouslySetInnerHTML={{ __html: result }} />
}

function MessageContent({ content, isStreaming, isThinking }) {
  // If currently thinking (streaming reasoning phase) and no answer content yet, show thinking indicator
  if (isThinking && !content) {
    return <ThinkingIndicator />
  }

  const blocks = parseMarkdown(content)

  return (
    <div className="space-y-2">
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'code':
            return <CodeBlock key={i} code={block.content} language={block.language} />
          
          case 'heading':
            const HeadingTag = `h${Math.min(block.level + 1, 6)}`
            return (
              <HeadingTag 
                key={i} 
                className={cn(
                  'font-semibold text-foreground',
                  block.level === 1 && 'text-lg',
                  block.level === 2 && 'text-base',
                  block.level >= 3 && 'text-sm'
                )}
              >
                <InlineFormatting text={block.content} />
              </HeadingTag>
            )
          
          case 'listItem':
            return (
              <div key={i} className="flex gap-2 pl-2">
                <span className="text-muted-foreground">·</span>
                <span><InlineFormatting text={block.content} /></span>
              </div>
            )
          
          case 'numberedListItem':
            return (
              <div key={i} className="flex gap-2 pl-2">
                <span><InlineFormatting text={block.content} /></span>
              </div>
            )
          
          case 'break':
            return <div key={i} className="h-2" />
          
          case 'paragraph':
          default:
            return (
              <p key={i} className="leading-relaxed">
                <InlineFormatting text={block.content} />
              </p>
            )
        }
      })}
      {isStreaming && <span className="streaming-cursor" />}
    </div>
  )
}

function ChatMessageComponent({ message, isStreaming = false, isThinking = false }) {
  const [showCopy, setShowCopy] = useState(false)
  const [copied, setCopied] = useState(false)

  const isUser = message.role === 'user'

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className={cn(
        'flex w-full animate-in fade-in duration-100',
        isUser ? 'justify-end' : 'justify-start'
      )}
      onMouseEnter={() => setShowCopy(true)}
      onMouseLeave={() => setShowCopy(false)}
    >
      <div
        className={cn(
          'relative px-5 py-3.5 text-[15px] leading-relaxed shadow-sm transition-all duration-300 ease-out',
          isUser 
            ? 'max-w-[75%] rounded-[24px] rounded-br-[4px] bg-primary text-primary-foreground shadow-primary/10' 
            : 'w-full max-w-full rounded-[24px] rounded-tl-[4px] bg-transparent text-foreground'
        )}
      >
        <MessageContent 
          content={message.content} 
          isStreaming={isStreaming} 
          isThinking={isThinking}
        />
        
        {/* Reasoning toggle - only shown after streaming completes */}
        {!isUser && !isStreaming && message.reasoning && (
          <ReasoningToggle reasoning={message.reasoning} />
        )}
        
        {!isUser && message.sources && (
          <Sources sources={message.sources} />
        )}

        {showCopy && !isStreaming && !isThinking && message.content && (
          <button
            onClick={handleCopy}
            className={cn(
              'absolute top-2 right-2 p-1 rounded hover:bg-accent/10 transition-colors',
              isUser ? 'hover:bg-white/10' : ''
            )}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-success" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>
        )}
      </div>
    </div>
  )
}

export const ChatMessage = memo(ChatMessageComponent)
