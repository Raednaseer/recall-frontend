'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Upload,
  FileText,
  File,
  Trash2,
  ArrowUp,
  ArrowDown,
  Check,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

function DropZone({ onUpload, isUploading, progress, collections }) {
  const [isDragging, setIsDragging] = useState(false)
  const [collection, setCollection] = useState('')
  const [openCollectionPicker, setOpenCollectionPicker] = useState(false)
  const fileInputRef = useRef(null)

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      onUpload(files[0], collection)
    }
  }

  const handleFileSelect = (e) => {
    const files = e.target.files
    if (files && files.length > 0) {
      onUpload(files[0], collection)
    }
    e.target.value = ''
  }

  return (
    <div className="mb-6">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={cn(
          'relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
          isDragging
            ? 'border-accent bg-accent/5'
            : 'border-border hover:border-muted-foreground/50'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />
        
        {isUploading ? (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">Uploading...</div>
            <Progress value={progress} className="w-full max-w-xs mx-auto" />
          </div>
        ) : (
          <>
            <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-foreground">
              Drop files here or click to upload
            </p>
            <p className="text-[12px] text-muted-foreground mt-1">
              PDF, TXT · Max 10 MB
            </p>
          </>
        )}
      </div>

      {/* Collection selector */}
      <div className="mt-3 flex items-center gap-2">
        <span className="text-[13px] text-muted-foreground">/</span>
        <Popover open={openCollectionPicker} onOpenChange={setOpenCollectionPicker}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={openCollectionPicker}
              className="h-8 justify-between text-[13px] min-w-[160px]"
            >
              {collection || 'Select collection...'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0">
            <Command>
              <CommandInput 
                placeholder="Type or select..." 
                value={collection}
                onValueChange={setCollection}
              />
              <CommandList>
                <CommandEmpty>
                  <span className="text-[12px] text-muted-foreground">
                    Press enter to create &quot;{collection}&quot;
                  </span>
                </CommandEmpty>
                <CommandGroup>
                  {collections.map(col => (
                    <CommandItem
                      key={col}
                      value={col}
                      onSelect={(value) => {
                        setCollection(value)
                        setOpenCollectionPicker(false)
                      }}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          collection === col ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      {col}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}

function FileRow({ file, onDelete, isDeleting }) {
  const [showConfirm, setShowConfirm] = useState(false)

  const getIcon = () => {
    if (file.filename?.endsWith('.pdf')) {
      return <FileText className="h-4 w-4 text-destructive/70" />
    }
    return <File className="h-4 w-4 text-muted-foreground" />
  }

  if (showConfirm) {
    return (
      <tr className="border-b border-border bg-destructive/5">
        <td colSpan={4} className="px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-foreground">
              Delete {file.filename} and its embeddings?
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowConfirm(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDelete(file.file_id)}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className="border-b border-border hover:bg-muted/30 transition-colors group">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {getIcon()}
          <span className="text-[13px] text-foreground">{file.filename}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <Badge variant="secondary" className="text-[11px] font-normal">
          {file.collection || 'default'}
        </Badge>
      </td>
      <td className="px-4 py-3 text-[13px] text-muted-foreground">
        {file.chunks}
      </td>
      <td className="px-4 py-3 text-[13px] text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>
            {file.created_at 
              ? formatDistanceToNow(new Date(file.created_at), { addSuffix: true })
              : '-'
            }
          </span>
          <button
            onClick={() => setShowConfirm(true)}
            className="p-1.5 rounded hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </button>
        </div>
      </td>
    </tr>
  )
}

function EmptyState({ onUploadClick }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <FileText className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium text-foreground mb-1">
        No documents uploaded
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        Upload your first document to start asking questions
      </p>
      <Button onClick={onUploadClick} variant="outline">
        <Upload className="h-4 w-4 mr-2" />
        Upload document
      </Button>
    </div>
  )
}

export default function DocumentsPage() {
  const { authFetch, API_URL, token } = useAuth()
  const [files, setFiles] = useState([])
  const [collections, setCollections] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [deletingId, setDeletingId] = useState(null)
  const [sortField, setSortField] = useState('created_at')
  const [sortDirection, setSortDirection] = useState('desc')
  const [uploadSuccess, setUploadSuccess] = useState(null)

  const fetchFiles = useCallback(async () => {
    try {
      const response = await authFetch('/rag/files')
      if (response.ok) {
        const data = await response.json()
        setFiles(data.files || [])
        
        // Extract unique collections
        const uniqueCollections = [...new Set(
          (data.files || []).map(f => f.collection).filter(Boolean)
        )]
        setCollections(uniqueCollections)
      }
    } catch (error) {
      console.error('Failed to fetch files:', error)
    } finally {
      setIsLoading(false)
    }
  }, [authFetch])

  useEffect(() => {
    fetchFiles()
  }, [fetchFiles])

  const handleUpload = async (file, collection) => {
    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File exceeds 10 MB limit')
      return
    }

    // Validate file type
    const validTypes = ['application/pdf', 'text/plain']
    const validExtensions = ['.pdf', '.txt']
    const hasValidExtension = validExtensions.some(ext => 
      file.name.toLowerCase().endsWith(ext)
    )
    
    if (!validTypes.includes(file.type) && !hasValidExtension) {
      toast.error('Only PDF and TXT files are supported')
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    setUploadSuccess(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const url = collection 
        ? `${API_URL}/rag/upload?collection=${encodeURIComponent(collection)}`
        : `${API_URL}/rag/upload`

      // Simulated progress for UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (response.status === 413) {
        toast.error('File exceeds 10 MB limit')
        return
      }

      if (response.status === 415) {
        toast.error('Only PDF and TXT files are supported')
        return
      }

      if (response.status === 429) {
        toast.error('Upload limit reached')
        return
      }

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const data = await response.json()
      
      setUploadSuccess({
        filename: data.filename,
        chunks: data.chunks,
        collection: data.collection || collection,
      })

      // Refresh file list
      fetchFiles()
      
      // Clear success message after a few seconds
      setTimeout(() => setUploadSuccess(null), 5000)
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload file')
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handleDelete = async (fileId) => {
    setDeletingId(fileId)
    try {
      const response = await authFetch(`/rag/files/${fileId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setFiles(prev => prev.filter(f => f.file_id !== fileId))
        toast.success('File deleted')
      } else {
        toast.error('Failed to delete file')
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Failed to delete file')
    } finally {
      setDeletingId(null)
    }
  }

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortedFiles = [...files].sort((a, b) => {
    let aVal = a[sortField]
    let bVal = b[sortField]
    
    if (sortField === 'created_at') {
      aVal = new Date(aVal || 0).getTime()
      bVal = new Date(bVal || 0).getTime()
    }
    
    if (sortField === 'chunks') {
      aVal = aVal || 0
      bVal = bVal || 0
    }
    
    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase()
      bVal = bVal.toLowerCase()
    }
    
    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : -1
    }
    return aVal < bVal ? 1 : -1
  })

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-3 w-3 ml-1 inline" />
      : <ArrowDown className="h-3 w-3 ml-1 inline" />
  }

  return (
    <div className="h-full overflow-hidden flex flex-col">
      <ScrollArea className="flex-1">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-xl font-semibold text-foreground mb-6">Documents</h1>

          <DropZone
            onUpload={handleUpload}
            isUploading={isUploading}
            progress={uploadProgress}
            collections={collections}
          />

          {uploadSuccess && (
            <div className="mb-4 p-3 rounded-lg bg-success/10 border border-success/20">
              <p className="text-sm text-success">
                {uploadSuccess.filename} → {uploadSuccess.chunks} chunks · {uploadSuccess.collection}
              </p>
            </div>
          )}

          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 rounded-lg bg-muted skeleton-pulse" />
              ))}
            </div>
          ) : files.length === 0 ? (
            <EmptyState onUploadClick={() => document.querySelector('input[type="file"]')?.click()} />
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr className="border-b border-border">
                    <th 
                      className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground"
                      onClick={() => handleSort('filename')}
                    >
                      Name <SortIcon field="filename" />
                    </th>
                    <th 
                      className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground"
                      onClick={() => handleSort('collection')}
                    >
                      Collection <SortIcon field="collection" />
                    </th>
                    <th 
                      className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground"
                      onClick={() => handleSort('chunks')}
                    >
                      Chunks <SortIcon field="chunks" />
                    </th>
                    <th 
                      className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground cursor-pointer hover:text-foreground"
                      onClick={() => handleSort('created_at')}
                    >
                      Uploaded <SortIcon field="created_at" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedFiles.map(file => (
                    <FileRow
                      key={file.file_id}
                      file={file}
                      onDelete={handleDelete}
                      isDeleting={deletingId === file.file_id}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
