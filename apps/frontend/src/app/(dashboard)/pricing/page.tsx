"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"
import { api } from "@/store/auth.store"
import { toast } from "sonner"

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null)

  const handleCheckout = async (packageType: 'basic' | 'pro') => {
    setLoading(packageType)
    try {
      const res = await api.post('/payment/checkout', { packageType })
      if (res.data.data.url) {
        window.location.href = res.data.data.url
      }
    } catch (error) {
      toast.error('Không thể tạo phiên thanh toán')
      setLoading(null)
    }
  }

  return (
    <div className="py-12 flex flex-col items-center justify-center max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
          Nâng cấp Tài khoản
        </h1>
        <p className="mt-4 text-xl text-muted-foreground">
          Mua thêm Credits để sử dụng tính năng Dịch AI và Clone Giọng Nói
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl">
        {/* Basic Plan */}
        <div className="rounded-2xl border bg-card p-8 shadow-sm flex flex-col">
          <h3 className="text-2xl font-semibold">Gói Cơ Bản</h3>
          <p className="text-muted-foreground mt-2">Dành cho người mới bắt đầu</p>
          <div className="mt-4 flex items-baseline text-5xl font-extrabold">
            10.000<span className="text-xl font-medium text-muted-foreground ml-1">VNĐ</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Nhận 100 Credits</p>
          <ul className="mt-8 space-y-4 flex-1">
            <li className="flex items-center gap-3">
              <Check className="h-5 w-5 text-green-500" />
              <span>Sử dụng AI Whisper bóc băng Audio</span>
            </li>
            <li className="flex items-center gap-3">
              <Check className="h-5 w-5 text-green-500" />
              <span>Dịch phụ đề bằng GPT-4o-mini</span>
            </li>
            <li className="flex items-center gap-3">
              <Check className="h-5 w-5 text-green-500" />
              <span>Dịch dưới 10 video/tháng</span>
            </li>
          </ul>
          <Button 
            className="mt-8 w-full" 
            onClick={() => handleCheckout('basic')}
            disabled={loading === 'basic'}
          >
            {loading === 'basic' ? 'Đang chuyển hướng...' : 'Mua Gói Cơ Bản'}
          </Button>
        </div>

        {/* Pro Plan */}
        <div className="rounded-2xl border-2 border-primary bg-card p-8 shadow-lg flex flex-col relative">
          <div className="absolute top-0 right-6 -translate-y-1/2">
            <span className="inline-flex items-center rounded-full bg-primary px-3 py-1 text-sm font-semibold text-primary-foreground">
              Phổ biến nhất
            </span>
          </div>
          <h3 className="text-2xl font-semibold">Gói Pro</h3>
          <p className="text-muted-foreground mt-2">Dành cho nhà sáng tạo nội dung</p>
          <div className="mt-4 flex items-baseline text-5xl font-extrabold">
            50.000<span className="text-xl font-medium text-muted-foreground ml-1">VNĐ</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Nhận 600 Credits (Tiết kiệm 20%)</p>
          <ul className="mt-8 space-y-4 flex-1">
            <li className="flex items-center gap-3">
              <Check className="h-5 w-5 text-primary" />
              <span className="font-medium">Toàn bộ tính năng Gói Cơ Bản</span>
            </li>
            <li className="flex items-center gap-3">
              <Check className="h-5 w-5 text-primary" />
              <span>Lồng tiếng ElevenLabs (Voice Cloning)</span>
            </li>
            <li className="flex items-center gap-3">
              <Check className="h-5 w-5 text-primary" />
              <span>Xuất Video chất lượng cao không watermark</span>
            </li>
            <li className="flex items-center gap-3">
              <Check className="h-5 w-5 text-primary" />
              <span>Hỗ trợ ưu tiên 24/7</span>
            </li>
          </ul>
          <Button 
            className="mt-8 w-full text-lg h-12" 
            onClick={() => handleCheckout('pro')}
            disabled={loading === 'pro'}
          >
            {loading === 'pro' ? 'Đang chuyển hướng...' : 'Mua Gói Pro'}
          </Button>
        </div>
      </div>
    </div>
  )
}
