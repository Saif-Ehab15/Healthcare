import React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Home,
  LayoutDashboard,
  Stethoscope,
  Users,
  UserCog,
  Receipt,
  Layers,
  Building2,
  Hospital,
  LogOut,
  Currency,
  Timer,
} from "lucide-react";
import "./Navbar.css";
import { BsCurrencyPound, } from "react-icons/bs";

const NAV_ICON_SIZE = 18;

function Navbar() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.role;

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-logo">
          <Link to="/dashboard/admin" className="nav-logo-link">
            <Hospital size={22} aria-hidden="true" />
            Hospital Admin
          </Link>
        </div>

        <div className="nav-links">
          <Link to="/dashboard/admin" className="nav-link">
            <Home size={NAV_ICON_SIZE} aria-hidden="true" />
            Home
          </Link>
          <Link to="/dashboard/admin/dashboard" className="nav-link">
            <LayoutDashboard size={NAV_ICON_SIZE} aria-hidden="true" />
            Dashboard

          </Link>
          {role === "Admin" && (
            <Link to="/dashboard/admin/sub-admin" className="nav-link">
              <UserCog size={NAV_ICON_SIZE} aria-hidden="true" />
              Manage SubAdmin
            </Link>
          )}

          <Link to="/dashboard/admin/manage-doctors" className="nav-link">
            <Stethoscope size={NAV_ICON_SIZE} aria-hidden="true" />
            Manage Doctors
          </Link>

          <Link to="/dashboard/admin/manage-staff" className="nav-link">
            <Users size={NAV_ICON_SIZE} aria-hidden="true" />
            Manage Staff
          </Link>

          <Link to="/dashboard/admin/manage-shifts" className="nav-link">
            <Timer size={NAV_ICON_SIZE} aria-hidden="true" />
            Manage Shifts
          </Link>
          
          <Link to="/dashboard/admin/manage-departments" className="nav-link">
            <Layers size={NAV_ICON_SIZE} aria-hidden="true" />
            Manage Departments
          </Link>

          <Link to="/dashboard/admin/admin-all-rooms" className="nav-link">
            <Building2 size={NAV_ICON_SIZE} aria-hidden="true" />
            Manage Rooms
          </Link>

          <Link to="/dashboard/admin/manage_prices" className="nav-link">
            <BsCurrencyPound size={NAV_ICON_SIZE} aria-hidden="true" />
            Manage Prices
          </Link>

          <Link to="/dashboard/admin/patients_bills" className="nav-link">
            <Receipt size={NAV_ICON_SIZE} aria-hidden="true" />
            Manage Bills
          </Link>
          
        </div>

        <button className="logout-btn" onClick={() => navigate("/")}>
          <LogOut size={NAV_ICON_SIZE} aria-hidden="true" />
          <span className="logout-text">Logout</span>
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
