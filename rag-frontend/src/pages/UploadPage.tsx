import { useState, useRef, type DragEvent, type ChangeEvent } from 'react'
import { FileUp, File, CheckCircle2, XCircle, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { uploadPdf, type UploadResult } from '@/lib/api'

type UploadState = 'idle' | 'uploading' | 'success' | 'error'

export function UploadPage() {
  const [state, setState] = useState<UploadState>('idle')
  const [progress, setProgress] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [result, setResult] = useState<UploadResult | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are allowed')
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size must be under 50 MB')
      return
    }
    setSelectedFile(file)
    setState('idle')
    setResult(null)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    setState('uploading')
    setProgress(0)
    try {
      const res = await uploadPdf(selectedFile, setProgress)
      setResult(res.data)
      setState('success')
      toast.success(`Ingested ${res.data.chunksCreated} chunks successfully`)
      setSelectedFile(null)
      if (inputRef.current) inputRef.current.value = ''
    } catch (err: unknown) {
      setState('error')
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Upload failed'
      toast.error(message)
    }
  }

  const reset = () => {
    setState('idle')
    setSelectedFile(null)
    setResult(null)
    setProgress(0)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-1">Upload PDF</h1>
      <p className="text-muted-foreground mb-6 text-sm">
        Add PDFs to the knowledge base. Each file is parsed, chunked, and embedded automatically.
      </p>

      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Drop zone */}
          <div
            className={cn(
              'border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors select-none',
              dragging
                ? 'border-primary bg-accent'
                : 'border-muted-foreground/30 hover:border-primary/60',
              selectedFile && 'border-primary/60 bg-accent/40',
            )}
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={handleChange}
            />
            {selectedFile ? (
              <div className="flex flex-col items-center gap-2">
                <File className="h-10 w-10 text-primary" />
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <FileUp className="h-10 w-10" />
                <p className="font-medium">Drop a PDF here or click to browse</p>
                <p className="text-sm">PDF only · max 50 MB</p>
              </div>
            )}
          </div>

          {/* Progress bar */}
          {state === 'uploading' && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Uploading &amp; processing…</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Success banner */}
          {state === 'success' && result && (
            <div className="flex items-start gap-3 rounded-lg bg-emerald-50 border border-emerald-200 p-4">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-emerald-800">{result.fileName}</p>
                <p className="text-sm text-emerald-700">
                  {result.chunksCreated} chunks created · ID: {result.pdfId.slice(0, 8)}…
                </p>
              </div>
            </div>
          )}

          {/* Error banner */}
          {state === 'error' && (
            <div className="flex items-center gap-3 rounded-lg bg-destructive/10 border border-destructive/20 p-4">
              <XCircle className="h-5 w-5 text-destructive shrink-0" />
              <p className="text-sm text-destructive">Upload failed. See the toast for details.</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || state === 'uploading'}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              {state === 'uploading' ? 'Processing…' : 'Upload & Ingest'}
            </Button>
            {(selectedFile || state !== 'idle') && (
              <Button variant="outline" onClick={reset}>
                Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Info card */}
      <Card className="mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">What happens after upload?</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>PDF text is extracted and cleaned of invalid characters</li>
            <li>Text is split into overlapping chunks (1 000 chars · 200 overlap)</li>
            <li>Each chunk is embedded with gemini-embedding-001</li>
            <li>Chunks and vectors are stored in pgvector (Supabase)</li>
            <li>The Chat page can now answer questions about this document</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
