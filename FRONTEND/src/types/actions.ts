export interface CheckInRequest {
  room_number: string;
  room_name?: string;
  username: string;
  gender: "Male" | "Female";
  phone_number: string;
  number_of_guests: number;
  expected_arrival_date: string; // "YYYY-MM-DD"
  expected_departure_date: string; // "YYYY-MM-DD"
}

export interface CheckInResponseData {
  stay_id: number;
  reservation_id: number;
  room_number: string;
  room_name: string;
  username: string;
  gender: string;
  phone_number: string;
  number_of_guests: number;
  expected_arrival_date: string;
  expected_departure_date: string;
  status: "CHECKED_IN" | "CHECKED_OUT";
  checked_in_at: string;
  checked_in_by: number;
}

export interface CheckOutRequest {
  room_number: string;
}

export interface CheckOutResponseData {
  stay_id: number;
  reservation_id: number;
  room_number: string;
  room_name: string;
  username: string;
  gender: string;
  phone_number: string;
  number_of_guests: number;
  expected_arrival_date: string;
  expected_departure_date: string;
  status: "CHECKED_IN" | "CHECKED_OUT";
  checked_out_at: string;
  checked_out_by: number;
}

export interface DndRequest {
  room_number: string;
  status: boolean;
}

export interface DndResponseData {
  room_number: string;
  room_name: string;
  do_not_disturb: boolean;
  updated_at: string;
}

export interface MakeUpRoomRequest {
  room_number: string;
}

export interface MakeUpRoomResponseData {
  room_number: string;
  room_name: string;
  make_up_room: boolean;
  updated_at: string;
}
