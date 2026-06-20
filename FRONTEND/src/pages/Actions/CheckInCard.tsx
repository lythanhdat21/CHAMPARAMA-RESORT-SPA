import { useState } from "react";
import { isAxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { checkIn } from "@/api/actionsApi";
import type { ApiErrorBody } from "@/types/api";

export default function CheckInCard() {
  const [roomNumber, setRoomNumber] = useState("11");
  const [roomName, setRoomName] = useState("Premium King");
  const [username, setUsername] = useState("Tony Lee");
  const [gender, setGender] = useState<"Male" | "Female">("Male");
  const [phoneNumber, setPhoneNumber] = useState("0123456789");
  const [numberOfGuests, setNumberOfGuests] = useState("2");
  const [arrivalDate, setArrivalDate] = useState("2026-06-25");
  const [departureDate, setDepartureDate] = useState("2026-06-30");
  const [submitting, setSubmitting] = useState(false);

  const handleCheckIn = async () => {
    setSubmitting(true);
    try {
      const res = await checkIn({
        room_number: roomNumber,
        room_name: roomName,
        username,
        gender,
        phone_number: phoneNumber,
        number_of_guests: Number(numberOfGuests),
        expected_arrival_date: arrivalDate,
        expected_departure_date: departureDate,
      });
      console.log("[Check-in] success:", res.data);
    } catch (err) {
      if (isAxiosError<ApiErrorBody>(err)) {
        console.error("[Check-in] error:", err.response?.data ?? err);
      } else {
        console.error("[Check-in] error:", err);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Check in</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="ci-room-number">Room Number</Label>
            <Input
              id="ci-room-number"
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ci-room-name">Room Name</Label>
            <Input
              id="ci-room-name"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1 col-span-2">
            <Label htmlFor="ci-username">Tên khách</Label>
            <Input id="ci-username" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ci-gender">Giới tính</Label>
            <select
              id="ci-gender"
              value={gender}
              onChange={(e) => setGender(e.target.value as "Male" | "Female")}
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm"
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="ci-phone">Số điện thoại khách</Label>
          <Input
            id="ci-phone"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label htmlFor="ci-guests">Số khách</Label>
            <Input
              id="ci-guests"
              value={numberOfGuests}
              onChange={(e) => setNumberOfGuests(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ci-arrival">Ngày đến</Label>
            <Input
              id="ci-arrival"
              type="date"
              value={arrivalDate}
              onChange={(e) => setArrivalDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ci-departure">Ngày đi</Label>
            <Input
              id="ci-departure"
              type="date"
              value={departureDate}
              onChange={(e) => setDepartureDate(e.target.value)}
            />
          </div>
        </div>
        <Button onClick={handleCheckIn} disabled={submitting} className="w-full">
          {submitting ? "Đang xử lý..." : "Check in"}
        </Button>
      </CardContent>
    </Card>
  );
}
