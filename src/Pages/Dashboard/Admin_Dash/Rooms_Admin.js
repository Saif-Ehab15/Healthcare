import React, { useState, useEffect } from "react";
import axiosInstance from "../../../Config/axios";
import "./AdminRooms.css";
import Navbar from "./Navbar";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { motion, AnimatePresence } from "framer-motion";
import { calculateRoomStats, isRoomOccupied } from "./adminRoomUtils";

export default function RoomsAdmin() {
    const [roomsData, setRoomsData] = useState({
        heart: [],
        liver: [],
        kidney: [],
    });
    const [allRooms, setAllRooms] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentRoom, setCurrentRoom] = useState({
        id: "",
        roomNumber: "",
        departmentId: "",
        departmentName: "",
    });

    const fetchAllData = async () => {
        try {
            setLoading(true);

            // Fetch statistics, all rooms, and departments
            const [heartRes, liverRes, kidneyRes, deptRes] = await Promise.all([
                axiosInstance.get("/api/Statistics/heart/rooms"),
                axiosInstance.get("/api/Statistics/liver/rooms"),
                axiosInstance.get("/api/Statistics/kidney/rooms"),
                axiosInstance.get("/api/Department"),
            ]);

            setRoomsData({
                heart: heartRes.data,
                liver: liverRes.data,
                kidney: kidneyRes.data,
            });

            const depts = Array.isArray(deptRes.data) ? deptRes.data : [];
            setDepartments(depts);

            try {
                const allRes = await axiosInstance.get("/api/Room");
                setAllRooms(allRes.data);
            } catch (err) {
                console.warn("Direct /api/Room failed, falling back to merged stats", err);
                const merged = [
                    ...(Array.isArray(heartRes.data) ? heartRes.data : []),
                    ...(Array.isArray(liverRes.data) ? liverRes.data : []),
                    ...(Array.isArray(kidneyRes.data) ? kidneyRes.data : [])
                ];
                setAllRooms(merged);
            }

        } catch (err) {
            console.error("Failed to fetch Rooms data:", err);
            toast.error("Failed to load Rooms data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, []);

    const handleOpenModal = (room = null) => {
        if (room) {
            setIsEditing(true);
            setCurrentRoom({
                id: room.id,
                roomNumber: room.number || room.roomNumber || "",
                departmentId: room.departmentId || "",
                departmentName: room.departmentName || "",
            });
        } else {
            setIsEditing(false);
            const defaultDept = departments.length > 0 ? departments[0] : { id: "", name: "" };
            setCurrentRoom({
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
        setCurrentRoom({ id: "", roomNumber: "", departmentId: "", departmentName: "" });
    };

    const handleSaveRoom = async (e) => {
        e.preventDefault();
        try {
            // Note: UpdateRoomDto expects Number (int) and DepartmentId (int)
            const payload = {
                number: parseInt(currentRoom.roomNumber),
                departmentId: parseInt(currentRoom.departmentId),
            };

            if (isEditing) {
                await axiosInstance.put(`/api/Room/${currentRoom.id}`, payload);
                toast.success("Room updated successfully");
            } else {
                await axiosInstance.post("/api/Room", payload);
                toast.success("Room added successfully");
            }
            handleCloseModal();
            fetchAllData();
        } catch (err) {
            console.error("Error saving room:", err);
            toast.error(err.response?.data?.message || "Failed to save room");
        }
    };

    const handleDeleteRoom = async (id) => {
        if (window.confirm("Are you sure you want to delete this room?")) {
            try {
                await axiosInstance.delete(`/api/Room/${id}`);
                toast.success("Room deleted successfully");
                fetchAllData();
            } catch (err) {
                console.error("Error deleting room:", err);
                toast.error("Failed to delete room");
            }
        }
    };

    const statsTypes = [
        { key: 'heart', title: 'Heart Rooms', class: 'heart' },
        { key: 'liver', title: 'Liver Rooms', class: 'liver' },
        { key: 'kidney', title: 'Kidney Rooms', class: 'kidney' },
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
                    Manage Standard Rooms
                </motion.h1>
            </header>

            {loading ? (
                <div className="loading-container">
                    <span className="loader"></span>
                    <p>Fetching Rooms data...</p>
                </div>
            ) : (
                <>
                    <div className="stats-grid">
                        {statsTypes.map((type, idx) => {
                            const stats = calculateRoomStats(roomsData[type.key]);
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
                                            <span className="stat-label">Total Rooms</span>
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
                            <h2 className="section-title">Room Inventory</h2>
                            <button className="add-btn" onClick={() => handleOpenModal()}>
                                <span>➕</span> Add New Room
                            </button>
                        </div>

                        <div className="table-responsive">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Number</th>
                                        <th>Department</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allRooms.length > 0 ? (
                                        allRooms.map((room, idx) => {
                                            const occupied = isRoomOccupied(room);
                                            return (
                                            <tr key={room.id || idx}>
                                                <td className="room-number-cell">#{room.number || room.roomNumber}</td>
                                                <td>
                                                    <span className={`dept-badge ${(room.departmentName || "").toLowerCase()}`}>
                                                        {room.departmentName}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="status-indicator">
                                                        <span className={`status-dot ${occupied ? 'reserved' : 'available'}`}></span>
                                                        {occupied ? 'Occupied' : 'Available'}
                                                    </div>
                                                </td>
                                                <td className="actions-cell">
                                                    <button className="action-btn edit" onClick={() => handleOpenModal(room)}>✏️</button>
                                                    <button className="action-btn delete" onClick={() => handleDeleteRoom(room.id)}>🗑</button>
                                                </td>
                                            </tr>
                                        );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="4" className="empty-state">No rooms found in inventory.</td>
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
                                <h2 className="modal-title">{isEditing ? "Edit Room" : "Add New Room"}</h2>
                            </div>
                            <form onSubmit={handleSaveRoom}>
                                <div className="form-group">
                                    <label className="form-label">Room Number</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        required
                                        placeholder="e.g. 101"
                                        value={currentRoom.roomNumber}
                                        onChange={(e) => setCurrentRoom({ ...currentRoom, roomNumber: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Department</label>
                                    <select
                                        className="form-select"
                                        value={currentRoom.departmentId}
                                        onChange={(e) => {
                                            const dept = departments.find(d => d.id === parseInt(e.target.value));
                                            setCurrentRoom({ ...currentRoom, departmentId: e.target.value, departmentName: dept ? dept.name : "" });
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