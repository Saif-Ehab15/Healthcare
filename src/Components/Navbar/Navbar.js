import React, { useState } from 'react';
import '../Navbar/Navbar.css';
import axiosInstance from '../../Config/axios';
import { Link, useNavigate } from 'react-router-dom';
import {
  Home,
  User,
  Stethoscope,
  Building2,
  Receipt,
  Brain,
  ScanLine,
  LogOut,
} from 'lucide-react';

const NAV_ICON_SIZE = 18;

const Navbar = () => {
  // State to manage the visibility of the mobile menu
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  // Function to toggle the menu's state
  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleLogout = async () => {
    try {
      await axiosInstance.post("/api/Accounts/LogOut");
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      navigate("/Login");
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">Safi</div>

      <button className="menu-toggle" onClick={toggleMenu} aria-label="Toggle navigation menu">
        <span className="bar"></span>
        <span className="bar"></span>
        <span className="bar"></span>
      </button>


      <div className={`navbar-links ${isOpen ? 'open' : ''}`}>
        <ul className="links-list">
          <li>
            <Link to="/home" className="nav-link-item" onClick={() => setIsOpen(false)}>
              <Home size={NAV_ICON_SIZE} aria-hidden="true" />
              Home
            </Link>
          </li>
          <li>
            <Link to="/profile" className="nav-link-item" onClick={() => setIsOpen(false)}>
              <User size={NAV_ICON_SIZE} aria-hidden="true" />
              Profile
            </Link>
          </li>
          <li>
            <Link to="/doctors" className="nav-link-item" onClick={() => setIsOpen(false)}>
              <Stethoscope size={NAV_ICON_SIZE} aria-hidden="true" />
              Doctors
            </Link>
          </li>
          <li>
            <Link to="/AllRooms" className="nav-link-item" onClick={() => setIsOpen(false)}>
              <Building2 size={NAV_ICON_SIZE} aria-hidden="true" />
              Rooms
            </Link>
          </li>
          <li>
            <Link to="/patient_bills" className="nav-link-item" onClick={() => setIsOpen(false)}>
              <Receipt size={NAV_ICON_SIZE} aria-hidden="true" />
              Bills
            </Link>
          </li>
          <li>
            <a
              href="http://127.0.0.1:5000"
              className="nav-link-item"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
            >
              <Brain size={NAV_ICON_SIZE} aria-hidden="true" />
              AI Disease Diagnosis
            </a>
          </li>
          <li>
            <a
              href="http://127.0.0.1:5001"
              className="nav-link-item"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
            >
              <ScanLine size={NAV_ICON_SIZE} aria-hidden="true" />
              AI Receipt Analysis
            </a>
          </li>
        </ul>

        <button className="Logout-button" onClick={handleLogout}>
          <LogOut size={NAV_ICON_SIZE} aria-hidden="true" />
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;