import { Video } from "lucide-react"

export default function AllVideosPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between space-y-2 pb-4 border-b">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Tất cả Video</h2>
          <p className="text-muted-foreground">
            Quản lý toàn bộ video bạn đã tải lên hệ thống
          </p>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm mt-6">
        <div className="flex flex-col items-center gap-1 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <Video className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">Chưa có video nào</h3>
          <p className="mb-4 text-sm text-muted-foreground text-balance max-w-sm">
            Bạn chưa tải lên video nào. Hãy về trang Tổng quan để bắt đầu dịch video đầu tiên nhé.
          </p>
        </div>
      </div>
    </div>
  )
}
