"use client"

import { useEffect, useState } from "react"
import { api } from "@/store/auth.store"
import { toast } from "sonner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { useAuthStore } from "@/store/auth.store"
import { useRouter } from "next/navigation"

interface UserData {
  id: string
  email: string
  name: string | null
  role: string
  credits: number
  createdAt: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  
  const { user } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      router.push('/dashboard')
      return
    }

    const fetchUsers = async () => {
      try {
        const res = await api.get('/admin/users')
        setUsers(res.data.data)
      } catch (error) {
        toast.error('Không thể tải danh sách người dùng')
      } finally {
        setLoading(false)
      }
    }
    if (user && user.role === 'ADMIN') {
      fetchUsers()
    }
  }, [user, router])

  if (loading) return <div className="p-8">Đang tải dữ liệu Admin...</div>

  return (
    <div className="flex flex-col gap-6 h-full max-w-6xl mx-auto w-full p-4 md:p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Quản lý Người dùng</h1>
        <p className="text-muted-foreground">Admin Dashboard - Danh sách khách hàng và số dư Credits.</p>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Vai trò</TableHead>
              <TableHead className="text-right">Credits</TableHead>
              <TableHead className="text-right">Ngày tham gia</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Không có dữ liệu
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name || 'Người dùng ẩn danh'}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Badge variant={u.role === 'ADMIN' ? 'destructive' : 'secondary'}>
                      {u.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-bold text-primary">{u.credits}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {format(new Date(u.createdAt), 'dd/MM/yyyy')}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
