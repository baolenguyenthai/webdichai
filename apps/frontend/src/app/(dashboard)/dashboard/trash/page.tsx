import { Trash2 } from "lucide-react"

export default function TrashPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between space-y-2 pb-4 border-b">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Thùng rác</h2>
          <p className="text-muted-foreground">
            Các dự án và video đã bị xóa sẽ nằm ở đây
          </p>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm mt-6">
        <div className="flex flex-col items-center gap-1 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <Trash2 className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">Thùng rác trống</h3>
          <p className="mb-4 text-sm text-muted-foreground text-balance max-w-sm">
            Bạn chưa xóa bất kỳ dự án nào. Các mục bị xóa sẽ tự động biến mất vĩnh viễn sau 30 ngày.
          </p>
        </div>
      </div>
    </div>
  )
}
