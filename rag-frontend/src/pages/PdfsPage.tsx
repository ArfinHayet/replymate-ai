import { useEffect, useState } from 'react'
import { Pencil, Trash2, Loader2, Files, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { listPdfs, renamePdf, deletePdf, type Pdf } from '@/lib/api'

export function PdfsPage() {
  const [pdfs, setPdfs] = useState<Pdf[]>([])
  const [loading, setLoading] = useState(true)

  // Rename state
  const [renameTarget, setRenameTarget] = useState<Pdf | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [renaming, setRenaming] = useState(false)

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Pdf | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = async () => {
    try {
      setLoading(true)
      setPdfs(await listPdfs())
    } catch {
      toast.error('Failed to load PDFs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const openRename = (pdf: Pdf) => {
    setRenameTarget(pdf)
    setRenameValue(pdf.fileName)
  }

  const handleRename = async () => {
    if (!renameTarget) return
    setRenaming(true)
    try {
      await renamePdf(renameTarget.id, renameValue.trim())
      toast.success('Renamed successfully')
      setRenameTarget(null)
      void load()
    } catch {
      toast.error('Rename failed')
    } finally {
      setRenaming(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deletePdf(deleteTarget.id)
      toast.success('PDF and its chunks deleted')
      setDeleteTarget(null)
      void load()
    } catch {
      toast.error('Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Uploaded PDFs</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {loading ? '…' : `${pdfs.length} document${pdfs.length !== 1 ? 's' : ''}`} in the
            knowledge base
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File name</TableHead>
              <TableHead>Uploaded at</TableHead>
              <TableHead className="w-[110px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-48" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16 ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : pdfs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-40 text-center text-muted-foreground">
                  <Files className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>No PDFs uploaded yet</p>
                  <p className="text-xs mt-1">Use the Upload page to add documents</p>
                </TableCell>
              </TableRow>
            ) : (
              pdfs.map((pdf) => (
                <TableRow key={pdf.id}>
                  <TableCell className="font-medium">{pdf.fileName}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(pdf.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openRename(pdf)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteTarget(pdf)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Rename dialog ── */}
      <Dialog open={!!renameTarget} onOpenChange={(open) => !open && setRenameTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename PDF</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void handleRename()}
            placeholder="New file name"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>
              Cancel
            </Button>
            <Button onClick={() => void handleRename()} disabled={renaming || !renameValue.trim()}>
              {renaming && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete dialog ── */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete PDF?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete{' '}
            <strong className="text-foreground">{deleteTarget?.fileName}</strong> and all its
            document chunks from the knowledge base. This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void handleDelete()} disabled={deleting}>
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
