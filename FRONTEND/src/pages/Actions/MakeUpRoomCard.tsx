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
import { requestMakeUpRoom } from "@/api/actionsApi";
import type { ApiErrorBody } from "@/types/api";
import type { MakeUpRoomResponseData } from "@/types/actions";

export default function MakeUpRoomCard() {
  const [roomNumber, setRoomNumber] = useState("1001");
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<MakeUpRoomResponseData | null>(null);

  const handleRequest = async () => {
    setSubmitting(true);
    setLastResult(null);
    try {
      const res = await requestMakeUpRoom({ room_number: roomNumber });
      console.log("[Make up room] success:", res.data);
      setLastResult(res.data);
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
        <p className="text-xs text-muted-foreground">
          Data is fetched/written via the Opera Bridge backend — Endpoint:{" "}
          <code className="font-mono">POST /api/rooms/{"{room_number}"}/make-up-room</code>
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="mur-room">Room Number</Label>
          <Input id="mur-room" value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} />
        </div>
        <Button onClick={handleRequest} disabled={submitting} className="w-full">
          {submitting ? "Processing..." : "Request room cleaning"}
        </Button>
      </CardContent>
      <Dialog
        open={lastResult !== null}
        onOpenChange={(open) => {
          if (!open) setLastResult(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="sr-only">Make Up Room Result</DialogTitle>
          </DialogHeader>
          {lastResult && (
            <div className="space-y-1 text-sm">
              <p className="font-bold italic text-blue-600 dark:text-blue-400">
                Data is fetched/written via the Opera Bridge backend
              </p>
              <p className="font-bold italic text-blue-600 dark:text-blue-400">
                Endpoint:{" "}
                <code className="font-mono">/api/rooms/{lastResult.room_number}/make-up-room</code>
              </p>
              <p>
                <span className="font-medium">Room name:</span> {lastResult.room_name}
              </p>
              <p>
                <span className="font-medium">Room number:</span> {lastResult.room_number}
              </p>
              <p>
                <span className="font-medium">Make up room:</span>{" "}
                {lastResult.make_up_room ? "Requested" : "Completed"}
              </p>
              <p>
                <span className="font-medium">Updated at:</span> {lastResult.updated_at}
              </p>
              <p className="pt-1 font-bold text-green-700 dark:text-green-400">
                Room cleaning request sent successfully
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
