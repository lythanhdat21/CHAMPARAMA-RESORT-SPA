import { useState } from "react";
import { isAxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { setDnd } from "@/api/actionsApi";
import type { ApiErrorBody } from "@/types/api";

export default function DndCard() {
  const [roomNumber, setRoomNumber] = useState("11");
  const [submitting, setSubmitting] = useState(false);

  const handleSetDnd = async (status: boolean) => {
    setSubmitting(true);
    try {
      const res = await setDnd({ room_number: roomNumber, status });
      console.log("[Do Not Disturb] success:", res.data);
    } catch (err) {
      if (isAxiosError<ApiErrorBody>(err)) {
        console.error("[Do Not Disturb] error:", err.response?.data ?? err);
      } else {
        console.error("[Do Not Disturb] error:", err);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Do Not Disturb</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="dnd-room">Room Number</Label>
          <Input id="dnd-room" value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Button onClick={() => handleSetDnd(true)} disabled={submitting} className="flex-1">
            Bật DND
          </Button>
          <Button
            onClick={() => handleSetDnd(false)}
            disabled={submitting}
            variant="outline"
            className="flex-1"
          >
            Tắt DND
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
