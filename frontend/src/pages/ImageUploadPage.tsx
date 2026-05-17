import { useState, useRef, type DragEvent, type ChangeEvent } from 'react'
import { PageHeader } from "@/components/layout/PageHeader";
import { ImageUp, Loader2, CheckCircle2, XCircle, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { analyzeImage, saveImage, type ImageItem } from '@/lib/api'

type UploadState = 'idle' | 'analyzing' | 'ready' | 'saving' | 'success' | 'error'

export function ImageUploadPage() {
  const [state, setState] = useState<UploadState>('idle')
  const [dragging, setDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [result, setResult] = useState<ImageItem | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        // Strip the "data:<mime>;base64," prefix — API only wants the raw base64
        resolve(dataUrl.split(',')[1])
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are allowed')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be under 10 MB')
      return
    }

    setSelectedFile(file)
    setTitle('')
    setDescription('')
    setResult(null)
    setState('analyzing')

    // Show preview immediately
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)

    try {
      const base64 = await toBase64(file)
      const analysis = await analyzeImage(base64, file.type)
      setTitle(analysis.title)
      setDescription(analysis.description)
      setState('ready')
    } catch {
      toast.error('Failed to analyze image')
      setState('error')
    }
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) void handleFile(file)
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) void handleFile(file)
  }

  const handleSave = async () => {
    if (!selectedFile || !title.trim() || !description.trim()) return
    setState('saving')
    try {
      const saved = await saveImage(selectedFile, title.trim(), description.trim())
      setResult(saved)
      setState('success')
      toast.success('Image saved to knowledge base')
    } catch {
      setState('error')
      toast.error('Failed to save image')
    }
  }

  const reset = () => {
    setState('idle')
    setSelectedFile(null)
    setPreview(null)
    setTitle('')
    setDescription('')
    setResult(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="min-h-screen bg-rm-trip-surface">
      <PageHeader title="Upload Image" subtitle="AI auto-generates title and description which you can edit before saving." />
      <div className="p-8 max-w-2xl">

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
            onClick={() => state === 'idle' || state === 'error' ? inputRef.current?.click() : undefined}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleChange}
            />
            {preview ? (
              <div className="flex flex-col items-center gap-3">
                <img
                  src={preview}
                  alt="Preview"
                  className="max-h-48 rounded-lg object-contain mx-auto"
                />
                <p className="text-sm text-muted-foreground">{selectedFile?.name}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <ImageUp className="h-10 w-10" />
                <p className="font-medium">Drop an image here or click to browse</p>
                <p className="text-sm">PNG, JPG, WEBP · max 10 MB</p>
              </div>
            )}
          </div>

          {/* Analyzing spinner */}
          {state === 'analyzing' && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing image and preparing metadata...
            </div>
          )}

          {/* Editable title + description — shown once analysis is done */}
          {(state === 'ready' || state === 'saving' || state === 'success') && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Image title"
                  disabled={state === 'saving' || state === 'success'}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Image description"
                  rows={4}
                  disabled={state === 'saving' || state === 'success'}
                />
              </div>
            </div>
          )}

          {/* Success banner */}
          {state === 'success' && result && (
            <div className="flex items-start gap-3 rounded-lg bg-emerald-50 border border-emerald-200 p-4">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-emerald-800">{result.title}</p>
                <p className="text-sm text-emerald-700">Saved · ID: {result.id.slice(0, 8)}…</p>
              </div>
            </div>
          )}

          {/* Error banner */}
          {state === 'error' && (
            <div className="flex items-center gap-3 rounded-lg bg-destructive/10 border border-destructive/20 p-4">
              <XCircle className="h-5 w-5 text-destructive shrink-0" />
              <p className="text-sm text-destructive">Something went wrong. See toast for details.</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {state === 'ready' && (
              <Button
                onClick={() => void handleSave()}
                disabled={!title.trim() || !description.trim()}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                Save to Knowledge Base
              </Button>
            )}
            {state === 'saving' && (
              <Button disabled className="gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </Button>
            )}
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
          <CardTitle className="text-sm font-medium">What happens after saving?</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Image binary is uploaded to Supabase Storage</li>
            <li>Title and description are indexed for semantic search</li>
            <li>Record details and storage URL are saved in the database</li>
            <li>The Chat page can answer questions about this image's content</li>
          </ol>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
