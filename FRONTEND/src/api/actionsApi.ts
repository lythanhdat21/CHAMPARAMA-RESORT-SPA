import { apiClient } from "./client";
import type { ApiResponse } from "@/types/api";
import type {
  CheckInRequest,
  CheckInResponseData,
  CheckOutRequest,
  CheckOutResponseData,
  DndRequest,
  DndResponseData,
  MakeUpRoomRequest,
  MakeUpRoomResponseData,
} from "@/types/actions";

export async function checkIn(
  payload: CheckInRequest,
): Promise<ApiResponse<CheckInResponseData>> {
  const res = await apiClient.post<ApiResponse<CheckInResponseData>>(
    "/api/stays/check-in",
    payload,
  );
  return res.data;
}

export async function checkOut(
  payload: CheckOutRequest,
): Promise<ApiResponse<CheckOutResponseData>> {
  const res = await apiClient.post<ApiResponse<CheckOutResponseData>>(
    "/api/stays/check-out",
    payload,
  );
  return res.data;
}

export async function setDnd(
  payload: DndRequest,
): Promise<ApiResponse<DndResponseData>> {
  const res = await apiClient.patch<ApiResponse<DndResponseData>>(
    `/api/rooms/${payload.room_number}/do-not-disturb`,
    { status: payload.status },
  );
  return res.data;
}

export async function requestMakeUpRoom(
  payload: MakeUpRoomRequest,
): Promise<ApiResponse<MakeUpRoomResponseData>> {
  const res = await apiClient.post<ApiResponse<MakeUpRoomResponseData>>(
    `/api/rooms/${payload.room_number}/make-up-room`,
  );
  return res.data;
}
