import React, { useState } from 'react';
import '../Navbar/Navbar.css';
import axiosInstance from '../../Config/axios';
import { Link, useNavigate } from 'react-router-dom';

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
          <li><Link to="/home">Home</Link></li>
          <li><Link to="/profile">profile</Link></li>
          <li><Link to="/AllRooms">Rooms</Link></li>
          <li><Link to="/doctors">doctors</Link></li>

        </ul>

        <button className="Logout-button" onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  );
};

export default Navbar;