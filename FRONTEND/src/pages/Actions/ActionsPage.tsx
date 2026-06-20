import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import CheckInCard from "./CheckInCard";
import CheckOutCard from "./CheckOutCard";
import DndCard from "./DndCard";
import MakeUpRoomCard from "./MakeUpRoomCard";

export default function ActionsPage() {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();

  if (!auth) {
    return null;
  }

  const isReceptionist = auth.role === "RECEPTIONIST";
  const isCustomer = auth.role === "CUSTOMER";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Xin chào, {auth.username}</h1>
            <p className="text-sm text-slate-500">Vai trò: {auth.role}</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            Đăng xuất
          </Button>
        </div>

        <p className="mb-4 text-sm text-slate-500">
          Mỗi nút sẽ gọi API tương ứng và in kết quả ra DevTools Console (F12 → tab Console).
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {isReceptionist && <CheckInCard />}
          {isReceptionist && <CheckOutCard />}
          {(isReceptionist || isCustomer) && <DndCard />}
          {isCustomer && <MakeUpRoomCard />}
        </div>
      </div>
    </div>
  );
}
