import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { register as registerApi } from "@/api/authApi";
import { isAxiosError } from "axios";
import type { ApiErrorBody } from "@/types/api";

const schema = z.object({
  username: z.string().min(1, "Bắt buộc"),
  gender: z.enum(["Male", "Female"]),
  phone_number: z.string().min(8, "Số điện thoại không hợp lệ"),
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Tối thiểu 6 ký tự"),
  role: z.enum(["CUSTOMER", "RECEPTIONIST"]),
});

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { gender: "Male", role: "CUSTOMER" },
  });

  const onSubmit = async (values: FormValues) => {
    if (!avatarFile) {
      setErrorMessage("Vui lòng chọn ảnh đại diện");
      return;
    }
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await registerApi({ ...values, avatar: avatarFile });
      console.log("[Register] success:", res.data);
      navigate("/login");
    } catch (err) {
      if (isAxiosError<ApiErrorBody>(err)) {
        setErrorMessage(err.response?.data.message ?? "Đăng ký thất bại");
        console.error("[Register] error:", err.response?.data ?? err);
      } else {
        setErrorMessage("Đăng ký thất bại");
        console.error("[Register] error:", err);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Đăng ký tài khoản</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Họ tên</Label>
              <Input id="username" {...register("username")} />
              {errors.username && (
                <p className="text-sm text-red-600">{errors.username.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">Giới tính</Label>
              <select
                id="gender"
                {...register("gender")}
                className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone_number">Số điện thoại</Label>
              <Input id="phone_number" {...register("phone_number")} />
              {errors.phone_number && (
                <p className="text-sm text-red-600">{errors.phone_number.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input id="password" type="password" {...register("password")} />
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Vai trò</Label>
              <select
                id="role"
                {...register("role")}
                className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm"
              >
                <option value="CUSTOMER">Customer</option>
                <option value="RECEPTIONIST">Receptionist</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="avatar">Ảnh đại diện</Label>
              <Input
                id="avatar"
                type="file"
                accept="image/*"
                onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
              />
            </div>

            {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Đang đăng ký..." : "Đăng ký"}
            </Button>

            <p className="text-center text-sm text-slate-500">
              Đã có tài khoản?{" "}
              <Link to="/login" className="underline">
                Đăng nhập
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
