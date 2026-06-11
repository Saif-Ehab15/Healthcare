import { Link, useNavigate } from "react-router-dom";
import {
  User,
  CalendarCheck,
  LogOut,
  Receipt,
} from "lucide-react";
import "../Nurse_Dash/Nurse.css";

const SIDEBAR_ICON_SIZE = 20;

export default function Staffsidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/Login");
  };

  return (
    <div className="Nursesidebar">
      <div className="sidebar-header">
        <h3>Staff Panel</h3>
      </div>

      <ul className="Nursesidebar-menu">
        <li>
          <Link to="/dashboard/staff" className="menu-item">
            <span className="menu-icon">
              <User size={SIDEBAR_ICON_SIZE} aria-hidden="true" />
            </span>
            <span className="menu-text">Staff profile</span>
          </Link>
        </li>
          <li>
            <Link to="/dashboard/staff/attendance" className="menu-item">
              <span className="menu-icon">
                <CalendarCheck size={SIDEBAR_ICON_SIZE} aria-hidden="true" />
              </span>
              <span className="menu-text">Attendance</span>
            </Link>
          </li>
          <li>
            <Link to="/dashboard/staff/staff_manage_bills" className="menu-item">
              <span className="menu-icon">
                 <Receipt size={SIDEBAR_ICON_SIZE} aria-hidden="true" />
              </span>
              <span className="menu-text">Manage Bills</span>
            </Link>
          </li>
        <li>
          <button type="button" className="menu-item" onClick={handleLogout}>
            <span className="menu-icon">
              <LogOut size={SIDEBAR_ICON_SIZE} aria-hidden="true" />
            </span>
            <span className="menu-text">Logout</span>
          </button>
        </li>
      </ul>
    </div>
  );
}
