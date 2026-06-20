"""initial schema: users, room_types, rooms, reservations, stays, room_service_logs

Revision ID: 001
Revises:
Create Date: 2026-06-19

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Theo bảng số lượng phòng trong "BACKEND/SKILLS/FILES/Tên phòng và số phòng.jpg"
# (12 loại phòng, tổng 365 phòng). Ảnh không cho số phòng/tầng cụ thể, nên room_number
# và floor ở đây là quy ước tự đặt: mỗi tầng tối đa 10 phòng, room_number = "{floor}{vị
# trí trong tầng:02d}" (vd tầng 2 phòng thứ 1 -> "201"), các loại phòng được xếp tầng
# liên tiếp theo đúng thứ tự trong ảnh. Khi có sơ đồ tầng/số phòng thật (hoặc lấy được
# qua RCU Device List - SMARTHOTEL/STATUS/[hotelId]/RCU/DEVICELIST) cần thay lại seed
# này cho khớp thực tế.
ROOM_TYPE_DEFS = [
    {"code": "DISABLED", "name": "Disabled", "max_guests": 2, "count": 7},
    {"code": "PK", "name": "Premium King", "max_guests": 2, "count": 21},
    {"code": "PK2", "name": "Premium King 2", "max_guests": 2, "count": 21},
    {"code": "PT", "name": "Premium Twin", "max_guests": 2, "count": 21},
    {"code": "DT", "name": "Deluxe Twin", "max_guests": 2, "count": 120},
    {"code": "DT2", "name": "Deluxe Twin 2", "max_guests": 2, "count": 19},
    {"code": "DT3", "name": "Deluxe Twin 3", "max_guests": 2, "count": 63},
    {"code": "DK", "name": "Deluxe King", "max_guests": 2, "count": 12},
    {"code": "DK2", "name": "Deluxe King 2", "max_guests": 2, "count": 19},
    {"code": "JST", "name": "Junior Suite Twin", "max_guests": 4, "count": 21},
    {"code": "JSK", "name": "Junior Suite King", "max_guests": 4, "count": 20},
    {"code": "GS", "name": "Grand Suite", "max_guests": 4, "count": 21},
]

ROOM_TYPES_SEED = [
    {
        "id": index + 1,
        "code": room_type["code"],
        "name": room_type["name"],
        "max_guests": room_type["max_guests"],
        "description": None,
    }
    for index, room_type in enumerate(ROOM_TYPE_DEFS)
]

ROOMS_PER_FLOOR = 10


def _generate_rooms_seed() -> list[dict]:
    rooms: list[dict] = []
    floor = 1
    for index, room_type in enumerate(ROOM_TYPE_DEFS):
        room_type_id = index + 1
        remaining = room_type["count"]
        while remaining > 0:
            rooms_in_floor = min(ROOMS_PER_FLOOR, remaining)
            for position in range(1, rooms_in_floor + 1):
                rooms.append(
                    {
                        "room_number": f"{floor}{position:02d}",
                        "room_type_id": room_type_id,
                        "floor": floor,
                    }
                )
            remaining -= rooms_in_floor
            floor += 1
    return rooms


ROOMS_SEED = _generate_rooms_seed()


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("username", sa.String(255), nullable=False),
        sa.Column("gender", sa.String(10), nullable=False),
        sa.Column("phone_number", sa.String(32), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("avatar", sa.String(255), nullable=True),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("phone_number", name="uq_users_phone_number"),
        sa.UniqueConstraint("email", name="uq_users_email"),
    )

    op.create_table(
        "room_types",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("code", sa.String(20), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("max_guests", sa.Integer(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.UniqueConstraint("code", name="uq_room_types_code"),
    )

    op.create_table(
        "rooms",
        sa.Column("room_id", sa.Integer(), primary_key=True),
        sa.Column("room_number", sa.String(10), nullable=False),
        sa.Column("room_type_id", sa.Integer(), sa.ForeignKey("room_types.id"), nullable=False),
        sa.Column("floor", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default="Vacant"),
        sa.Column("do_not_disturb", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("make_up_room", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("room_number", name="uq_rooms_room_number"),
    )

    op.create_table(
        "reservations",
        sa.Column("reservation_id", sa.Integer(), primary_key=True),
        sa.Column("username", sa.String(255), nullable=False),
        sa.Column("gender", sa.String(10), nullable=False),
        sa.Column("phone_number", sa.String(32), nullable=False),
        sa.Column("number_of_guests", sa.Integer(), nullable=False),
        sa.Column("expected_departure_date", sa.Date(), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default="BOOKED"),
    )

    op.create_table(
        "stays",
        sa.Column("stay_id", sa.Integer(), primary_key=True),
        sa.Column(
            "reservation_id",
            sa.Integer(),
            sa.ForeignKey("reservations.reservation_id"),
            nullable=False,
        ),
        sa.Column("room_id", sa.Integer(), sa.ForeignKey("rooms.room_id"), nullable=False),
        sa.Column("username", sa.String(255), nullable=False),
        sa.Column("gender", sa.String(10), nullable=False),
        sa.Column("phone_number", sa.String(32), nullable=False),
        sa.Column("number_of_guests", sa.Integer(), nullable=False),
        sa.Column("expected_arrival_date", sa.Date(), nullable=False),
        sa.Column("expected_departure_date", sa.Date(), nullable=False),
        sa.Column("checked_in_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("checked_in_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("checked_out_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("checked_out_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("status", sa.String(32), nullable=False, server_default="CHECKED_IN"),
    )

    op.create_table(
        "room_service_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("stay_id", sa.Integer(), sa.ForeignKey("stays.stay_id"), nullable=True),
        sa.Column("room_id", sa.Integer(), sa.ForeignKey("rooms.room_id"), nullable=False),
        sa.Column("service", sa.String(32), nullable=False),
        sa.Column("action", sa.String(32), nullable=False),
        sa.Column("requested_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("requested_role", sa.String(20), nullable=False),
        sa.Column(
            "requested_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    room_types_table = sa.table(
        "room_types",
        sa.column("id", sa.Integer),
        sa.column("code", sa.String),
        sa.column("name", sa.String),
        sa.column("max_guests", sa.Integer),
        sa.column("description", sa.Text),
    )
    op.bulk_insert(room_types_table, ROOM_TYPES_SEED)

    rooms_table = sa.table(
        "rooms",
        sa.column("room_number", sa.String),
        sa.column("room_type_id", sa.Integer),
        sa.column("floor", sa.Integer),
    )
    op.bulk_insert(rooms_table, ROOMS_SEED)


def downgrade() -> None:
    op.drop_table("room_service_logs")
    op.drop_table("stays")
    op.drop_table("reservations")
    op.drop_table("rooms")
    op.drop_table("room_types")
    op.drop_table("users")
