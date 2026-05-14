import React, { useState, useEffect, useRef } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import axiosInstance from '../../../Config/axios';
import './ICU.css';

export default function ICU() {
    const [rooms, setRooms] = useState([]);
    const connectionRef = useRef(null);
    const [isConnected, setIsConnected] = useState(false);
    const [loading, setLoading] = useState(true);

    // Initial fetch from the /api/ICU endpoint
    useEffect(() => {
        const fetchICURooms = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await axiosInstance.get('/api/ICU', {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

                // Assuming the API returns available rooms initially
                const initialRooms = response.data.map(room => ({
                    ...room,
                    status: 'Available' // Defaulting to available since it's the ICU available list
                }));
                setRooms(initialRooms);
            } catch (error) {
                console.error('Error fetching ICU rooms:', error);
                toast.error('Failed to load ICU rooms');
            } finally {
                setLoading(false);
            }
        };

        fetchICURooms();
    }, []);

    // Set up SignalR Connection for Real-time Updates
    useEffect(() => {
        const connectSignalR = async () => {
            try {
                const newConnection = new HubConnectionBuilder()
                    .withUrl("https://localhost:7250/appointmentHub")
                    .configureLogging(LogLevel.Information)
                    .withAutomaticReconnect()
                    .build();

                // Listen for room status changes
                newConnection.on("RoomStatusChanged", (data) => {
                    console.log(`Room ${data.roomNumber} status changed to ${data.status}`);

                    setRooms(prevRooms => {
                        // Check if room exists in our state
                        const roomExists = prevRooms.some(r => r.id === data.roomId);

                        if (roomExists) {
                            return prevRooms.map(room =>
                                room.id === data.roomId
                                    ? { ...room, status: data.status }
                                    : room
                            );
                        } else {
                            // If it's a new room being broadcasted and it's an ICU, we might want to fetch again or add it
                            // For now, we only update existing ones. We can fetch full list if needed:
                            return prevRooms;
                        }
                    });
                });

                await newConnection.start();
                console.log('Connected to SignalR AppointmentHub');
                setIsConnected(true);
                connectionRef.current = newConnection;
            } catch (err) {
                console.error("SignalR Connection Error: ", err);
                toast.error("Real-time connection failed. Falling back to refresh.");
            }
        };

        connectSignalR();

        // Cleanup on unmount
        return () => {
            if (connectionRef.current) {
                connectionRef.current.stop();
                connectionRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (loading) {
        return (
            <div className="icu-container">
                <div className="icu-loading">Loading ICU Rooms...</div>
            </div>
        );
    }

    return (
        <div className="icu-container">
            <ToastContainer position="top-right" autoClose={3000} stacked />

            <div className="icu-header">
                <h2>ICU Monitoring Dashboard</h2>
                <div className={`connection-status ${isConnected ? 'online' : 'offline'}`}>
                    <span className="status-dot"></span>
                    {isConnected ? 'LIVE' : 'OFFLINE'}
                </div>
            </div>

            <p className="icu-subtitle">Real-time status of Intensive Care Unit capacity</p>

            {rooms.length === 0 ? (
                <div className="no-rooms-msg">No ICU rooms found.</div>
            ) : (
                <div className="icu-room-grid">
                    {rooms.map((room) => (
                        <div
                            key={room.id}
                            className={`icu-room-card ${room.status?.toLowerCase() === 'busy' ? 'busy' : 'available'}`}
                        >
                            <div className="room-header">
                                <span className="room-type">ICU</span>
                                <span className="room-number">#{room.number}</span>
                            </div>

                            <div className="room-body">
                                <p className="room-dept">
                                    <i className="dept-icon">🏥</i>
                                    {room.departmentName || 'General ICU'}
                                </p>
                            </div>

                            <div className="room-footer">
                                <div className={`status-badge ${room.status?.toLowerCase() === 'busy' ? 'badge-busy' : 'badge-available'}`}>
                                    {room.status?.toLowerCase() === 'busy' ? '⛔ Occupied' : '✅ Available'}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
