"use client"

import { Sidebar } from "@/components/dashboard/Sidebar"
import { api, useAuthStore } from "@/store/auth.store"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { UserCircle } from "lucide-react"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, logout, refreshToken } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.push("/login")
    }
  }, [user, router])

  if (!user) return null

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-6 lg:h-[60px]">
          <div className="flex-1"></div>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center justify-center rounded-full h-10 w-10 bg-secondary hover:bg-secondary/80 focus:outline-none">
                {user.avatar ? (
                  <img src={user.avatar} alt="Avatar" className="h-8 w-8 rounded-full" />
                ) : (
                  <UserCircle className="h-5 w-5" />
                )}
                <span className="sr-only">Toggle user menu</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{user.name || user.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { api.post('/auth/logout', { refreshToken }).catch(() => null); logout(); router.push('/login'); }}>
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
