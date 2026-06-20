import { apiClient } from "./client";
import type { ApiResponse } from "@/types/api";
import type {
  LoginRequest,
  LoginResponseData,
  RegisterRequest,
  RegisterResponseData,
} from "@/types/auth";

export async function register(
  payload: RegisterRequest,
): Promise<ApiResponse<RegisterResponseData>> {
  const formData = new FormData();
  formData.append("username", payload.username);
  formData.append("gender", payload.gender);
  formData.append("phone_number", payload.phone_number);
  formData.append("email", payload.email);
  formData.append("password", payload.password);
  formData.append("role", payload.role);
  formData.append("avatar", payload.avatar);

  const res = await apiClient.post<ApiResponse<RegisterResponseData>>(
    "/api/auth/register",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return res.data;
}

export async function login(
  payload: LoginRequest,
): Promise<ApiResponse<LoginResponseData>> {
  const res = await apiClient.post<ApiResponse<LoginResponseData>>(
    "/api/auth/login",
    payload,
  );
  return res.data;
}
