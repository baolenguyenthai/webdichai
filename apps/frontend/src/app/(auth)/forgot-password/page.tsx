"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/store/auth.store"
import { toast } from "sonner"

const forgotSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
})

const resetSchema = z.object({
  code: z.string().length(6, "Mã OTP phải gồm 6 số"),
  newPassword: z.string().min(6, "Mật khẩu ít nhất 6 ký tự"),
})

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<"email" | "reset">("email")
  const [savedEmail, setSavedEmail] = useState("")

  const forgotForm = useForm<z.infer<typeof forgotSchema>>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  })

  const resetForm = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: { code: "", newPassword: "" },
  })

  async function onForgotSubmit(values: z.infer<typeof forgotSchema>) {
    setLoading(true)
    try {
      await api.post("/auth/forgot-password", values)
      setSavedEmail(values.email)
      setStep("reset")
      toast.success("Mã OTP đã được gửi đến email của bạn!")
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Không thể gửi OTP")
    } finally {
      setLoading(false)
    }
  }

  async function onResetSubmit(values: z.infer<typeof resetSchema>) {
    setLoading(true)
    try {
      await api.post("/auth/reset-password", {
        email: savedEmail,
        code: values.code,
        newPassword: values.newPassword,
      })
      toast.success("Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại.")
      router.push("/login")
    } catch (error: any) {
      toast.error(error.response?.data?.message || "OTP không hợp lệ hoặc đã hết hạn")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">
            {step === "email" ? "Quên mật khẩu" : "Đặt lại mật khẩu"}
          </CardTitle>
          <CardDescription>
            {step === "email"
              ? "Nhập email của bạn để nhận mã khôi phục"
              : "Nhập mã OTP vừa được gửi tới email và mật khẩu mới"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "email" ? (
            <Form {...forgotForm}>
              <form onSubmit={forgotForm.handleSubmit(onForgotSubmit)} className="space-y-4">
                <FormField
                  control={forgotForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="name@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Đang gửi..." : "Gửi mã OTP"}
                </Button>
              </form>
            </Form>
          ) : (
            <Form {...resetForm}>
              <form onSubmit={resetForm.handleSubmit(onResetSubmit)} className="space-y-4">
                <FormField
                  control={resetForm.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mã OTP</FormLabel>
                      <FormControl>
                        <Input placeholder="123456" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={resetForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mật khẩu mới</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Đang xử lý..." : "Xác nhận đặt lại"}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            Quay lại{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Đăng nhập
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
