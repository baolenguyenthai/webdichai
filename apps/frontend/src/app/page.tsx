import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Video, Globe2, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-black text-zinc-50 overflow-hidden relative">
      {/* Background gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] opacity-20 bg-gradient-to-b from-blue-500 to-purple-600 blur-[100px] rounded-full pointer-events-none" />
      
      {/* Navigation */}
      <header className="container mx-auto px-6 py-6 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Video className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">WebDichAI</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login">
            <Button variant="ghost" className="text-zinc-300 hover:text-white hover:bg-zinc-800">
              Đăng nhập
            </Button>
          </Link>
          <Link href="/register">
            <Button className="bg-white text-black hover:bg-zinc-200">
              Bắt đầu miễn phí
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 container mx-auto px-6 flex flex-col items-center justify-center text-center relative z-10 py-32">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 mb-8">
          <Zap className="w-4 h-4 text-yellow-500" />
          <span className="text-sm font-medium text-zinc-300">Được cung cấp sức mạnh bởi Gemini 2.5 Flash</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 max-w-4xl bg-clip-text text-transparent bg-gradient-to-r from-white via-zinc-200 to-zinc-500">
          Dịch Video Đa Ngôn Ngữ Bằng AI Chỉ Trong Vài Phút
        </h1>
        
        <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mb-12 leading-relaxed">
          Phá bỏ rào cản ngôn ngữ cho nội dung của bạn. Tự động bóc băng, dịch thuật và lồng tiếng (Voice Cloning) video sang hơn 50 ngôn ngữ với công nghệ AI tiên tiến nhất.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link href="/register">
            <Button size="lg" className="h-14 px-8 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-full">
              Dùng thử ngay bây giờ <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button size="lg" variant="outline" className="h-14 px-8 text-lg border-zinc-700 hover:bg-zinc-800 rounded-full text-black">
              <Globe2 className="mr-2 w-5 h-5" /> Xem Demo
            </Button>
          </Link>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-32 text-left w-full max-w-5xl">
          <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
              <Video className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-white">Tự Động Bóc Băng</h3>
            <p className="text-zinc-400">Trích xuất âm thanh và nhận diện giọng nói chính xác thành văn bản trong tíc tắc.</p>
          </div>
          <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
            <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center mb-4">
              <Globe2 className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-white">Dịch Siêu Tốc Gemini</h3>
            <p className="text-zinc-400">Sử dụng sức mạnh của Google Gemini 2.5 để dịch phụ đề chuẩn xác theo ngữ cảnh.</p>
          </div>
          <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
            <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-yellow-400" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-white">Lồng Tiếng AI (Voice Cloning)</h3>
            <p className="text-zinc-400">Tạo ra giọng nói AI y hệt giọng thật của bạn với cảm xúc tự nhiên qua ElevenLabs.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
