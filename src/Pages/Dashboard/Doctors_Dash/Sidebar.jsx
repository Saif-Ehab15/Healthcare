import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axiosInstance from "../../../Config/axios";
import "./Sidebar.css";

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
    { icon: "👨‍⚕️", label: "Profile", path: "/dashboard/doctor/profile" },
    // { icon: "📊", label: "Dashboard", path: "/dashboard/doctor" },
    { icon: "📝", label: "Reports", path: "/dashboard/doctor/reports" },
    { icon: "🏥", label: "Rooms", path: "/dashboard/doctor/appointments" },
    {
      icon: "📄",
      label: "AI Receipt Analysis",
      externalUrl: "http://127.0.0.1:5000",
    },
    {
      icon: "🔬",
      label: "AI Liver Disease Analysis",
      externalUrl: "http://127.0.0.1:8000",
    },
    {
      icon: "🔬",
      label: "Liver Histopathology AI diagnose",
      externalUrl: "http://127.0.0.1:8001",
    },
    { icon: "💬", label: "Chat", path: "/dashboard/doctor/chat" },
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-content">
        <div className="sidebar-header">
          <div className="clinic-brand">
            <div className="clinic-icon">🏥</div>
            <div className="clinic-text">
              <h3>SAFI</h3>
              <span>Healthcare System</span>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <ul className="nav-menu">
            {menuItems.map((item, index) => (
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
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <button className="nav-button logout-button" onClick={handleLogout}>
            <span className="nav-icon">🚪</span>
            <span className="nav-label">Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;