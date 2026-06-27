import { CheckCircle2, Loader2, Circle } from "lucide-react"

interface Step {
  name: string
  status: 'pending' | 'processing' | 'done' | 'error'
}

interface ProjectProgressCardProps {
  percent: number
  message?: string
  estimatedTimeLeft?: number
  steps?: Step[]
}

export function ProjectProgressCard({
  percent,
  message,
  estimatedTimeLeft,
  steps
}: ProjectProgressCardProps) {
  return (
    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-6 z-20 overflow-hidden">
      <div className="w-full max-w-sm bg-background/10 backdrop-blur-md rounded-xl p-4 border border-white/10 shadow-2xl">
        <h4 className="text-white text-base font-semibold mb-3 text-center">Tiến trình xử lý AI</h4>
        
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-white/80 mb-1">
            <span className="truncate max-w-[80%]">{message || "Đang xử lý..."}</span>
            <span className="font-medium">{percent}%</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300" 
              style={{ width: `${percent}%` }}
            />
          </div>
          {estimatedTimeLeft !== undefined && estimatedTimeLeft > 0 && (
            <p className="text-[10px] text-white/60 mt-1.5 text-right">
              ETA: ~{estimatedTimeLeft} giây
            </p>
          )}
        </div>

        {/* Steps */}
        {steps && steps.length > 0 && (
          <div className="space-y-2 mt-4">
            {steps.map((step, idx) => (
              <div key={idx} className="flex items-center gap-2.5 text-sm">
                {step.status === 'done' && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                {step.status === 'processing' && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
                {step.status === 'pending' && <Circle className="w-4 h-4 text-white/30" />}
                {step.status === 'error' && <Circle className="w-4 h-4 text-destructive" />}
                
                <span className={`
                  ${step.status === 'done' ? 'text-white/80' : ''}
                  ${step.status === 'processing' ? 'text-white font-medium' : ''}
                  ${step.status === 'pending' ? 'text-white/40' : ''}
                  ${step.status === 'error' ? 'text-destructive' : ''}
                  text-xs transition-colors
                `}>
                  {step.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
