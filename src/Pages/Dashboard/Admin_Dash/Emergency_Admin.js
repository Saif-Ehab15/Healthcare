import React, { useState, useEffect } from "react";
import axiosInstance from "../../../Config/axios";
import "./AdminRooms.css";
import Navbar from "./Navbar";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { motion, AnimatePresence } from "framer-motion";
import { calculateRoomStats, isRoomOccupied } from "./adminRoomUtils";

export default function EmergencyAdmin() {
    const [emergencyData, setEmergencyData] = useState({
        heart: [],
        liver: [],
        kidney: [],
    });
    const [allEmergencies, setAllEmergencies] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentEntry, setCurrentEntry] = useState({
        id: "",
        roomNumber: "",
        departmentId: "",
        departmentName: "",
    });

    const fetchAllData = async () => {
        try {
            setLoading(true);

            // Fetch statistics
            const [heartRes, liverRes, kidneyRes, deptRes] = await Promise.all([
                axiosInstance.get("/api/Statistics/heart/emergencies"),
                axiosInstance.get("/api/Statistics/liver/emergencies"),
                axiosInstance.get("/api/Statistics/kidney/emergencies"),
                axiosInstance.get("/api/Department"),
            ]);

            setEmergencyData({
                heart: heartRes.data,
                liver: liverRes.data,
                kidney: kidneyRes.data,
            });

            const depts = Array.isArray(deptRes.data) ? deptRes.data : [];
            setDepartments(depts);

            // Fetch all Emergency entries for CRUD
            try {
                const allRes = await axiosInstance.get("/api/Emergency");
                setAllEmergencies(allRes.data);
            } catch (err) {
                console.warn("Direct /api/Emergency failed, falling back to merged stats", err);
                const merged = [
                    ...(Array.isArray(heartRes.data) ? heartRes.data : []),
                    ...(Array.isArray(liverRes.data) ? liverRes.data : []),
                    ...(Array.isArray(kidneyRes.data) ? kidneyRes.data : [])
                ];
                setAllEmergencies(merged);
            }

        } catch (err) {
            console.error("Failed to fetch Emergency data:", err);
            toast.error("Failed to load Emergency data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, []);

    const handleOpenModal = (entry = null) => {
        if (entry) {
            setIsEditing(true);
            setCurrentEntry({
                id: entry.id,
                roomNumber: entry.number || entry.roomNumber || "",
                departmentId: entry.departmentId || "",
                departmentName: entry.departmentName || "",
            });
        } else {
            setIsEditing(false);
            const defaultDept = departments.length > 0 ? departments[0] : { id: "", name: "" };
            setCurrentEntry({
                id: "",
                roomNumber: "",
                departmentId: defaultDept.id,
                departmentName: defaultDept.name,
            });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setCurrentEntry({ id: "", roomNumber: "", departmentId: "", departmentName: "" });
    };

    const handleSaveEntry = async (e) => {
        e.preventDefault();
        try {
            // Note: Backend expects Number (int) and DepartmentId (int)
            const payload = {
                number: parseInt(currentEntry.roomNumber),
                departmentId: parseInt(currentEntry.departmentId),
            };

            if (isEditing) {
                await axiosInstance.put(`/api/Emergency/${currentEntry.id}`, payload);
                toast.success("Emergency Entry updated successfully");
            } else {
                await axiosInstance.post("/api/Emergency", payload);
                toast.success("Emergency Entry added successfully");
            }
            handleCloseModal();
            fetchAllData();
        } catch (err) {
            console.error("Error saving emergency entry:", err);
            toast.error(err.response?.data?.message || "Failed to save emergency entry");
        }
    };

    const handleDeleteEntry = async (id) => {
        if (window.confirm("Are you sure you want to delete this emergency entry?")) {
            try {
                await axiosInstance.delete(`/api/Emergency/${id}`);
                toast.success("Emergency Entry deleted successfully");
                fetchAllData();
            } catch (err) {
                console.error("Error deleting entry:", err);
                toast.error("Failed to delete entry");
            }
        }
    };

    const statsTypes = [
        { key: 'heart', title: 'Heart Emergencies', class: 'heart' },
        { key: 'liver', title: 'Liver Emergencies', class: 'liver' },
        { key: 'kidney', title: 'Kidney Emergencies', class: 'kidney' },
    ];

    return (
        <div className="admin-rooms-container">
            <Navbar />
            <ToastContainer theme="dark" position="top-center" />

            <header className="admin-rooms-header">
                <motion.h1
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="admin-rooms-title"
                >
                    Manage Emergencies
                </motion.h1>
            </header>

            {loading ? (
                <div className="loading-container">
                    <span className="loader"></span>
                    <p>Fetching Emergency data...</p>
                </div>
            ) : (
                <>
                    <div className="stats-grid">
                        {statsTypes.map((type, idx) => {
                            const stats = calculateRoomStats(emergencyData[type.key]);
                            return (
                                <motion.div
                                    key={type.key}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className={`stat-card ${type.class}`}
                                >
                                    <h2 className="stat-card-title">{type.title}</h2>
                                    <div className="stat-info">
                                        <div className="stat-row">
                                            <span className="stat-label">Total Cases</span>
                                            <span className="stat-value">{stats.total}</span>
                                        </div>
                                        <div className="stat-row">
                                            <span className="stat-label">Occupied</span>
                                            <span className="stat-value">{stats.occupied}</span>
                                        </div>
                                        <div className="stat-row">
                                            <span className="stat-label">Available</span>
                                            <span className="stat-value">{stats.available}</span>
                                        </div>
                                    </div>
                                    <div className="progress-container">
                                        <div
                                            className="progress-bar"
                                            style={{
                                                width: stats.total > 0 ? `${(stats.occupied / stats.total) * 100}%` : '0%',
                                                backgroundColor: `var(--accent-${type.class})`
                                            }}
                                        />
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="management-section"
                    >
                        <div className="section-header">
                            <h2 className="section-title">Emergency Log</h2>
                            <button className="add-btn" onClick={() => handleOpenModal()}>
                                <span>➕</span> Add New Emergency Entry
                            </button>
                        </div>

                        <div className="table-responsive">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Case #</th>
                                        <th>Department</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allEmergencies.length > 0 ? (
                                        allEmergencies.map((entry, idx) => {
                                            const occupied = isRoomOccupied(entry);
                                            return (
                                            <tr key={entry.id || idx}>
                                                <td className="room-number-cell">#{entry.number || entry.roomNumber}</td>
                                                <td>
                                                    <span className={`dept-badge ${(entry.departmentName || "").toLowerCase()}`}>
                                                        {entry.departmentName}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="status-indicator">
                                                        <span className={`status-dot ${occupied ? 'reserved' : 'available'}`}></span>
                                                        {occupied ? 'Occupied' : 'Available'}
                                                    </div>
                                                </td>
                                                <td className="actions-cell">
                                                    <button className="action-btn edit" onClick={() => handleOpenModal(entry)}>✏️</button>
                                                    <button className="action-btn delete" onClick={() => handleDeleteEntry(entry.id)}>🗑</button>
                                                </td>
                                            </tr>
                                        );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="4" className="empty-state">No emergency entries found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                </>
            )}

            <AnimatePresence>
                {showModal && (
                    <div className="modal-overlay" onClick={handleCloseModal}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="modal-content"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="modal-header">
                                <h2 className="modal-title">{isEditing ? "Edit Emergency Case" : "Add New Emergency Entry"}</h2>
                            </div>
                            <form onSubmit={handleSaveEntry}>
                                <div className="form-group">
                                    <label className="form-label">Case/Room Number</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        required
                                        placeholder="e.g. E-101"
                                        value={currentEntry.roomNumber}
                                        onChange={(e) => setCurrentEntry({ ...currentEntry, roomNumber: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Department</label>
                                    <select
                                        className="form-select"
                                        value={currentEntry.departmentId}
                                        onChange={(e) => {
                                            const dept = departments.find(d => d.id === parseInt(e.target.value));
                                            setCurrentEntry({ ...currentEntry, departmentId: e.target.value, departmentName: dept ? dept.name : "" });
                                        }}
                                        required
                                    >
                                        <option value="" disabled>Select Department</option>
                                        {departments.map(dept => (
                                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                                        ))}
                                    </select>
                                </div>
                                {isEditing && (
                                    <p className="form-hint">
                                        Room status is set automatically when patients are assigned or released.
                                    </p>
                                )}
                                <div className="form-actions">
                                    <button type="submit" className="btn btn-primary">Save Changes</button>
                                    <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>Cancel</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}