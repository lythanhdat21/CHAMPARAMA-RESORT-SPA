from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.mqtt_client import mqtt_client
from app.core.timeutil import now_vn
from app.db.models import Room, RoomServiceLog, Stay, User

# sourceType theo protocol RCU ROOMSERVICECONTROL là device/hệ thống phát lệnh
# (vd "SPEAKER", "TV"...) — backend demo này đóng vai trò PMS khi phát lệnh DND/MUR
# tới RCU, nên dùng cố định "PMS" (vai trò thật của người gọi đã được ghi riêng vào
# room_service_logs qua actor.role).
_MQTT_SOURCE_TYPE = "PMS"


class RoomNotFoundError(Exception):
    pass


def get_room_by_number(db: Session, room_number: str) -> Room:
    room = db.scalar(select(Room).where(Room.room_number == room_number))
    if room is None:
        raise RoomNotFoundError(f"Không tìm thấy phòng room_number={room_number}")
    return room


def _current_stay_id(db: Session, room_id: int) -> int | None:
    stay = db.scalar(
        select(Stay)
        .where(Stay.room_id == room_id, Stay.status == "CHECKED_IN")
        .order_by(Stay.stay_id.desc())
    )
    return stay.stay_id if stay else None


def _log(
    db: Session,
    *,
    room_id: int,
    service: str,
    action: str,
    actor: User,
) -> None:
    log = RoomServiceLog(
        stay_id=_current_stay_id(db, room_id),
        room_id=room_id,
        service=service,
        action=action,
        requested_by=actor.id,
        requested_role=actor.role,
    )
    db.add(log)


def set_dnd(db: Session, room_number: str, *, turn_on: bool, actor: User) -> Room:
    room = get_room_by_number(db, room_number)
    room.do_not_disturb = turn_on
    room.updated_at = now_vn()
    _log(
        db,
        room_id=room.room_id,
        service="DO_NOT_DISTURB",
        action="ON" if turn_on else "OFF",
        actor=actor,
    )
    db.add(room)
    db.commit()
    db.refresh(room)

    mqtt_client.publish_room_service_control(
        room_number=room.room_number,
        service_id="dnd",
        value="1" if turn_on else "0",
        source_type=_MQTT_SOURCE_TYPE,
    )
    return room


def request_make_up_room(db: Session, room_number: str, *, actor: User) -> Room:
    room = get_room_by_number(db, room_number)
    room.make_up_room = True
    room.updated_at = now_vn()
    _log(db, room_id=room.room_id, service="MAKE_UP_ROOM", action="REQUEST", actor=actor)
    db.add(room)
    db.commit()
    db.refresh(room)

    mqtt_client.publish_room_service_control(
        room_number=room.room_number, service_id="mur", value="1", source_type=_MQTT_SOURCE_TYPE
    )
    return room


def complete_make_up_room(db: Session, room_number: str, *, actor: User) -> Room:
    room = get_room_by_number(db, room_number)
    room.make_up_room = False
    room.updated_at = now_vn()
    _log(db, room_id=room.room_id, service="MAKE_UP_ROOM", action="COMPLETE", actor=actor)
    db.add(room)
    db.commit()
    db.refresh(room)

    mqtt_client.publish_room_service_control(
        room_number=room.room_number, service_id="mur", value="0", source_type=_MQTT_SOURCE_TYPE
    )
    return room
