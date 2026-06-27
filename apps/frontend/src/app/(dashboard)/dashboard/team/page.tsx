import { Users } from "lucide-react"

export default function TeamWorkspacePage() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between space-y-2 pb-4 border-b">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Nhóm làm việc</h2>
          <p className="text-muted-foreground">
            Cộng tác cùng đồng nghiệp để chỉnh sửa và lồng tiếng video
          </p>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm mt-6">
        <div className="flex flex-col items-center gap-1 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <Users className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">Chưa có ai ở đây cả</h3>
          <p className="mb-4 text-sm text-muted-foreground text-balance max-w-sm">
            Tính năng Nhóm làm việc đang được phát triển. Bạn sẽ sớm có thể mời bạn bè tham gia cùng!
          </p>
        </div>
      </div>
    </div>
  )
}
