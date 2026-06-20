from fastapi import APIRouter, Depends, HTTPException, status

from app.core.mqtt_client import mqtt_client
from app.core.security import require_roles
from app.db.models import User

router = APIRouter(prefix="/api/devices", tags=["devices"])


@router.post("/refresh")
def refresh_device_list(actor: User = Depends(require_roles("RECEPTIONIST"))):
    mqtt_client.request_device_list()
    return {
        "message": "Đã gửi yêu cầu lấy danh sách thiết bị tới RCU qua MQTT",
        "status": "success",
    }


@router.get("")
def get_device_list(actor: User = Depends(require_roles("RECEPTIONIST"))):
    data = mqtt_client.get_device_list()
    if data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "message": "Chưa nhận được danh sách thiết bị nào từ RCU. Gọi POST /api/devices/refresh trước.",
                "status": "error",
            },
        )
    return {"message": "OK", "status": "success", "data": data}
