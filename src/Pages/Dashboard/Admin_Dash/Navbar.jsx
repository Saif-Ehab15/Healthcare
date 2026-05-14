import React from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Navbar.css";

function Navbar() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.role;

  return (
    <nav className="navbar">
      <div className="nav-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 2rem' }}>
        <div className="nav-logo">
          <Link to="/dashboard/admin" style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold', fontSize: '1.5rem' }}>
            🏥 Hospital Admin
          </Link>
        </div>

        <div className="nav-links" style={{ display: 'flex', gap: '15px' }}>
          <Link to="/dashboard/admin" className="nav-link">Home</Link>
          <Link to="/dashboard/admin/dashboard" className="nav-link">Dashboard</Link>
          <Link to="/dashboard/admin/manage-doctors" className="nav-link">Manage Doctors</Link>
          <Link to="/dashboard/admin/manage-staff" className="nav-link">Manage Staff</Link>
          <Link to="/dashboard/admin/manage-departments" className="nav-link">Manage Departments</Link>
          <Link to="/dashboard/admin/admin-all-rooms" className="nav-link">Manage Rooms</Link>
          {role === "Admin" && (
            <Link to="/dashboard/admin/sub-admin" className="nav-link">Manage SubAdmin</Link>
          )}
        </div>

        <button className="logout-btn" onClick={() => navigate("/")} style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid white' }}>
          Logout 🚪
        </button>
      </div>
    </nav>
  );
}

export default Navbar;