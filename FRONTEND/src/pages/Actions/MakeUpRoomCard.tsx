import { useState } from "react";
import { isAxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requestMakeUpRoom } from "@/api/actionsApi";
import type { ApiErrorBody } from "@/types/api";

export default function MakeUpRoomCard() {
  const [roomNumber, setRoomNumber] = useState("11");
  const [submitting, setSubmitting] = useState(false);

  const handleRequest = async () => {
    setSubmitting(true);
    try {
      const res = await requestMakeUpRoom({ room_number: roomNumber });
      console.log("[Make up room] success:", res.data);
    } catch (err) {
      if (isAxiosError<ApiErrorBody>(err)) {
        console.error("[Make up room] error:", err.response?.data ?? err);
      } else {
        console.error("[Make up room] error:", err);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Make up room</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="mur-room">Room Number</Label>
          <Input id="mur-room" value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} />
        </div>
        <Button onClick={handleRequest} disabled={submitting} className="w-full">
          {submitting ? "Đang xử lý..." : "Yêu cầu dọn phòng"}
        </Button>
      </CardContent>
    </Card>
  );
}
