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
import { setDnd } from "@/api/actionsApi";
import type { ApiErrorBody } from "@/types/api";
import type { DndResponseData } from "@/types/actions";

export default function DndCard() {
  const [roomNumber, setRoomNumber] = useState("1001");
  const [submitting, setSubmitting] = useState(false);
  const [lastDnd, setLastDnd] = useState<DndResponseData | null>(null);

  const handleSetDnd = async (status: boolean) => {
    setSubmitting(true);
    setLastDnd(null);
    try {
      const res = await setDnd({ room_number: roomNumber, status });
      console.log("[Do Not Disturb] success:", res.data);
      setLastDnd(res.data);
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
        <p className="text-xs text-muted-foreground">
          Data is fetched/written via the Opera Bridge backend — Endpoint:{" "}
          <code className="font-mono">PATCH /api/rooms/{"{room_number}"}/do-not-disturb</code>
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="dnd-room">Room Number</Label>
          <Input id="dnd-room" value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Button onClick={() => handleSetDnd(true)} disabled={submitting} className="flex-1">
            Turn DND On
          </Button>
          <Button
            onClick={() => handleSetDnd(false)}
            disabled={submitting}
            variant="outline"
            className="flex-1"
          >
            Turn DND Off
          </Button>
        </div>
      </CardContent>
      <Dialog
        open={lastDnd !== null}
        onOpenChange={(open) => {
          if (!open) setLastDnd(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="sr-only">Do Not Disturb Result</DialogTitle>
          </DialogHeader>
          {lastDnd && (
            <div className="space-y-1 text-sm">
              <p className="font-bold italic text-blue-600 dark:text-blue-400">
                Data is fetched/written via the Opera Bridge backend
              </p>
              <p className="font-bold italic text-blue-600 dark:text-blue-400">
                Endpoint:{" "}
                <code className="font-mono">/api/rooms/{lastDnd.room_number}/do-not-disturb</code>
              </p>
              <p>
                <span className="font-medium">Room name:</span> {lastDnd.room_name}
              </p>
              <p>
                <span className="font-medium">Room number:</span> {lastDnd.room_number}
              </p>
              <p>
                <span className="font-medium">Do Not Disturb:</span>{" "}
                {lastDnd.do_not_disturb ? "Enabled" : "Disabled"}
              </p>
              <p>
                <span className="font-medium">Updated at:</span> {lastDnd.updated_at}
              </p>
              <p className="pt-1 font-bold text-green-700 dark:text-green-400">
                Do Not Disturb turned {lastDnd.do_not_disturb ? "ON" : "OFF"} successfully
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
