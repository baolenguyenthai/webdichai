import { Folder } from "lucide-react"

export default function FoldersPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between space-y-2 pb-4 border-b">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Thư mục</h2>
          <p className="text-muted-foreground">
            Sắp xếp các dự án dịch thuật của bạn theo chủ đề
          </p>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm mt-6">
        <div className="flex flex-col items-center gap-1 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <Folder className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">Thư mục trống</h3>
          <p className="mb-4 text-sm text-muted-foreground text-balance max-w-sm">
            Tạo thư mục mới để dễ dàng quản lý hàng tá video của bạn.
          </p>
        </div>
      </div>
    </div>
  )
}
