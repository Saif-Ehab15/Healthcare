import React, { useEffect, useMemo, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";
import { useParams } from "react-router-dom";
import Navbar from "../../../Components/Navbar/Navbar";
import axiosInstance from "../../../Config/axios";
import "./doctorReservation.css";

const formatTime = (value) => {
  try {
    return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return value;
  }
};

const DoctorReservation = () => {
  const { id: doctorId } = useParams();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [slots, setSlots] = useState([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const connectionRef = useRef(null);
  const patientIdRef = useRef("");

  const hubUrl = useMemo(() => {
    const apiBase = axiosInstance.defaults.baseURL || window.location.origin;
    return `${apiBase.replace(/\/$/, "")}/reservationHub`;
  }, []);

  const normalizeSlots = (incoming) => {
    if (!Array.isArray(incoming)) return [];
    return incoming.map((slot, index) => ({
      id: slot.id ?? slot.availableTimeId ?? index,
      time: slot.time ?? slot.availableTime ?? slot.startTime ?? slot.dateTime ?? "",
      status: slot.status ?? (slot.isReserved ? "Reserved" : "Available"),
      patientId: slot.patientId ?? slot.reservedByPatientId ?? "",
    }));
  };

  const availableSlots = slots.filter(
    (slot) => String(slot.status || "").toLowerCase() !== "reserved"
  );

  const connect = async () => {
    if (connectionRef.current?.state === "Connected") return true;
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, { withCredentials: true })
      .withAutomaticReconnect()
      .build();

    connection.on("ReceiveSlots", (receivedSlots) => {
      setSlots(normalizeSlots(receivedSlots));
      setLoading(false);
    });

    connection.on("ReservationResult", (result) => {
      if (result?.success) {
        setSlots((prev) =>
          prev.map((slot) =>
            String(slot.id) === String(result.reservationId)
              ? { ...slot, status: "Reserved", patientId: patientIdRef.current }
              : slot
          )
        );
      } else if (result?.message) {
        setError(result.message);
      } else {
        setError("Reservation failed.");
      }
      setLoading(false);
    });

    connection.on("SlotReserved", (data) => {
      setSlots((prev) =>
        prev.map((slot) =>
          String(slot.id) === String(data.reservationId)
            ? { ...slot, status: "Reserved", patientId: String(data.patientId ?? "") }
            : slot
        )
      );
    });

    try {
      await connection.start();
      connectionRef.current = connection;
      setConnected(true);
      setError("");
      return true;
    } catch (err) {
      setConnected(false);
      setError("Failed to connect realtime channel.");
      return false;
    }
  };

  const loadSlots = async (dayValue) => {
    if (!doctorId || !dayValue) return;
    const ok = await connect();
    if (!ok || !connectionRef.current) return;

    setLoading(true);
    setError("");
    try {
      await connectionRef.current.invoke("JoinDoctorDayGroup", doctorId, dayValue);
      await connectionRef.current.invoke("GetAvailableSlots", doctorId, dayValue);
    } catch {
      setLoading(false);
      setError("Failed to load slots.");
    }
  };

  const reserveSlot = async (slotId) => {
    if (!patientIdRef.current) {
      setError("User not found. Please login again.");
      return;
    }
    const ok = await connect();
    if (!ok || !connectionRef.current) {
      setError("Realtime connection not ready.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await connectionRef.current.invoke("ReserveSlot", slotId, patientIdRef.current);
    } catch {
      setLoading(false);
      setError("Failed to reserve this slot.");
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        patientIdRef.current = String(user?.id || "");
      } catch {
        patientIdRef.current = "";
      }
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    loadSlots(selectedDate);
  }, [doctorId, selectedDate]);

  useEffect(() => {
    return () => {
      if (connectionRef.current) {
        connectionRef.current.stop();
      }
    };
  }, []);

  return (
    <>
      <Navbar />
      <div className="reservation-page">
        <div className="reservation-container">
          <div className="reservation-card">
            <h2>Available Slots</h2>

            <div className="reservation-form-row">
              <div className="reservation-form-group" style={{ marginBottom: "20px" , marginRight: "30px"}}>
                <label>Select Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
            </div>

            {error && <p className="reservation-error">{error}</p>}
            {!connected && !loading && <p className="muted">Connecting realtime...</p>}

            <div className="slots-grid">
              {loading ? (
                <p className="muted">Loading available times...</p>
              ) : availableSlots.length === 0 ? (
                <p className="muted">No available slots for this date.</p>
              ) : (
                availableSlots.map((slot) => (
                  <div
                    key={slot.id}
                    className="slot"
                    onClick={() => reserveSlot(slot.id)}
                  >
                    <div className="slot-time">{formatTime(slot.time)}</div>
                    <div className="slot-status">Available</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DoctorReservation;