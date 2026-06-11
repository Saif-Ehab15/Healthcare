import React, { useEffect, useMemo, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";
import axiosInstance from "../../../Config/axios";
import { toast } from "react-toastify";
import {
  DEFAULT_DEPARTMENTS,
  ROOM_TYPES,
  buildReleaseReportDto,
  getHubUrl,
  getLoggedInUser,
  getLoggedInUserId,
  hubSuccess,
  hubValue,
  toArray,
} from "./appointmentShared";

export default function ReleaseRoomSection() {
  const connectionRef = useRef(null);
  const activeGroupRef = useRef(null);
  const selectedRoomRef = useRef(null);

  const [connected, setConnected] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [selectedRoomType, setSelectedRoomType] = useState("");

  const [rooms, setRooms] = useState([]);
  const [activeAppointments, setActiveAppointments] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);

  const [report, setReport] = useState("");
  const [medicineInput, setMedicineInput] = useState("");
  const [medicines, setMedicines] = useState([]);

  const [loadingState, setLoadingState] = useState({
    rooms: false,
    appointments: false,
    releasing: false,
  });

  const hubUrl = useMemo(() => getHubUrl(axiosInstance), []);

  const selectedRoomTypeObj = useMemo(
    () => ROOM_TYPES.find((item) => item.value === selectedRoomType) || null,
    [selectedRoomType]
  );

  const loadActiveAppointments = async () => {
    setLoadingState((prev) => ({ ...prev, appointments: true }));
    try {
      const res = await axiosInstance.get("/api/AppointmentToRoom");
      const list = toArray(res.data);
      const active = list.filter((app) => !app.endTime && !app.EndTime);
      setActiveAppointments(active);
    } catch (err) {
      console.error("Failed to load appointments", err);
      toast.error("Failed to load active appointments.");
    } finally {
      setLoadingState((prev) => ({ ...prev, appointments: false }));
    }
  };

  const safeInvoke = async (method, ...args) => {
    if (!connectionRef.current || connectionRef.current.state !== signalR.HubConnectionState.Connected) {
      toast.error("Realtime connection is not ready.");
      return false;
    }
    try {
      await connectionRef.current.invoke(method, ...args);
      return true;
    } catch (err) {
      toast.error(err?.message || "Realtime request failed.");
      return false;
    }
  };

  const setupConnection = async () => {
    if (connectionRef.current?.state === signalR.HubConnectionState.Connected) return;
    try {
      const connection = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl, { withCredentials: true })
        .withAutomaticReconnect()
        .build();

      connection.on("RoomStatusChanged", () => {
        loadActiveAppointments();
      });

      connection.on("ReleaseRoomResult", (data) => {
        setLoadingState((prev) => ({ ...prev, releasing: false }));
        if (!hubSuccess(data)) {
          toast.error(hubValue(data, "message") || "Failed to release room.");
          return;
        }
        toast.success(hubValue(data, "message") || "Room released successfully!");
        setSelectedRoom(null);
        selectedRoomRef.current = null;
        setReport("");
        setMedicines([]);
        loadActiveAppointments();
      });

      connection.on("AppointmentFinished", (data) => {
        const roomId = Number(hubValue(data, "roomId"));
        loadActiveAppointments();

        if (selectedRoomRef.current?.id === roomId) {
          toast.info(
            `Room ${hubValue(data, "roomNumber") || roomId} has been released and appointment finished.`
          );
          setSelectedRoom(null);
          selectedRoomRef.current = null;
          setReport("");
          setMedicines([]);
        }
      });

      await connection.start();
      connectionRef.current = connection;
      setConnected(true);
    } catch (err) {
      setConnected(false);
      toast.error("Failed to establish realtime connection.");
    }
  };

  const loadRooms = async (departmentId, roomTypeObj) => {
    if (!departmentId || !roomTypeObj) return;

    setLoadingState((prev) => ({ ...prev, rooms: true }));
    try {
      const res = await axiosInstance.get(`${roomTypeObj.endpoint}/${departmentId}`);
      const rawRooms = toArray(res.data);

      setRooms(
        rawRooms.map((r) => ({
          id: Number(r.id ?? r.Id),
          number: r.number ?? r.Number,
          departmentId: r.departmentId ?? r.DepartmentId,
        }))
      );
    } catch {
      toast.error("Failed to fetch rooms.");
      setRooms([]);
    } finally {
      setLoadingState((prev) => ({ ...prev, rooms: false }));
    }
  };

  const joinGroup = async (departmentId, roomTypeObj) => {
    if (!connected || !departmentId || !roomTypeObj) return;

    if (activeGroupRef.current) {
      await safeInvoke(
        "LeaveDepartmentRoomGroup",
        activeGroupRef.current.departmentId,
        activeGroupRef.current.roomType
      );
    }

    const joinOk = await safeInvoke(
      "JoinDepartmentRoomGroup",
      Number(departmentId),
      roomTypeObj.backendValue
    );
    if (joinOk) {
      activeGroupRef.current = {
        departmentId: Number(departmentId),
        roomType: roomTypeObj.backendValue,
      };
    }
  };

  const handleRoomClick = (room) => {
    setSelectedRoom(room);
    selectedRoomRef.current = room;
    setReport("");
    setMedicines([]);
  };

  const addMedicine = (e) => {
    e.preventDefault();
    const med = medicineInput.trim();
    if (med && !medicines.includes(med)) {
      setMedicines([...medicines, med]);
      setMedicineInput("");
    }
  };

  const removeMedicine = (index) => {
    setMedicines(medicines.filter((_, i) => i !== index));
  };

  const roomsWithStatus = useMemo(() => {
    return rooms.map((room) => {
      const hasActive = activeAppointments.some(
        (app) =>
          Number(app.roomId ?? app.RoomId) === room.id &&
          String(app.roomType ?? app.RoomType ?? selectedRoomTypeObj?.backendValue) ===
            selectedRoomTypeObj?.backendValue
      );
      return {
        ...room,
        status: hasActive ? "Busy" : "Available",
      };
    });
  }, [rooms, activeAppointments, selectedRoomTypeObj]);

  const activeAppointmentForSelectedRoom = useMemo(() => {
    if (!selectedRoom || !selectedRoomTypeObj) return null;
    return (
      activeAppointments.find(
        (app) =>
          Number(app.roomId ?? app.RoomId) === selectedRoom.id &&
          String(app.roomType ?? app.RoomType ?? selectedRoomTypeObj.backendValue) ===
            selectedRoomTypeObj.backendValue
      ) || null
    );
  }, [selectedRoom, activeAppointments, selectedRoomTypeObj]);

  const selectedRoomWithStatus = useMemo(() => {
    if (!selectedRoom) return null;
    return roomsWithStatus.find((r) => r.id === selectedRoom.id) || null;
  }, [selectedRoom, roomsWithStatus]);

  const isUserPrimaryDoctor = useMemo(() => {
    if (!activeAppointmentForSelectedRoom || !currentUser) return true;
    const currentUserId = getLoggedInUserId();
    const doctorId = String(
      activeAppointmentForSelectedRoom.doctorId ??
        activeAppointmentForSelectedRoom.DoctorId ??
        ""
    );
    return currentUserId === doctorId;
  }, [activeAppointmentForSelectedRoom, currentUser]);

  const handleRelease = async () => {
    if (!selectedRoom || !selectedRoomTypeObj) return;

    if (activeAppointmentForSelectedRoom && !isUserPrimaryDoctor) {
      toast.error("Only the assigned doctor can release this room.");
      return;
    }

    const doctorId = String(
      activeAppointmentForSelectedRoom?.doctorId ??
        activeAppointmentForSelectedRoom?.DoctorId ??
        getLoggedInUserId()
    );

    if (!doctorId) {
      toast.error("Doctor identity is missing. Please login again.");
      return;
    }

    setLoadingState((prev) => ({ ...prev, releasing: true }));

    const reportDto = buildReleaseReportDto({
      appointmentId:
        activeAppointmentForSelectedRoom?.id ?? activeAppointmentForSelectedRoom?.Id ?? 0,
      report: report.trim() || "Released from UI",
      medicines,
      createdBy: getLoggedInUserId(),
    });

    const ok = await safeInvoke(
      "ReleaseRoom",
      doctorId,
      Number(selectedRoom.id),
      selectedRoomTypeObj.backendValue,
      reportDto
    );
    if (!ok) {
      setLoadingState((prev) => ({ ...prev, releasing: false }));
    }
  };

  useEffect(() => {
    setCurrentUser(getLoggedInUser());
    setupConnection();
    loadActiveAppointments();
    return () => {
      if (connectionRef.current) {
        connectionRef.current.stop();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedDepartment?.id && selectedRoomTypeObj && connected) {
      loadRooms(selectedDepartment.id, selectedRoomTypeObj);
      joinGroup(selectedDepartment.id, selectedRoomTypeObj);
    }
    setSelectedRoom(null);
    selectedRoomRef.current = null;
    setReport("");
    setMedicines([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDepartment, selectedRoomType, connected]);

  return (
    <div className="release-section">
      <div className="release-grid">
        <div className="release-left">
          <section className="appointment-card selection-card">
            <h2>Room Category</h2>
            <div className="release-selection-fields">
              <div className="appointment-field">
                <label>Department</label>
                <select
                  value={selectedDepartment?.id || ""}
                  onChange={(e) => {
                    const dept =
                      DEFAULT_DEPARTMENTS.find((item) => String(item.id) === e.target.value) ||
                      null;
                    setSelectedDepartment(dept);
                  }}
                >
                  <option value="">Select Department</option>
                  {DEFAULT_DEPARTMENTS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="appointment-field">
                <label>Room Type</label>
                <select
                  value={selectedRoomType}
                  onChange={(e) => setSelectedRoomType(e.target.value)}
                >
                  <option value="">Select Type</option>
                  {ROOM_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="appointment-card rooms-card">
            <h2>Rooms in Department</h2>
            {loadingState.rooms ? (
              <div className="loading-pill">Loading rooms...</div>
            ) : !selectedDepartment || !selectedRoomType ? (
              <p className="appointment-muted">Please select department and room type first.</p>
            ) : roomsWithStatus.length === 0 ? (
              <p className="appointment-muted">No rooms found in this category.</p>
            ) : (
              <div className="release-rooms-grid">
                {roomsWithStatus.map((room) => {
                  const isOccupied = room.status === "Busy";
                  const isSelected = selectedRoom?.id === room.id;
                  return (
                    <button
                      type="button"
                      key={room.id}
                      className={`release-room-block ${isOccupied ? "occupied" : "available"} ${
                        isSelected ? "selected" : ""
                      }`}
                      onClick={() => handleRoomClick(room)}
                    >
                      <div className="release-room-num">#{room.number}</div>
                      <span
                        className={`release-room-status-badge ${
                          isOccupied ? "occupied" : "available"
                        }`}
                      >
                        {isOccupied ? "Occupied" : "Available"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <div className="release-right">
          <section className="appointment-card form-card">
            <h2>Release Details</h2>
            {!selectedRoomWithStatus ? (
              <p className="appointment-muted">Select a room to view details and release it.</p>
            ) : selectedRoomWithStatus.status !== "Busy" ? (
              <div className="release-empty-state">
                <h3>Room #{selectedRoomWithStatus.number} is Available</h3>
                <p>This room is already available and does not require release.</p>
              </div>
            ) : (
              <div className="release-form-content">
                <div className="release-info-section">
                  <h3>Active Appointment Info</h3>
                  {activeAppointmentForSelectedRoom ? (
                    <div className="release-info-grid">
                      <div className="release-info-item">
                        <span className="release-info-label">Patient Name</span>
                        <span className="release-info-val">
                          {activeAppointmentForSelectedRoom.patientName ?? activeAppointmentForSelectedRoom.PatientName ?? activeAppointmentForSelectedRoom.patientId ?? activeAppointmentForSelectedRoom.PatientId ?? "N/A"}
                        </span>
                      </div>
                      <div className="release-info-item">
                        <span className="release-info-label">Assigned Doctor</span>
                        <span className="release-info-val">
                          Dr.{" "}
                          {activeAppointmentForSelectedRoom.doctorName ??
                            activeAppointmentForSelectedRoom.DoctorName ??
                            "N/A"}
                        </span>
                      </div>
                      <div className="release-info-item">
                        <span className="release-info-label">Admitted At</span>
                        <span className="release-info-val">
                          {activeAppointmentForSelectedRoom.startTime ||
                          activeAppointmentForSelectedRoom.StartTime
                            ? new Date(
                                activeAppointmentForSelectedRoom.startTime ??
                                  activeAppointmentForSelectedRoom.StartTime
                              ).toLocaleString()
                            : "N/A"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="release-warning-text">
                      No active appointment details found. You can still release the room.
                    </p>
                  )}

                  {activeAppointmentForSelectedRoom && !isUserPrimaryDoctor && (
                    <div className="release-auth-alert">
                      <strong>Notice:</strong> Only Dr.{" "}
                      {activeAppointmentForSelectedRoom.doctorName ??
                        activeAppointmentForSelectedRoom.DoctorName}{" "}
                      is authorized to release this room.
                    </div>
                  )}
                </div>

                <div className="release-form-fields">
                  <div className="appointment-field">
                    <label>Clinical Report</label>
                    <textarea
                      className="form-textarea"
                      placeholder="Write clinical assessment, treatment notes, and patient condition..."
                      value={report}
                      onChange={(e) => setReport(e.target.value)}
                      rows={4}
                      disabled={!isUserPrimaryDoctor}
                    />
                  </div>

                  <div className="appointment-field">
                    <label>Prescribe Medicines</label>
                    <form onSubmit={addMedicine} className="release-medicine-input-row">
                      <input
                        type="text"
                        placeholder="Type medicine name and press Add"
                        value={medicineInput}
                        onChange={(e) => setMedicineInput(e.target.value)}
                        disabled={!isUserPrimaryDoctor}
                      />
                      <button type="submit" className="release-add-med-btn" disabled={!isUserPrimaryDoctor}>
                        Add
                      </button>
                    </form>
                    <div className="release-medicine-list">
                      {medicines.map((med, index) => (
                        <span key={index} className="release-med-pill">
                          {med}
                          <button
                            type="button"
                            className="release-remove-med-btn"
                            onClick={() => removeMedicine(index)}
                            disabled={!isUserPrimaryDoctor}
                          >
                            &times;
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="appointment-btn primary release-action-btn"
                    onClick={handleRelease}
                    disabled={loadingState.releasing || !isUserPrimaryDoctor}
                  >
                    {loadingState.releasing ? "Releasing..." : "Release Room & End Appointment"}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
