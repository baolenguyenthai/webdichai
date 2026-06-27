"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { api } from "@/store/auth.store"
import { useSocket } from "@/hooks/useSocket"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ChevronLeft, Save, Trash2, Plus, Type, Languages, Volume2, Play } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"

interface Subtitle {
  id: string
  text: string
  translatedText?: string
  startTime: number
  endTime: number
  audioUrl?: string
}

interface Project {
  id: string
  name: string
  videoUrl: string
  status: string
  targetLang?: string
}

export default function SubtitleEditorPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const socket = useSocket()

  const [project, setProject] = useState<Project | null>(null)
  const [subtitles, setSubtitles] = useState<Subtitle[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [isTranslating, setIsTranslating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [statusMsg, setStatusMsg] = useState("")

  const [targetLang, setTargetLang] = useState("vi")
  const [openTranslateModal, setOpenTranslateModal] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)

  const [isExporting, setIsExporting] = useState(false)
  const [exportUrl, setExportUrl] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      const [projectRes, subtitlesRes] = await Promise.all([
        api.get(`/projects/${projectId}`),
        api.get(`/subtitles?projectId=${projectId}`)
      ])
      setProject(projectRes.data.data)
      setSubtitles(subtitlesRes.data.data)
      if (projectRes.data.data.exportUrl) {
        setExportUrl(projectRes.data.data.exportUrl)
      }
    } catch (error) {
      toast.error("Không thể tải thông tin dự án")
      router.push("/dashboard")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [projectId, router])

  useEffect(() => {
    if (!socket || !project) return
    socket.emit('joinProjectRoom', project.id)

    socket.on('processProgress', (data: { projectId: string; status: string; percent: number; exportUrl?: string }) => {
      if (data.projectId !== project.id) return
      setProgress(data.percent)
      
      if (data.status === 'TRANSLATING') setStatusMsg("Đang dùng AI dịch phụ đề...")
      if (data.status === 'DUBBING') setStatusMsg("Đang lồng tiếng (Voice Cloning)...")
      if (data.status === 'EXPORTING') {
        setIsExporting(true)
        setStatusMsg("Đang render (Hard-sub) video...")
      }
      
      if (data.status === 'COMPLETED' && data.percent === 100) {
        setIsTranslating(false)
        setStatusMsg("")
        toast.success("Dịch và lồng tiếng hoàn tất!")
        fetchData()
      }

      if (data.status === 'EXPORTED' && data.percent === 100) {
        setIsExporting(false)
        setStatusMsg("")
        if (data.exportUrl) {
          setExportUrl(data.exportUrl)
          toast.success("Xuất video thành công!")
        }
      }
    })

    return () => {
      socket.off('processProgress')
    }
  }, [socket, project])

  const formatTime = (seconds: number) => {
    const d = new Date(seconds * 1000)
    return d.toISOString().substr(11, 8) + "," + Math.floor((seconds % 1) * 1000).toString().padStart(3, '0')
  }

  const handleUpdateText = (id: string, text: string, isTranslated = false) => {
    setSubtitles(subtitles.map(sub => 
      sub.id === id 
        ? (isTranslated ? { ...sub, translatedText: text } : { ...sub, text }) 
        : sub
    ))
  }

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time
      videoRef.current.play()
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      for (const sub of subtitles) {
        await api.patch(`/subtitles/${sub.id}`, { 
          text: sub.text, 
          translatedText: sub.translatedText,
          startTime: sub.startTime, 
          endTime: sub.endTime 
        })
      }
      toast.success("Đã lưu phụ đề!")
    } catch (error) {
      toast.error("Lưu thất bại")
    } finally {
      setSaving(false)
    }
  }

  const handleStartTranslate = async () => {
    if (subtitles.length === 0) return toast.error("Không có phụ đề để dịch")
    
    setOpenTranslateModal(false)
    setIsTranslating(true)
    setProgress(0)
    setStatusMsg("Đang khởi tạo Queue...")

    try {
      await api.post(`/projects/${projectId}/translate`, { targetLang })
    } catch (error) {
      setIsTranslating(false)
      toast.error("Không thể khởi động tiến trình dịch")
    }
  }

  const handleStartExport = async () => {
    if (subtitles.length === 0) return toast.error("Không có phụ đề để xuất video")
    
    setIsExporting(true)
    setProgress(0)
    setStatusMsg("Đang chuẩn bị dữ liệu xuất video...")

    try {
      await api.post(`/projects/${projectId}/export`)
    } catch (error) {
      setIsExporting(false)
      toast.error("Không thể khởi động tiến trình xuất video")
    }
  }

  const getFullMediaUrl = (url: string) => {
    if (url.startsWith('/temp/')) {
      const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000'
      return `${apiBase}${url}`
    }
    return url
  }

  const playAudio = (url: string) => {
    const audio = new Audio(getFullMediaUrl(url))
    audio.play()
  }

  if (loading) return <div className="flex h-full items-center justify-center">Đang tải Studio...</div>
  if (!project) return null

  const isProcessing = isTranslating || isExporting;

  return (
    <div className="flex flex-col h-[calc(100vh-60px)]">
      {/* Toolbar */}
      <div className="flex h-14 items-center justify-between border-b px-6 bg-muted/20">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h1 className="font-semibold">{project.name} - Studio</h1>
        </div>
        <div className="flex gap-2">
          {exportUrl && (
            <Button variant="outline" size="sm" className="border-green-500 text-green-600 hover:bg-green-50" onClick={() => window.open(`http://localhost:5000${exportUrl}`, '_blank')}>
              Tải Video Xuất
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={handleSave} disabled={saving || isProcessing}>
            <Save className="mr-2 h-4 w-4" /> {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
          
          <Button size="sm" variant="secondary" disabled={isProcessing} onClick={handleStartExport}>
            Xuất Video
          </Button>
          
          <Button size="sm" disabled={isProcessing} className="bg-blue-600 hover:bg-blue-700" onClick={() => setOpenTranslateModal(true)}>
            <Languages className="mr-2 h-4 w-4" /> 
            {isTranslating ? "Đang dịch..." : "Dịch ngôn ngữ"}
          </Button>
          
          <Dialog open={openTranslateModal} onOpenChange={setOpenTranslateModal}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Dịch Video & Lồng tiếng AI</DialogTitle>
                <DialogDescription>
                  Hệ thống sẽ dịch toàn bộ phụ đề sang ngôn ngữ đích và tự động clone giọng (Voice Cloning) bằng ElevenLabs.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <Select value={targetLang} onValueChange={(val) => setTargetLang(val || "vi")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn ngôn ngữ đích" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vi">Tiếng Việt (Vietnamese)</SelectItem>
                    <SelectItem value="en">Tiếng Anh (English)</SelectItem>
                    <SelectItem value="ja">Tiếng Nhật (Japanese)</SelectItem>
                    <SelectItem value="ko">Tiếng Hàn (Korean)</SelectItem>
                    <SelectItem value="fr">Tiếng Pháp (French)</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleStartTranslate} className="w-full">Bắt đầu quá trình</Button>
              </div>
            </DialogContent>
          </Dialog>

        </div>
      </div>

      {isProcessing && (
        <div className="bg-blue-500/10 px-6 py-2 border-b border-blue-500/20 flex items-center justify-between">
          <span className="text-sm font-medium text-blue-700 dark:text-blue-400">{statusMsg}</span>
          <div className="flex items-center gap-4 w-1/2">
            <Progress value={progress} className="h-2 flex-1" />
            <span className="text-xs font-medium min-w-[30px]">{progress}%</span>
          </div>
        </div>
      )}

      {/* Main Studio */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left: Video Player */}
        <div className="flex-1 border-r flex flex-col bg-black">
          <div className="flex-1 flex items-center justify-center relative">
            {project.videoUrl && !/youtube\.com|youtu\.be|douyin\.com|tiktok\.com|facebook\.com|vimeo\.com/i.test(project.videoUrl) ? (
              <video 
                ref={videoRef}
                src={getFullMediaUrl(project.videoUrl)} 
                controls 
                className="max-w-full max-h-full aspect-video"
                crossOrigin="anonymous"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-white/50 gap-4">
                <Play className="h-16 w-16 opacity-50" />
                <p className="text-sm px-8 text-center">Video được nhập từ URL web.<br/>Trình phát không khả dụng với link ngoài, vui lòng xem ở trang gốc hoặc dựa vào Audio để chỉnh sửa.</p>
                <a href={project.videoUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline text-xs bg-primary/20 px-4 py-2 rounded-full">
                  Mở thẻ mới xem video gốc
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Right: Subtitles Editor */}
        <div className="w-[500px] flex flex-col bg-background">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <Type className="h-4 w-4" /> Phụ đề ({subtitles.length})
            </h2>
            <Button variant="ghost" size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <ScrollArea className="flex-1 p-4">
            <div className="flex flex-col gap-4 pb-10">
              {subtitles.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm mt-10">
                  Chưa có phụ đề. Vui lòng đợi AI xử lý hoặc thêm thủ công.
                </p>
              ) : (
                subtitles.map((sub, index) => (
                  <div key={sub.id} className="flex flex-col gap-2 p-3 rounded-lg border bg-muted/10 focus-within:ring-2 ring-primary">
                    <div className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium bg-secondary px-1.5 py-0.5 rounded text-foreground">{index + 1}</span>
                        <button onClick={() => handleSeek(sub.startTime)} className="hover:text-primary px-1">
                          {formatTime(sub.startTime).split(',')[0]}
                        </button>
                      </div>
                      <div className="flex items-center gap-1">
                        {sub.audioUrl && (
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-green-600 hover:text-green-700" onClick={() => playAudio(sub.audioUrl!)}>
                            <Volume2 className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid gap-2">
                      <div className="relative">
                        <span className="absolute -left-2 top-2 w-1 h-1/2 bg-gray-400 rounded-full"></span>
                        <Textarea 
                          value={sub.text}
                          onChange={(e) => handleUpdateText(sub.id, e.target.value)}
                          className="min-h-[40px] resize-none border-none shadow-none focus-visible:ring-0 p-0 text-sm text-muted-foreground"
                          placeholder="Bản gốc"
                        />
                      </div>
                      
                      {(sub.translatedText !== undefined || project.targetLang) && (
                        <div className="relative mt-2 pt-2 border-t border-dashed">
                          <span className="absolute -left-2 top-4 w-1 h-1/2 bg-blue-500 rounded-full"></span>
                          <Textarea 
                            value={sub.translatedText || ""}
                            onChange={(e) => handleUpdateText(sub.id, e.target.value, true)}
                            className="min-h-[40px] resize-none border-none shadow-none focus-visible:ring-0 p-0 text-sm font-medium"
                            placeholder="Bản dịch"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}
