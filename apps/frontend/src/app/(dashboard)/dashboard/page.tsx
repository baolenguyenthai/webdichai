"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { api } from "@/store/auth.store"
import { UploadVideoModal } from "@/components/dashboard/UploadVideoModal"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, MoreVertical, Play, Heart, Trash2, Edit, Video, Loader2, CheckCircle2, HardDrive, Clock, Bell } from "lucide-react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import { useSocket } from "@/hooks/useSocket"
import { ProjectProgressCard } from "@/components/dashboard/ProjectProgressCard"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Project {
  id: string
  name: string
  status: string
  videoUrl?: string
  isFavorite: boolean
  updatedAt: string
  progress?: number
  message?: string
  estimatedTimeLeft?: number
  steps?: any[]
}

interface DashboardStats {
  totalVideos: number
  processingVideos: number
  completedVideos: number
  storageUsedBytes: number
  aiMinutesUsed: number
  notifications: Array<{ id: string; title: string; status: string; createdAt: string }>
}

const processingStatuses = [
  'PENDING',
  'VIDEO_RECEIVED',
  'DOWNLOADING',
  'ANALYZING_LINK',
  'EXTRACTING_AUDIO',
  'FFMPEG_EXTRACTING',
  'TRANSCRIBING',
  'SPEECH_TO_TEXT',
  'DETECTING_LANGUAGE',
  'TRANSLATING',
  'DUBBING',
  'VOICE_DUBBING',
  'SUBTITLE_READY',
  'EXPORTING',
]

