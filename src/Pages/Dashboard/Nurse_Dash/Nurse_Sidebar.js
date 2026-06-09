import { Link, useNavigate } from "react-router-dom";
import {
  UserRound,
  HeartPulse,
  ClipboardList,
  LogOut,
} from "lucide-react";
import "./Nurse.css";

const SIDEBAR_ICON_SIZE = 20;

export default function Nursesidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/Login");
  };

  return (
    <div className="Nursesidebar">
      <div className="sidebar-header">
        <h3>Nurse Panel</h3>
      </div>

      <ul className="Nursesidebar-menu">
        <li>
          <Link to="/dashboard/nurse" className="menu-item">
            <span className="menu-icon">
              <UserRound size={SIDEBAR_ICON_SIZE} aria-hidden="true" />
            </span>
            <span className="menu-text">Nurse profile</span>
          </Link>
        </li>
        <li>
          <Link to="/dashboard/nurse/ICUmonitor" className="menu-item">
            <span className="menu-icon">
              <HeartPulse size={SIDEBAR_ICON_SIZE} aria-hidden="true" />
            </span>
            <span className="menu-text">ICU monitoring</span>
          </Link>
        </li>
        <li>
          <Link to="/dashboard/nurse/Nurse_reports" className="menu-item">
            <span className="menu-icon">
              <ClipboardList size={SIDEBAR_ICON_SIZE} aria-hidden="true" />
            </span>
            <span className="menu-text">Reports</span>
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
