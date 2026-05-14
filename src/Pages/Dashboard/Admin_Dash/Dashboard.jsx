import React, { useState, useEffect, useCallback } from "react";
import "./AdminDashboard.css";
import axiosInstance from "../../../Config/axios";
import { motion } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";

import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";

import { Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

// ---------------- API HELPER ----------------
// Added a wrapper to catch individual API errors so one failure doesn't kill the whole dashboard
const safeFetch = async (endpoint) => {
  try {
    const response = await axiosInstance.get(endpoint);
    return response.data;
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error.response || error.message);
    return null; // Return null so Promise.all still completes
  }
};

// ---------------- ANIMATION CONFIG ----------------
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Initializing with explicit defaults to prevent "undefined" errors during render
  const [totalStats, setTotalStats] = useState({
    totalDoctors: 0,
    totalPatients: 0,
    assignedDoctors: 0,
    unassignedDoctors: 0,
  });
  const [deptPatientCount, setDeptPatientCount] = useState([]);
  const [patientDistribution, setPatientDistribution] = useState({
    patientsInOneDepartment: 0,
    patientsInMultipleDepartments: 0,
  });
  const [roomsData, setRoomsData] = useState([]);
  const [roomsDoctorStats, setRoomsDoctorStats] = useState({
    roomsWithOneDoctor: 0,
    roomsWithMultipleDoctors: 0,
  });

  const loadAllData = useCallback(async () => {
    setLoading(true);
    setError(false);

    try {
      const [stats, departments, distribution, rooms, roomsDoctorStat] = 
        await Promise.all([
          safeFetch("/api/Statistics/general"),
          safeFetch("/api/Statistics/patients-per-department"),
          safeFetch("/api/Statistics/patient-distribution"),
          safeFetch("/api/Statistics/rooms-per-department"),
          safeFetch("/api/Statistics/shared-room-stats"),
        ]);

      // State updates with fallbacks
      if (stats) setTotalStats(stats);
      if (departments) setDeptPatientCount(Array.isArray(departments) ? departments : []);
      if (distribution) setPatientDistribution(distribution);
      if (rooms) setRoomsData(Array.isArray(rooms) ? rooms : []);
      if (roomsDoctorStat) setRoomsDoctorStats(roomsDoctorStat);

      // If all major requests returned null, consider it a global error
      if (!stats && !departments && !distribution) {
        throw new Error("Major data fetch failed");
      }

    } catch (err) {
      setError(true);
      toast.error("Could not sync with hospital database.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // ---------------- DATA PREPARATION ----------------
  const statsCards = [
    { title: "Total Doctors", value: totalStats.totalDoctors, icon: "🧑‍⚕️", color: "#2c7da0" },
    { title: "Total Patients", value: totalStats.totalPatients, icon: "🧑‍🤝‍🧑", color: "#2a9d8f" },
    { title: "Assigned Doctors", value: totalStats.assignedDoctors, icon: "📋", color: "#e9c46a" },
    { title: "Unassigned Doctors", value: totalStats.unassignedDoctors, icon: "⚠️", color: "#e76f51" },
  ];

  const barChartData = {
    labels: deptPatientCount.length > 0 ? deptPatientCount.map((d) => d?.departmentName) : ["No Data"],
    datasets: [{
      label: "Patients",
      data: deptPatientCount.map((d) => d?.patientCount || 0),
      backgroundColor: "#2c7da0",
      borderRadius: 6,
    }],
  };

  const doughnutChartData = {
    labels: ["Single Dept", "Multiple Depts"],
    datasets: [{
      data: [
        patientDistribution?.patientsInOneDepartment || 0,
        patientDistribution?.patientsInMultipleDepartments || 0,
      ],
      backgroundColor: ["#2c7da0", "#a2d2ff"],
      borderWidth: 0,
    }],
  };

  const roomsBarChartData = {
    labels: ["Doctor Allocation"],
    datasets: [
      {
        label: "One Doctor",
        data: [roomsDoctorStats?.roomsWithOneDoctor || 0],
        backgroundColor: "#2c7da0",
      },
      {
        label: "Multiple Doctors",
        data: [roomsDoctorStats?.roomsWithMultipleDoctors || 0],
        backgroundColor: "#f4a261",
      },
    ],
  };

  // ---------------- RENDERING ----------------
  if (loading) {
    return (
      <div className="dashboard-loading">
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          <h3>Syncing Hospital Records...</h3>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Toaster position="top-right" />

      <header className="dashboard-header">
        <motion.h1 initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
          Admin Dashboard
        </motion.h1>
        <p>Real-time Hospital Analytics</p>
      </header>

      {/* STATS GRID */}
      <motion.div 
        className="stats-grid"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {statsCards.map((card, i) => (
          <motion.div key={i} className="stat-card" variants={itemVariants} whileHover={{ y: -5 }}>
            <div className="stat-content">
              <span className="stat-title">{card.title}</span>
              <h2 className="stat-number">{card.value?.toLocaleString() || 0}</h2>
            </div>
            <div className="stat-icon-wrapper" style={{ backgroundColor: `${card.color}22` }}>
              {card.icon}
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* CHARTS SECTION */}
      <div className="charts-row">
        <div className="chart-card main-chart">
          <h3>Patient Volume by Department</h3>
          <Bar data={barChartData} options={{ responsive: true, maintainAspectRatio: false }} />
        </div>
        
        <div className="chart-card side-chart">
          <h3>Complexity Distribution</h3>
          <Doughnut data={doughnutChartData} options={{ cutout: '70%' }} />
        </div>

        <div className="chart-card side-chart">
          <h3>Room Utilization</h3>
          <Bar data={roomsBarChartData} options={{ indexAxis: 'y' }} />
        </div>
      </div>

      {/* ROOMS TABLE/GRID */}
      <div className="section-header">
        <h2>Infrastructure Overview</h2>
      </div>

      <motion.div 
        className="rooms-grid"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {roomsData.length > 0 ? (
          roomsData.map((room, i) => (
            <motion.div key={i} className="room-card" variants={itemVariants}>
              <h4>{room?.departmentName}</h4>
              <div className="room-details">
                <div className="room-tag">Total: <strong>{room?.roomCount}</strong></div>
                <div className="room-tag icu">ICU: <strong>{room?.icuCount}</strong></div>
                <div className="room-tag available">Available: <strong>{room?.availableRooms}</strong></div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="no-data">No room data available.</div>
        )}
      </motion.div>
    </div>
  );
};

export default AdminDashboard;