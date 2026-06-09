import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  User,
  ClipboardList,
  Building2,
  ScanLine,
  Activity,
  Microscope,
  MessageCircle,
  LogOut,
  Hospital,
} from "lucide-react";
import axiosInstance from "../../../Config/axios";
import "./Sidebar.css";

const SIDEBAR_ICON_SIZE = 20;

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [doctor, setDoctor] = useState({
    name: "",
    departmentName: ""
  });

  useEffect(() => {
    const fetchDoctor = async () => {
      try {
        const res = await axiosInstance.get("/api/Accounts/GetDoctors");
        setDoctor(res.data[0]);
      } catch (error) {
        console.error("Error fetching doctor:", error);
      }
    };

    fetchDoctor();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/Login");
  };

  const openExternalLink = (url) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const menuItems = [
    { Icon: User, label: "Profile", path: "/dashboard/doctor/profile" },
    { Icon: ClipboardList, label: "Reports", path: "/dashboard/doctor/reports" },
    { Icon: Building2, label: "Rooms", path: "/dashboard/doctor/appointments" },
    {
      Icon: ScanLine,
      label: "AI Receipt Analysis",
      externalUrl: "http://127.0.0.1:5000",
    },
    {
      Icon: Activity,
      label: "AI Liver Disease Analysis",
      externalUrl: "http://127.0.0.1:8000",
    },
    {
      Icon: Microscope,
      label: "Liver Histopathology AI diagnose",
      externalUrl: "http://127.0.0.1:8001",
    },
    { Icon: MessageCircle, label: "Chat", path: "/dashboard/doctor/chat" },
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-content">
        <div className="sidebar-header">
          <div className="clinic-brand">
            <div className="clinic-icon">
              <Hospital size={24} aria-hidden="true" />
            </div>
            <div className="clinic-text">
              <h3>SAFI</h3>
              <span>Healthcare System</span>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <ul className="nav-menu">
            {menuItems.map((item, index) => {
              const ItemIcon = item.Icon;
              return (
                <li key={index} className="nav-item">
                  <button
                    type="button"
                    className={`nav-button ${
                      item.path && location.pathname === item.path ? "active" : ""
                    }`}
                    onClick={() =>
                      item.externalUrl
                        ? openExternalLink(item.externalUrl)
                        : navigate(item.path)
                    }
                  >
                    <span className="nav-icon">
                      <ItemIcon size={SIDEBAR_ICON_SIZE} aria-hidden="true" />
                    </span>
                    <span className="nav-label">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <button className="nav-button logout-button" onClick={handleLogout}>
            <span className="nav-icon">
              <LogOut size={SIDEBAR_ICON_SIZE} aria-hidden="true" />
            </span>
            <span className="nav-label">Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
