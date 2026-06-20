import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, Link } from "react-router-dom";
import { isAxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { login as loginApi } from "@/api/authApi";
import { useAuth } from "@/context/AuthContext";
import type { ApiErrorBody } from "@/types/api";

const schema = z.object({
  phone_number: z.string().min(1, "Bắt buộc"),
  password: z.string().min(1, "Bắt buộc"),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await loginApi(values);
      console.log("[Login] success:", res.data);
      login(res.data);
      navigate("/actions");
    } catch (err) {
      if (isAxiosError<ApiErrorBody>(err)) {
        setErrorMessage(err.response?.data.message ?? "Đăng nhập thất bại");
        console.error("[Login] error:", err.response?.data ?? err);
      } else {
        setErrorMessage("Đăng nhập thất bại");
        console.error("[Login] error:", err);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Đăng nhập</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone_number">Số điện thoại</Label>
              <Input id="phone_number" {...register("phone_number")} />
              {errors.phone_number && (
                <p className="text-sm text-red-600">{errors.phone_number.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input id="password" type="password" {...register("password")} />
              {errors.password && (
                <p className="text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Đang đăng nhập..." : "Đăng nhập"}
            </Button>

            <p className="text-center text-sm text-slate-500">
              Chưa có tài khoản?{" "}
              <Link to="/register" className="underline">
                Đăng ký
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
