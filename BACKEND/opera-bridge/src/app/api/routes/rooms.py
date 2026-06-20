from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.mqtt_client import mqtt_client
from app.core.security import require_roles
from app.core.timeutil import to_vn_str
from app.db.models import User
from app.db.session import get_db
from app.schemas.room import DndRequest
from app.services.room_service import (
    RoomNotFoundError,
    complete_make_up_room,
    get_room_by_number,
    request_make_up_room,
    set_dnd,
)

router = APIRouter(prefix="/api/rooms", tags=["rooms"])


@router.patch("/{room_number}/do-not-disturb")
def do_not_disturb_endpoint(
    room_number: str,
    payload: DndRequest,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles("RECEPTIONIST", "CUSTOMER")),
):
    try:
        room = set_dnd(db, room_number, turn_on=payload.status, actor=actor)
    except RoomNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": str(exc), "status": "error"},
        )

    message = (
        "Cập nhật trạng thái DND thành công. Không nên làm phiền khách."
        if payload.status
        else "Đã tắt trạng thái Do Not Disturb."
    )

    return {
        "message": message,
        "status": "success",
        "data": {
            "room_number": room.room_number,
            "room_name": room.room_type.name,
            "do_not_disturb": room.do_not_disturb,
            "updated_at": to_vn_str(room.updated_at),
        },
    }


@router.post("/{room_number}/make-up-room")
def make_up_room_endpoint(
    room_number: str,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles("CUSTOMER")),
):
    try:
        room = request_make_up_room(db, room_number, actor=actor)
    except RoomNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": str(exc), "status": "error"},
        )

    return {
        "message": "Đã gửi yêu cầu dọn phòng",
        "status": "success",
        "data": {
            "room_number": room.room_number,
            "room_name": room.room_type.name,
            "make_up_room": room.make_up_room,
            "updated_at": to_vn_str(room.updated_at),
        },
    }


@router.patch("/{room_number}/service")
def complete_make_up_room_endpoint(
    room_number: str,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles("RECEPTIONIST")),
):
    try:
        room = complete_make_up_room(db, room_number, actor=actor)
    except RoomNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": str(exc), "status": "error"},
        )

    return {
        "message": "Đã hoàn thành yêu cầu dọn phòng",
        "status": "success",
        "data": {
            "room_number": room.room_number,
            "room_name": room.room_type.name,
            "make_up_room": room.make_up_room,
            "updated_at": to_vn_str(room.updated_at),
        },
    }


@router.post("/{room_number}/devices/query")
def query_room_devices_endpoint(
    room_number: str,
    device_id: str | None = Query(default=None),
    device_type: str | None = Query(default=None),
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles("RECEPTIONIST")),
):
    try:
        get_room_by_number(db, room_number)
    except RoomNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"message": str(exc), "status": "error"},
        )

    mqtt_client.request_query_status(room_number=room_number, device_id=device_id, device_type=device_type)
    return {
        "message": f"Đã gửi yêu cầu truy vấn trạng thái thiết bị phòng {room_number} qua MQTT",
        "status": "success",
    }


@router.get("/{room_number}/devices")
def get_room_devices_endpoint(
    room_number: str,
    actor: User = Depends(require_roles("RECEPTIONIST")),
):
    data = mqtt_client.get_device_status(room_number)
    if data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "message": (
                    f"Chưa có dữ liệu trạng thái thiết bị nào cho phòng {room_number}. "
                    f"Gọi POST /api/rooms/{room_number}/devices/query trước."
                ),
                "status": "error",
            },
        )
    return {"message": "OK", "status": "success", "data": data}


@router.get("/{room_number}/service-status")
def get_room_service_status_endpoint(
    room_number: str,
    actor: User = Depends(require_roles("RECEPTIONIST")),
):
    """Đọc trạng thái DND/Make-up-room mà RCU thật đồng bộ ngược lại qua MQTT
    (topic SMARTHOTEL/STATUS/{hotelId}/ROOMSERVICE) — dùng để xác nhận RCU đã nhận
    và áp dụng lệnh ROOMSERVICECONTROL mà backend gửi đi.
    """
    data = mqtt_client.get_room_service_status(room_number)
    if data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "message": f"Chưa nhận được trạng thái DND/Make-up-room nào từ RCU cho phòng {room_number}.",
                "status": "error",
            },
        )
    return {"message": "OK", "status": "success", "data": data}
