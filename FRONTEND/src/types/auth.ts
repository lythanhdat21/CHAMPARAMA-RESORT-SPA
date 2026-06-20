export type Role = "RECEPTIONIST" | "CUSTOMER";
export type Gender = "Male" | "Female";

export interface RegisterRequest {
  username: string;
  gender: Gender;
  phone_number: string;
  email: string;
  password: string;
  role: Role;
  avatar: File;
}

export interface AuthUser {
  id: number;
  username: string;
  role: Role;
  avatar: string | null;
  created_at: string;
}

export interface RegisterResponseData extends AuthUser {
  phone_number: string;
  email: string;
}

export interface LoginRequest {
  phone_number: string;
  password: string;
}

export interface LoginResponseData extends AuthUser {
  access_token: string;
}
