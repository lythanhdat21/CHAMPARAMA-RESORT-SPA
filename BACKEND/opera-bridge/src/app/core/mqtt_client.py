"""MQTT client theo Legrand GRMS Guest Control Platform MQTT Interface Protocol.

Xem `BACKEND/SKILLS/FILES/Guest Control Platform MQTT Interface Protocol.pdf`.
Khi `settings.mqtt_enabled=False` (mặc định), mọi lệnh publish chỉ log ra console
thay vì kết nối broker thật — cho phép chạy demo bình thường mà không cần MQTT,
và bật lên để test với broker (local hoặc thật) khi cần trước khi nối OPERA Cloud/RCU.
"""
from __future__ import annotations

import itertools
import json
import logging
import time
from typing import Any

from app.core.config import settings

logger = logging.getLogger("app.mqtt")

try:
    import paho.mqtt.client as mqtt
except ImportError:  # pragma: no cover - chỉ xảy ra nếu chưa cài requirements.txt
    mqtt = None

_msg_seq = itertools.count(1)


def _next_msg_id() -> str:
    return f"OPERABRIDGE_{settings.mqtt_hotel_id}_{next(_msg_seq)}"


def _now_ts() -> int:
    return int(time.time())


class MqttClient:
    def __init__(self) -> None:
        self._client: "mqtt.Client | None" = None
        self._device_status_cache: dict[str, dict[str, Any]] = {}
        self._room_service_cache: dict[str, dict[str, Any]] = {}
        self._device_list_cache: dict[str, Any] | None = None

    @property
    def hotel_id(self) -> str:
        return settings.mqtt_hotel_id

    def connect(self) -> None:
        if not settings.mqtt_enabled:
            logger.info("MQTT đang tắt (MQTT_ENABLED=false) — bỏ qua kết nối broker.")
            return
        if mqtt is None:
            raise RuntimeError("paho-mqtt chưa được cài, kiểm tra requirements.txt")

        client = mqtt.Client(client_id=settings.mqtt_client_id)
        if settings.mqtt_username:
            client.username_pw_set(settings.mqtt_username, settings.mqtt_password)
        client.on_connect = self._on_connect
        client.on_message = self._on_message
        client.connect(settings.mqtt_broker_host, settings.mqtt_broker_port)
        client.loop_start()
        self._client = client

    def disconnect(self) -> None:
        if self._client is not None:
            self._client.loop_stop()
            self._client.disconnect()
            self._client = None

    def _on_connect(self, client: "mqtt.Client", userdata: Any, flags: Any, rc: int) -> None:
        if rc != 0:
            logger.warning("Kết nối MQTT broker thất bại, rc=%s", rc)
            return
        logger.info(
            "Đã kết nối MQTT broker %s:%s (hotelId=%s)",
            settings.mqtt_broker_host,
            settings.mqtt_broker_port,
            self.hotel_id,
        )
        for topic in (
            f"SMARTHOTEL/STATUS/{self.hotel_id}/RCU",
            f"SMARTHOTEL/STATUS/{self.hotel_id}/ROOMSERVICE",
            f"SMARTHOTEL/STATUS/{self.hotel_id}/RCU/DEVICELIST",
        ):
            client.subscribe(topic, qos=2)

    def _on_message(self, client: "mqtt.Client", userdata: Any, msg: Any) -> None:
        try:
            payload = json.loads(msg.payload.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            logger.warning("MQTT nhận message không phải JSON hợp lệ trên topic %s", msg.topic)
            return

        logger.info("MQTT nhận message trên topic %s: %s", msg.topic, payload)

        if msg.topic.endswith("/RCU/DEVICELIST"):
            self._device_list_cache = payload
        elif msg.topic.endswith("/ROOMSERVICE"):
            room_no = payload.get("roomNo")
            if room_no:
                self._room_service_cache[room_no] = payload
        elif msg.topic.endswith("/RCU"):
            room_no = payload.get("roomNo")
            if room_no:
                self._device_status_cache[room_no] = payload

    def _publish(self, topic: str, payload: dict[str, Any]) -> None:
        body = json.dumps(payload, ensure_ascii=False)
        if not settings.mqtt_enabled or self._client is None:
            logger.info("[MQTT đang tắt] sẽ publish topic=%s payload=%s", topic, body)
            return
        self._client.publish(topic, body, qos=2)

    # ---- [PMS] Check-in / Check-out ----

    def publish_pms_checkin(
        self,
        *,
        business_key: str,
        room_number: str,
        username: str,
        checkin_at: str,
        expected_departure: str,
    ) -> None:
        payload = {
            "msgId": _next_msg_id(),
            "hotelId": self.hotel_id,
            "businessKey": business_key,
            "roomNo": room_number,
            "shares": 0,
            "lastName": username,
            "checkin": checkin_at,
            "latestCheckout": expected_departure,
            "timestamp": _now_ts(),
        }
        self._publish(f"SMARTHOTEL/COMMAND/{self.hotel_id}/PMS/CHECKIN", payload)

    def publish_pms_checkout(self, *, business_key: str, room_number: str) -> None:
        payload = {
            "msgId": _next_msg_id(),
            "hotelId": self.hotel_id,
            "businessKey": business_key,
            "roomNo": room_number,
            "timestamp": _now_ts(),
        }
        self._publish(f"SMARTHOTEL/COMMAND/{self.hotel_id}/PMS/CHECKOUT", payload)

    # ---- [RCU] In-room Service Status Control (DND / Make Up Room) ----

    def publish_room_service_control(
        self, *, room_number: str, service_id: str, value: str, source_type: str
    ) -> None:
        msg_id = _next_msg_id()
        payload = {
            "msgId": msg_id,
            "hotelId": self.hotel_id,
            "roomNo": room_number,
            "status": [
                {
                    "serviceId": service_id,
                    "value": value,
                    "sourceType": source_type,
                    "sourceMsg": msg_id,
                }
            ],
            "timestamp": _now_ts(),
        }
        self._publish(f"SMARTHOTEL/COMMAND/{self.hotel_id}/RCU/ROOMSERVICECONTROL", payload)

    # ---- [RCU] Device List / Query Device Status ----

    def request_device_list(self) -> None:
        payload = {"msgId": _next_msg_id(), "hotelId": self.hotel_id, "timestamp": _now_ts()}
        self._publish(f"SMARTHOTEL/COMMAND/{self.hotel_id}/RCU/DEVICELIST", payload)

    def request_query_status(
        self, *, room_number: str, device_id: str | None = None, device_type: str | None = None
    ) -> None:
        payload = {
            "msgId": _next_msg_id(),
            "hotelId": self.hotel_id,
            "roomNo": room_number,
            "deviceId": device_id or "",
            "deviceType": device_type or "",
            "timestamp": _now_ts(),
        }
        self._publish(f"SMARTHOTEL/COMMAND/{self.hotel_id}/RCU/QUERYSTATUS", payload)

    # ---- Đọc lại message RCU đã nhận được (publish/subscribe là bất đồng bộ,
    # nên các API GET test sẽ đọc cache này thay vì chờ response trực tiếp) ----

    def get_device_list(self) -> dict[str, Any] | None:
        return self._device_list_cache

    def get_device_status(self, room_number: str) -> dict[str, Any] | None:
        return self._device_status_cache.get(room_number)

    def get_room_service_status(self, room_number: str) -> dict[str, Any] | None:
        return self._room_service_cache.get(room_number)


mqtt_client = MqttClient()
