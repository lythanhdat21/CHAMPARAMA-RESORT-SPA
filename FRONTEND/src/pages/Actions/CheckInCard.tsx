import { useState } from "react";
import { isAxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { checkIn } from "@/api/actionsApi";
import type { ApiErrorBody } from "@/types/api";
import type { CheckInResponseData } from "@/types/actions";

// Theo seed thật trong DB (BACKEND/opera-bridge/README.md mục "Dữ liệu mẫu") — mỗi loại phòng
// kèm room_number của phòng đầu tiên thuộc loại đó, để chọn Room Name là tự điền đúng Room Number.
const ROOM_TYPE_OPTIONS = [
  { name: "Disabled", roomNumber: "101" },
  { name: "Premium King 2", roomNumber: "201" },
  { name: "Premium Twin", roomNumber: "301" },
  { name: "Deluxe Twin", roomNumber: "401" },
  { name: "Deluxe Twin 2", roomNumber: "601" },
  { name: "Deluxe Twin 3", roomNumber: "701" },
  { name: "Deluxe King", roomNumber: "801" },
  { name: "Deluxe King 2", roomNumber: "901" },
  { name: "Premium King", roomNumber: "1001" },
  { name: "Junior Suite Twin", roomNumber: "1101" },
  { name: "Junior Suite King", roomNumber: "1201" },
  { name: "Grand Suite", roomNumber: "1301" },
];

const DEFAULT_ROOM_TYPE =
  ROOM_TYPE_OPTIONS.find((o) => o.name === "Premium King") ?? ROOM_TYPE_OPTIONS[0];

export default function CheckInCard() {
  const [roomNumber, setRoomNumber] = useState(DEFAULT_ROOM_TYPE.roomNumber);
  const [roomName, setRoomName] = useState(DEFAULT_ROOM_TYPE.name);
  const [username, setUsername] = useState("Tony Lee");
  const [gender, setGender] = useState<"Male" | "Female">("Male");
  const [phoneNumber, setPhoneNumber] = useState("0123456789");
  const [numberOfGuests, setNumberOfGuests] = useState("2");
  const [arrivalDate, setArrivalDate] = useState("2026-06-25");
  const [departureDate, setDepartureDate] = useState("2026-06-30");
  const [submitting, setSubmitting] = useState(false);
  const [lastCheckIn, setLastCheckIn] = useState<CheckInResponseData | null>(null);

  const handleCheckIn = async () => {
    setSubmitting(true);
    setLastCheckIn(null);
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
      setLastCheckIn(res.data);
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
        <p className="text-xs text-muted-foreground">
          Data is fetched/written via the Opera Bridge backend — Endpoint:{" "}
          <code className="font-mono">POST /api/stays/check-in</code>
        </p>
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
            <select
              id="ci-room-name"
              value={roomName}
              onChange={(e) => {
                const option = ROOM_TYPE_OPTIONS.find((o) => o.name === e.target.value);
                if (option) {
                  setRoomName(option.name);
                  setRoomNumber(option.roomNumber);
                }
              }}
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm"
            >
              {ROOM_TYPE_OPTIONS.map((option) => (
                <option key={option.name} value={option.name}>
                  {option.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Selecting a room type will auto-fill the Room Number of the first room of that
              type.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1 col-span-2">
            <Label htmlFor="ci-username">Guest name</Label>
            <Input id="ci-username" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ci-gender">Gender</Label>
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
          <Label htmlFor="ci-phone">Guest phone number</Label>
          <Input
            id="ci-phone"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label htmlFor="ci-guests">Number of guests</Label>
            <Input
              id="ci-guests"
              value={numberOfGuests}
              onChange={(e) => setNumberOfGuests(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ci-arrival">Arrival date</Label>
            <Input
              id="ci-arrival"
              type="date"
              value={arrivalDate}
              onChange={(e) => setArrivalDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ci-departure">Departure date</Label>
            <Input
              id="ci-departure"
              type="date"
              value={departureDate}
              onChange={(e) => setDepartureDate(e.target.value)}
            />
          </div>
        </div>
        <Button onClick={handleCheckIn} disabled={submitting} className="w-full">
          {submitting ? "Processing..." : "Check in"}
        </Button>
      </CardContent>
      <Dialog
        open={lastCheckIn !== null}
        onOpenChange={(open) => {
          if (!open) setLastCheckIn(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="sr-only">Check-in Result</DialogTitle>
          </DialogHeader>
          {lastCheckIn && (
            <div className="space-y-1 text-sm">
              <p className="font-bold italic text-blue-600 dark:text-blue-400">
                Data is fetched/written via the Opera Bridge backend
              </p>
              <p className="font-bold italic text-blue-600 dark:text-blue-400">
                Endpoint: <code className="font-mono">/api/stays/check-in</code>
              </p>
              <p>
                <span className="font-medium">Guest name:</span> {lastCheckIn.username}
              </p>
              <p>
                <span className="font-medium">Gender:</span> {lastCheckIn.gender}
              </p>
              <p>
                <span className="font-medium">Room name:</span> {lastCheckIn.room_name}
              </p>
              <p>
                <span className="font-medium">Room number:</span> {lastCheckIn.room_number}
              </p>
              <p className="pt-1 font-bold text-green-700 dark:text-green-400">
                Check-in successful
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