const formatBytes = (bytes: number) => {
  if (!bytes) return "0 MB"
  const units = ["B", "KB", "MB", "GB", "TB"]
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / Math.pow(1024, index)).toFixed(index < 2 ? 0 : 1)} ${units[index]}`
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState("updatedAt:desc")
  const [loading, setLoading] = useState(true)

const PIPELINE_STEPS = [
  'Video',
  'Download',
  'FFmpeg',
  'Speech to Text',
  'Detect Language',
  'Translate',
  'Voice Dub',
  'Subtitle',
  'Export',
]

const STATUS_TO_STEP: Record<string, number> = {
  'PENDING': 0,
  'VIDEO_RECEIVED': 0,
  'DOWNLOADING': 1,
  'ANALYZING_LINK': 1,
  'FFMPEG_EXTRACTING': 2,
  'EXTRACTING_AUDIO': 2,
  'SPEECH_TO_TEXT': 3,
  'TRANSCRIBING': 3,
  'DETECTING_LANGUAGE': 4,
  'TRANSLATING': 5,
  'VOICE_DUBBING': 6,
  'DUBBING': 6,
  'SUBTITLE_READY': 7,
  'EXPORTING': 8,
}

  const fetchProjects = async () => {
    try {
      const res = await api.get(`/projects?search=${encodeURIComponent(search)}&sort=${sort}`)
      
      const enrichedProjects = res.data.data.map((p: any) => {
        if (processingStatuses.includes(p.status) && !p.steps) {
          const stepIdx = STATUS_TO_STEP[p.status] ?? 0;
          p.progress = Math.floor((stepIdx / PIPELINE_STEPS.length) * 100);
          p.steps = PIPELINE_STEPS.map((name, i) => ({
             name,
             status: i < stepIdx ? 'done' : (i === stepIdx ? 'processing' : 'pending')
          }));
        }
        return p;
      });

      setProjects(enrichedProjects)
    } catch (error) {
      toast.error("Không thể tải danh sách dự án")
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const res = await api.get("/projects/stats/dashboard")
      setStats(res.data.data)
    } catch {
      setStats(null)
    }
  }

  useEffect(() => {
    fetchProjects()
    fetchStats()
  }, [search, sort])

  const handleAction = async (action: string, id: string) => {
    try {
      if (action === "trash") {
        await api.delete(`/projects/${id}/trash`)
        toast.success("Đã chuyển vào thùng rác")
      } else if (action === "favorite") {
        const p = projects.find((x) => x.id === id)
        await api.patch(`/projects/${id}`, { isFavorite: !p?.isFavorite })
      } else if (action === "retry") {
        await api.post(`/projects/${id}/retry`)
        toast.success("Đã đưa vào hàng đợi xử lý lại")
      } else if (action === "rename") {
        const p = projects.find((x) => x.id === id)
        const nextName = window.prompt("Tên video", p?.name || "")
        if (!nextName) return
        await api.patch(`/projects/${id}`, { name: nextName })
        toast.success("Đã đổi tên")
      }
      fetchProjects()
      fetchStats()
    } catch (error) {
      toast.error("Thao tác thất bại")
    }
  }

  const socket = useSocket()
  
  useEffect(() => {
    if (!socket) return
    
    // Join room cho tất cả các project hiện tại để nghe thông báo
    projects.forEach(p => socket.emit('joinProjectRoom', p.id))
    
    socket.on('processProgress', (data: { 
      projectId: string; 
      status: string; 
      percent: number;
      message?: string;
      estimatedTimeLeft?: number;
      steps?: any[];
    }) => {
      setProjects(prev => 
        prev.map(p => 
          p.id === data.projectId 
            ? { 
                ...p, 
                status: data.status, 
                progress: data.percent,
                message: data.message,
                estimatedTimeLeft: data.estimatedTimeLeft,
                steps: data.steps
              } 
            : p
        )
      )
      
      if (data.status === 'EXPORTED' && data.percent === 100) {
        toast.success(`Render video hoàn tất`)
        fetchStats()
      }
    })

    return () => {
      socket.off('processProgress')
    }
  }, [socket, projects.length])

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tất cả video</h1>
          <p className="text-muted-foreground">Quản lý và dịch các video của bạn.</p>
        </div>
        <UploadVideoModal onUploadSuccess={fetchProjects} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Tổng số video", value: stats?.totalVideos ?? 0, icon: Video },
          { label: "Đang xử lý", value: stats?.processingVideos ?? 0, icon: Loader2 },
          { label: "Hoàn thành", value: stats?.completedVideos ?? 0, icon: CheckCircle2 },
          { label: "Dung lượng", value: formatBytes(stats?.storageUsedBytes ?? 0), icon: HardDrive },
          { label: "Phút AI", value: `${stats?.aiMinutesUsed ?? 0} phút`, icon: Clock },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                <item.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-xl font-semibold">{item.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {stats?.notifications?.length ? (
        <div className="rounded-lg border bg-muted/20 p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Bell className="h-4 w-4" /> Thông báo
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {stats.notifications.map((item) => (
              <Link key={item.id} href={`/projects/${item.id}`} className="rounded-md bg-background px-3 py-2 text-sm hover:bg-muted">
                {item.title}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm dự án..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={sort} onValueChange={(value) => setSort(value || "updatedAt:desc")}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sắp xếp" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="updatedAt:desc">Mới cập nhật</SelectItem>
            <SelectItem value="createdAt:desc">Mới tạo</SelectItem>
            <SelectItem value="name:asc">Tên A-Z</SelectItem>
            <SelectItem value="status:asc">Trạng thái</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground">Đang tải...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center animate-in fade-in-50">
          <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <Play className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="mt-6 text-xl font-semibold">Chưa có video nào</h2>
            <p className="mb-8 mt-2 text-center text-sm font-normal leading-6 text-muted-foreground">
              Bạn chưa có dự án dịch video nào. Bắt đầu bằng cách tải lên một video hoặc import từ link.
            </p>
            <UploadVideoModal onUploadSuccess={fetchProjects} />
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {projects.map((project: any) => {
            const getFullMediaUrl = (url: string) => {
              let finalUrl = url
              if (url.startsWith('/temp/')) {
                const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000'
                finalUrl = `${apiBase}${url}`
              }
              return finalUrl
            }
            return (
              <Card key={project.id} className="overflow-hidden flex flex-col group relative">
                {project.isFavorite && (
                  <Heart className="absolute top-2 left-2 h-4 w-4 text-red-500 fill-red-500 z-10" />
                )}
                <div className="aspect-video bg-muted relative flex items-center justify-center">
                  {project.videoUrl && !/youtube\.com|youtu\.be|douyin\.com|tiktok\.com|facebook\.com|vimeo\.com/i.test(project.videoUrl) ? (
                    <video src={getFullMediaUrl(project.videoUrl)} className="w-full h-full object-cover" />
                  ) : (
                  <Play className="h-8 w-8 text-muted-foreground opacity-50" />
                )}
                
                {processingStatuses.includes(project.status) && (
                  <ProjectProgressCard 
                    percent={project.progress || 0}
                    message={project.message}
                    estimatedTimeLeft={project.estimatedTimeLeft}
                    steps={project.steps}
                  />
                )}

                {!processingStatuses.includes(project.status) && (
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Link href={`/projects/${project.id}`}>
                      <Button variant="secondary" size="sm">Mở Studio</Button>
                    </Link>
                  </div>
                )}
              </div>
              <CardContent className="p-4 flex-1">
                <h3 className="font-semibold truncate" title={project.name}>{project.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Đã cập nhật {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}
                </p>
                <div className="mt-2 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                  {project.status}
                </div>
              </CardContent>
              <CardFooter className="p-2 border-t flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent focus:outline-none">
                      <MoreVertical className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {project.status === 'FAILED' && (
                      <DropdownMenuItem onClick={() => handleAction("retry", project.id)}>
                        <Play className="mr-2 h-4 w-4" /> Thử lại xử lý
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => handleAction("rename", project.id)}>
                      <Edit className="mr-2 h-4 w-4" /> Đổi tên
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAction("favorite", project.id)}>
                      <Heart className="mr-2 h-4 w-4" /> 
                      {project.isFavorite ? "Bỏ yêu thích" : "Yêu thích"}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => handleAction("trash", project.id)}>
                      <Trash2 className="mr-2 h-4 w-4" /> Xóa
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
