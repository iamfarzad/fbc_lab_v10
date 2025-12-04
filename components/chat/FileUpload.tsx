/**
 * File Upload Component
 * 
 * Multi-file upload with progress bars, drag-and-drop,
 * and file type icons.
 */

import React, { useCallback, useRef, useState } from 'react'
import { 
  FileUp, 
  X, 
  File, 
  FileImage, 
  FileText, 
  FileCode, 
  FileSpreadsheet,
  Check,
  AlertTriangle
} from 'lucide-react'

export interface UploadingFile {
  id: string
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'complete' | 'error'
  error?: string
  dataUrl?: string
}

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void
  onFileUploaded?: (file: UploadingFile) => void
  accept?: string
  multiple?: boolean
  maxFiles?: number
  maxSize?: number // bytes
  className?: string
}

const FILE_ICONS: Record<string, typeof File> = {
  'image': FileImage,
  'text': FileText,
  'application/pdf': FileText,
  'application/json': FileCode,
  'text/csv': FileSpreadsheet,
  'default': File
}

function getFileIcon(mimeType: string): typeof File {
  if (mimeType.startsWith('image/')) return FILE_ICONS['image'] ?? File
  if (mimeType.startsWith('text/')) return FILE_ICONS['text'] ?? File
  return FILE_ICONS[mimeType] ?? FILE_ICONS['default'] ?? File
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFilesSelected,
  onFileUploaded,
  accept,
  multiple = true,
  maxFiles = 10,
  maxSize = 10 * 1024 * 1024, // 10MB
  className = ''
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [files, setFiles] = useState<UploadingFile[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback((fileList: FileList | null) => {
    if (!fileList) return

    const newFiles: UploadingFile[] = []
    const validFiles: File[] = []

    Array.from(fileList).slice(0, maxFiles).forEach(file => {
      const id = `${file.name}-${Date.now()}`
      
      if (file.size > maxSize) {
        newFiles.push({
          id,
          file,
          progress: 0,
          status: 'error',
          error: `File too large (max ${formatFileSize(maxSize)})`
        })
      } else {
        newFiles.push({
          id,
          file,
          progress: 0,
          status: 'pending'
        })
        validFiles.push(file)
      }
    })

    setFiles(prev => [...prev, ...newFiles])
    
    if (validFiles.length > 0) {
      onFilesSelected(validFiles)
    }

    // Simulate upload progress
    newFiles.forEach(uploadFile => {
      if (uploadFile.status === 'pending') {
        simulateUpload(uploadFile.id)
      }
    })
  }, [maxFiles, maxSize, onFilesSelected])

  const simulateUpload = (fileId: string) => {
    let progress = 0
    const interval = setInterval(() => {
      progress += Math.random() * 20 + 10
      if (progress >= 100) {
        progress = 100
        clearInterval(interval)
        setFiles(prev => prev.map(f => 
          f.id === fileId 
            ? { ...f, progress: 100, status: 'complete' as const }
            : f
        ))
        
        const file = files.find(f => f.id === fileId)
        if (file && onFileUploaded) {
          onFileUploaded({ ...file, progress: 100, status: 'complete' })
        }
      } else {
        setFiles(prev => prev.map(f => 
          f.id === fileId 
            ? { ...f, progress, status: 'uploading' as const }
            : f
        ))
      }
    }, 100)
  }

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Drop Zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer
          transition-all duration-200
          ${isDragging 
            ? 'border-orange-400 bg-orange-50' 
            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={e => handleFiles(e.target.files)}
          className="hidden"
        />
        
        <div className="flex flex-col items-center gap-2">
          <div className={`
            w-12 h-12 rounded-xl flex items-center justify-center
            ${isDragging ? 'bg-orange-100 text-orange-500' : 'bg-gray-100 text-gray-400'}
          `}>
            <FileUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">
              {isDragging ? 'Drop files here' : 'Click or drag files to upload'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Max {formatFileSize(maxSize)} per file • Up to {maxFiles} files
            </p>
          </div>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map(file => {
            const Icon = getFileIcon(file.file.type)
            
            return (
              <div 
                key={file.id}
                className={`
                  flex items-center gap-3 p-3 rounded-lg border
                  ${file.status === 'error' ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}
                `}
              >
                {/* Icon */}
                <div className={`
                  w-10 h-10 rounded-lg flex items-center justify-center
                  ${file.status === 'error' ? 'bg-red-100 text-red-500' : 'bg-gray-100 text-gray-500'}
                `}>
                  <Icon className="w-5 h-5" />
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">
                    {file.file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.file.size)}
                  </p>
                  
                  {/* Progress Bar */}
                  {file.status === 'uploading' && (
                    <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-orange-500 transition-all duration-300"
                        style={{ width: `${file.progress}%` }}
                      />
                    </div>
                  )}
                  
                  {/* Error */}
                  {file.status === 'error' && (
                    <p className="text-xs text-red-500 mt-1">{file.error}</p>
                  )}
                </div>

                {/* Status/Actions */}
                <div className="flex items-center gap-2">
                  {file.status === 'uploading' && (
                    <span className="text-xs text-gray-500">{Math.round(file.progress)}%</span>
                  )}
                  {file.status === 'complete' && (
                    <Check className="w-4 h-4 text-green-500" />
                  )}
                  {file.status === 'error' && (
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  )}
                  <button
                    onClick={() => removeFile(file.id)}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/**
 * Compact upload button
 */
export const UploadButton: React.FC<{
  onFilesSelected: (files: File[]) => void
  accept?: string
  multiple?: boolean
  className?: string
}> = ({ onFilesSelected, accept, multiple = false, className = '' }) => {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <>
      <button
        onClick={() => inputRef.current?.click()}
        className={`
          inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
          bg-gray-100 text-gray-600 hover:bg-gray-200
          transition-colors text-sm
          ${className}
        `}
      >
        <FileUp className="w-4 h-4" />
        Upload
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={e => e.target.files && onFilesSelected(Array.from(e.target.files))}
        className="hidden"
      />
    </>
  )
}

export default FileUpload

