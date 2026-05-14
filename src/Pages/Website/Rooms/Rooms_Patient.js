import React, { useState, useEffect } from "react";
import axiosInstance from "../../../Config/axios";
import "./ICU_Patient.css";
import Navbar from "../../../Components/Navbar/Navbar";

export default function RoomsPatient() {
    const [RoomsData, setRoomsData] = useState({
        heart: [],
        liver: [],
        kidney: [],
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchRoomsData = async () => {
            try {
                setLoading(true);
                const [heartRes, liverRes, kidneyRes] = await Promise.all([
                    axiosInstance.get("/api/Statistics/heart/rooms"),
                    axiosInstance.get("/api/Statistics/liver/rooms"),
                    axiosInstance.get("/api/Statistics/kidney/rooms"),
                ]);

                setRoomsData({
                    heart: heartRes.data,
                    liver: liverRes.data,
                    kidney: kidneyRes.data,
                });
            } catch (err) {
                console.error("Failed to fetch Rooms data:", err);
                setError("Failed to load Rooms statistics. Please try again later.");
            } finally {
                setLoading(false);
            }
        };
        fetchRoomsData();
    }, []);


    const calculateStats = (data) => {
        if (data && typeof data === 'object' && ('room' in data || 'Room' in data)) {
            const total = data.room || data.Room || 0;
            const reserved = data.reserved || data.Reserved || 0;
            return {
                total,
                reserved,
                available: Math.max(0, total - reserved)
            };
        }

        if (!Array.isArray(data)) return { total: 0, reserved: 0, available: 0 };

        const total = data.length;
        const reserved = data.filter((room) => room.isReserved || room.reserved).length;
        const available = total - reserved;

        return { total, reserved, available };
    };

    if (loading) {
        return <div className="Icu-center-message">Loading ICU Statistics...</div>;
    }

    if (error) {
        return <div className="Icu-center-message Icu-error-message">{error}</div>;
    }

    return (
        <>
            <Navbar />
            <div className="Icu-container">
                <h1 className="Icu-page-title">Standard Rooms Statistics</h1>

                <div className="Icu-grid">
                    <StatCard
                        title="Heart Rooms"
                        stats={calculateStats(RoomsData.heart)}
                        themeColor="#ff6b6b"
                    />
                    <StatCard
                        title="Liver Rooms"
                        stats={calculateStats(RoomsData.liver)}
                        themeColor="#ffd43b"
                    />
                    <StatCard
                        title="Kidney Rooms"
                        stats={calculateStats(RoomsData.kidney)}
                        themeColor="#51cf66"
                    />
                </div>
            </div>
        </>
    );
}

const StatCard = ({ title, stats, themeColor }) => {
    return (
        <div className="Icu-card">
            <h2
                className="Icu-card-title"
                style={{ borderBottomColor: themeColor }}
            >
                {title}
            </h2>

            <div className="Icu-stat-row">
                <span>Total Rooms:</span>
                <span className="Icu-total-value">{stats.total}</span>
            </div>

            <div className="Icu-stat-row">
                <span>Reserved:</span>
                <span className="Icu-reserved-value">{stats.reserved}</span>
            </div>

            <div className="Icu-stat-row">
                <span>Available:</span>
                <span className="Icu-available-value">{stats.available}</span>
            </div>

            <div className="Icu-bar-container">
                <div
                    className="Icu-bar-fill"
                    style={{
                        width: stats.total > 0 ? `${(stats.reserved / stats.total) * 100}%` : '0%',
                        backgroundColor: themeColor
                    }}
                />
            </div>
        </div>
    );
};