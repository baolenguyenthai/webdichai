"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { api } from "@/store/auth.store"
import { UploadVideoModal } from "@/components/dashboard/UploadVideoModal"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, MoreVertical, Play, Heart, Trash2, Edit } from "lucide-react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import { useSocket } from "@/hooks/useSocket"
import { ProjectProgressCard } from "@/components/dashboard/ProjectProgressCard"

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

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  const fetchProjects = async () => {
    try {
      const res = await api.get(`/projects?search=${search}`)
      setProjects(res.data.data)
    } catch (error) {
      toast.error("Không thể tải danh sách dự án")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [search])

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
      }
      fetchProjects()
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
      
      // Nếu tách audio xong, tự reload lại list
      if (data.status === 'AUDIO_EXTRACTED' && data.percent === 100) {
        toast.success(`Video đã tách Audio xong!`)
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
          {projects.map((project: any) => (
            <Card key={project.id} className="overflow-hidden flex flex-col group relative">
              {project.isFavorite && (
                <Heart className="absolute top-2 left-2 h-4 w-4 text-red-500 fill-red-500 z-10" />
              )}
              <div className="aspect-video bg-muted relative flex items-center justify-center">
                {project.videoUrl && !/youtube\.com|youtu\.be|douyin\.com|tiktok\.com|facebook\.com|vimeo\.com/i.test(project.videoUrl) ? (
                  <video src={project.videoUrl} className="w-full h-full object-cover" />
                ) : (
                  <Play className="h-8 w-8 text-muted-foreground opacity-50" />
                )}
                
                {['ANALYZING_LINK', 'EXTRACTING_AUDIO', 'TRANSCRIBING', 'TRANSLATING', 'DUBBING', 'RENDERING'].includes(project.status) && (
                  <ProjectProgressCard 
                    percent={project.progress || 0}
                    message={project.message}
                    estimatedTimeLeft={project.estimatedTimeLeft}
                    steps={project.steps}
                  />
                )}

                {!['ANALYZING_LINK', 'EXTRACTING_AUDIO', 'TRANSCRIBING', 'TRANSLATING', 'DUBBING', 'RENDERING'].includes(project.status) && (
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
                    <DropdownMenuItem>
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
