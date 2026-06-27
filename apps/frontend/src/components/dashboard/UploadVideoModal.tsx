"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { UploadCloud, Link as LinkIcon } from "lucide-react"
import { api } from "@/store/auth.store"
import { toast } from "sonner"
import { Progress } from "@/components/ui/progress"

export function UploadVideoModal({ onUploadSuccess }: { onUploadSuccess: () => void }) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState("")
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleUploadFile = async () => {
    if (!file) return toast.error("Vui lòng chọn file!")
    
    setUploading(true)
    const formData = new FormData()
    formData.append("video", file)
    formData.append("name", file.name)

    try {
      await api.post("/projects/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1))
          setProgress(percentCompleted)
        },
      })
      toast.success("Upload thành công!")
      setOpen(false)
      onUploadSuccess()
    } catch (error) {
      toast.error("Upload thất bại")
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  const handleImportUrl = async () => {
    if (!url) return toast.error("Vui lòng nhập URL hợp lệ!")
    
    setUploading(true)
    try {
      await api.post("/projects/import", { url, name: "Imported Video" })
      toast.success("Import thành công!")
      setOpen(false)
      onUploadSuccess()
    } catch (error) {
      toast.error("Import thất bại")
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
          <UploadCloud className="h-4 w-4" />
          Upload Video
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Tải lên hoặc Import Video</DialogTitle>
          <DialogDescription>
            Tải video từ máy tính của bạn hoặc import từ Google Drive, Dropbox, URL.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label>Tải lên từ máy tính</Label>
            <Input 
              type="file" 
              accept="video/*" 
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              disabled={uploading}
            />
            {progress > 0 && <Progress value={progress} className="w-full mt-2" />}
            <Button onClick={handleUploadFile} disabled={!file || uploading}>
              {uploading && progress > 0 ? `Đang tải lên... ${progress}%` : "Upload File"}
            </Button>
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Hoặc</span>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Import từ URL (Drive, Dropbox,...)</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <LinkIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="https://..." 
                  className="pl-8" 
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={uploading}
                />
              </div>
              <Button onClick={handleImportUrl} disabled={!url || uploading} variant="secondary">
                Import
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
