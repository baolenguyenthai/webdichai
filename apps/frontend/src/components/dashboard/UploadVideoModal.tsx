"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { UploadCloud, Link as LinkIcon, Cloud, HardDrive, X } from "lucide-react"
import { api } from "@/store/auth.store"
import { toast } from "sonner"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function UploadVideoModal({ onUploadSuccess }: { onUploadSuccess: () => void }) {
  const [open, setOpen] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [url, setUrl] = useState("")
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [targetLang, setTargetLang] = useState("vi")
  const [translationStyle, setTranslationStyle] = useState("natural")
  const [voice, setVoice] = useState("narrator")
  const [autoExport, setAutoExport] = useState(true)

  const addFiles = (nextFiles: FileList | File[]) => {
    const videoFiles = Array.from(nextFiles).filter((item) => item.type.startsWith("video/"))
    setFiles((current) => [...current, ...videoFiles])
  }

  const appendPipelineFields = (formData: FormData) => {
    formData.append("targetLang", targetLang)
    formData.append("translationStyle", translationStyle)
    formData.append("voice", voice)
    formData.append("autoExport", String(autoExport))
  }

  const handleUploadFiles = async () => {
    if (files.length === 0) return toast.error("Vui lòng chọn file video")
    
    setUploading(true)
    try {
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index]
        const formData = new FormData()
        formData.append("video", file)
        formData.append("name", file.name)
        appendPipelineFields(formData)

        await api.post("/projects/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (progressEvent) => {
            const currentPercent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1))
            setProgress(Math.floor(((index + currentPercent / 100) / files.length) * 100))
          },
        })
      }
      toast.success(`Đã đưa ${files.length} video vào hàng đợi`)
      setFiles([])
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
      await api.post("/projects/import", {
        url,
        name: "Imported Video",
        targetLang,
        translationStyle,
        voice,
        autoExport,
      })
      toast.success("Đã đưa URL vào hàng đợi")
      setOpen(false)
      setUrl("")
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
          <DialogTitle>Tải lên hoặc import video</DialogTitle>
          <DialogDescription>
            Chọn nguồn video và cấu hình bản dịch trước khi xử lý.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label>Tải lên từ máy tính</Label>
            <div
              className={`rounded-lg border border-dashed p-4 transition-colors ${dragging ? "border-primary bg-primary/5" : "border-border"}`}
              onDragOver={(event) => {
                event.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault()
                setDragging(false)
                addFiles(event.dataTransfer.files)
              }}
            >
              <div className="flex items-center gap-3">
                <HardDrive className="h-5 w-5 text-muted-foreground" />
                <Input
                  type="file"
                  accept="video/*"
                  multiple
                  onChange={(e) => e.target.files && addFiles(e.target.files)}
                  disabled={uploading}
                />
              </div>
              {files.length > 0 && (
                <div className="mt-3 flex flex-col gap-2">
                  {files.map((item, index) => (
                    <div key={`${item.name}-${index}`} className="flex items-center justify-between rounded-md bg-muted px-2 py-1 text-xs">
                      <span className="truncate">{item.name}</span>
                      <button
                        type="button"
                        className="rounded-sm p-1 hover:bg-background"
                        onClick={() => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {progress > 0 && <Progress value={progress} className="w-full mt-2" />}
            <Button onClick={handleUploadFiles} disabled={files.length === 0 || uploading}>
              {uploading && progress > 0 ? `Đang tải lên... ${progress}%` : `Upload ${files.length || ""} file`}
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
            <Label>Import từ URL</Label>
            <div className="grid grid-cols-3 gap-2">
              {["Google Drive", "Dropbox", "OneDrive"].map((provider) => (
                <Button key={provider} type="button" variant="outline" size="sm" onClick={() => setUrl("")}>
                  <Cloud className="mr-2 h-4 w-4" /> {provider}
                </Button>
              ))}
            </div>
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

          <div className="grid gap-3 rounded-lg border p-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1">
                <Label>Ngôn ngữ đích</Label>
                <Select value={targetLang} onValueChange={(value) => setTargetLang(value || "vi")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vi">Tiếng Việt</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ja">日本語</SelectItem>
                    <SelectItem value="ko">한국어</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1">
                <Label>Phong cách</Label>
                <Select value={translationStyle} onValueChange={(value) => setTranslationStyle(value || "natural")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="natural">Tự nhiên</SelectItem>
                    <SelectItem value="formal">Trang trọng</SelectItem>
                    <SelectItem value="conversational">Hội thoại</SelectItem>
                    <SelectItem value="cinematic">Điện ảnh</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1">
                <Label>Giọng đọc</Label>
                <Select value={voice} onValueChange={(value) => setVoice(value || "narrator")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Nam</SelectItem>
                    <SelectItem value="female">Nữ</SelectItem>
                    <SelectItem value="podcast">Podcast</SelectItem>
                    <SelectItem value="mc">MC</SelectItem>
                    <SelectItem value="narrator">Narrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-end gap-2 pb-2 text-sm">
                <input
                  type="checkbox"
                  checked={autoExport}
                  onChange={(event) => setAutoExport(event.target.checked)}
                  className="h-4 w-4"
                />
                Tự render sau khi xử lý
              </label>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
