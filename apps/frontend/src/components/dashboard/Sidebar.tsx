"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  Folder, 
  Heart, 
  LayoutDashboard, 
  Settings, 
  Trash2, 
  Users,
  Video
} from "lucide-react"

import { cn } from "@/lib/utils"
import { useAuthStore } from "@/store/auth.store"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CreditCard, ShieldAlert } from "lucide-react"

export function Sidebar() {
  const pathname = usePathname()
  const { user } = useAuthStore()

  const links = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'All Videos', href: '/dashboard/videos', icon: Video },
    { name: 'Folders', href: '/dashboard/folders', icon: Folder },
    { name: 'Favorites', href: '/dashboard/favorites', icon: Heart },
    { name: 'Team Workspace', href: '/dashboard/team', icon: Users },
    { name: 'Trash', href: '/dashboard/trash', icon: Trash2 },
    { name: 'Pricing', href: '/pricing', icon: CreditCard },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ]

  const adminLinks = [
    { name: 'Admin Dashboard', href: '/admin', icon: ShieldAlert },
  ]

  return (
    <div className="flex h-full w-64 flex-col border-r bg-muted/40">
      <div className="flex h-14 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold">
          <Video className="h-6 w-6 text-primary" />
          <span>AI Translator</span>
        </Link>
      </div>
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-2 p-4">
          <nav className="grid items-start gap-1 text-sm font-medium">
            {links.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                    isActive && "bg-muted text-primary"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              )
            })}

            {user?.role === 'ADMIN' && (
              <>
                <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-4">
                  Admin
                </div>
                {adminLinks.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-destructive transition-all hover:text-destructive",
                        isActive && "bg-destructive/10"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.name}
                    </Link>
                  )
                })}
              </>
            )}
          </nav>
        </div>
      </ScrollArea>
    </div>
  )
}
