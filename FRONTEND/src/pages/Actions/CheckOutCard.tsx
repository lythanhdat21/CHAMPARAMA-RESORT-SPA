import { useState } from "react";
import { isAxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { checkOut } from "@/api/actionsApi";
import type { ApiErrorBody } from "@/types/api";

export default function CheckOutCard() {
  const [roomNumber, setRoomNumber] = useState("201");
  const [submitting, setSubmitting] = useState(false);

  const handleCheckOut = async () => {
    setSubmitting(true);
    try {
      const res = await checkOut({ room_number: roomNumber });
      console.log("[Check-out] success:", res.data);
    } catch (err) {
      if (isAxiosError<ApiErrorBody>(err)) {
        console.error("[Check-out] error:", err.response?.data ?? err);
      } else {
        console.error("[Check-out] error:", err);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Check out</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="co-room-number">Room Number</Label>
          <Input
            id="co-room-number"
            value={roomNumber}
            onChange={(e) => setRoomNumber(e.target.value)}
          />
        </div>
        <Button onClick={handleCheckOut} disabled={submitting} className="w-full">
          {submitting ? "Đang xử lý..." : "Check out"}
        </Button>
      </CardContent>
    </Card>
  );
}
