import { Settings } from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between space-y-2 pb-4 border-b">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Cài đặt</h2>
          <p className="text-muted-foreground">
            Tùy chỉnh cấu hình tài khoản, ngôn ngữ mặc định và thanh toán
          </p>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm mt-6">
        <div className="flex flex-col items-center gap-1 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <Settings className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">Cài đặt hệ thống</h3>
          <p className="mb-4 text-sm text-muted-foreground text-balance max-w-sm">
            Bảng điều khiển cài đặt đang được xây dựng. Vui lòng quay lại sau!
          </p>
        </div>
      </div>
    </div>
  )
}
