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
import { checkOut } from "@/api/actionsApi";
import type { ApiErrorBody } from "@/types/api";
import type { CheckOutResponseData } from "@/types/actions";

export default function CheckOutCard() {
  const [roomNumber, setRoomNumber] = useState("1001");
  const [submitting, setSubmitting] = useState(false);
  const [lastCheckOut, setLastCheckOut] = useState<CheckOutResponseData | null>(null);

  const handleCheckOut = async () => {
    setSubmitting(true);
    setLastCheckOut(null);
    try {
      const res = await checkOut({ room_number: roomNumber });
      console.log("[Check-out] success:", res.data);
      setLastCheckOut(res.data);
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
        <p className="text-xs text-muted-foreground">
          Data is fetched/written via the Opera Bridge backend — Endpoint:{" "}
          <code className="font-mono">POST /api/stays/check-out</code>
        </p>
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
          {submitting ? "Processing..." : "Check out"}
        </Button>
      </CardContent>
      <Dialog
        open={lastCheckOut !== null}
        onOpenChange={(open) => {
          if (!open) setLastCheckOut(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="sr-only">Check-out Result</DialogTitle>
          </DialogHeader>
          {lastCheckOut && (
            <div className="space-y-1 text-sm">
              <p className="font-bold italic text-blue-600 dark:text-blue-400">
                Data is fetched/written via the Opera Bridge backend
              </p>
              <p className="font-bold italic text-blue-600 dark:text-blue-400">
                Endpoint: <code className="font-mono">/api/stays/check-out</code>
              </p>
              <p>
                <span className="font-medium">Guest name:</span> {lastCheckOut.username}
              </p>
              <p>
                <span className="font-medium">Gender:</span> {lastCheckOut.gender}
              </p>
              <p>
                <span className="font-medium">Room name:</span> {lastCheckOut.room_name}
              </p>
              <p>
                <span className="font-medium">Room number:</span> {lastCheckOut.room_number}
              </p>
              <p>
                <span className="font-medium">Checked out at:</span>{" "}
                {lastCheckOut.checked_out_at}
              </p>
              <p className="pt-1 font-bold text-green-700 dark:text-green-400">
                Check-out successful
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
