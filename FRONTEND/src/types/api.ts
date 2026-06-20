export interface ApiResponse<T> {
  message: string;
  status: "success" | "error";
  data: T;
}

export interface ApiErrorBody {
  message: string;
  status: "error";
}
