import React, { useEffect, useMemo, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axiosInstance from "../../../Config/axios";
import ReleaseRoomSection from "./releaseRoom";
import {
  DEFAULT_DEPARTMENTS,
  ROOM_TYPES,
  buildReleaseReportDto,
  getHubUrl,
  getLoggedInUserId,
  hubSuccess,
  hubValue,
  mergeDoctorOptions,
  normalizeDoctorOption,
  toArray,
} from "./appointmentShared";
import "./appointments.css";

const getRoomStatusMeta = (room, isSelected, isLocked) => {
  if (isLocked) return { label: "Locked / Reserved", className: "blocked" };
  if (isSelected) return { label: "Selected", className: "blocked" };
  const status = String(room.status || "").toLowerCase();
  if (status.includes("busy")) {
    return { label: "Occupied", className: "blocked" };
  }
  if (status.includes("block")) {
    return { label: "Blocked", className: "blocked" };
  }
  return { label: "Available", className: "available" };
};

const isRoomSelectable = (room, isSelected) => {
  if (room.blockedByAnotherUser) return false;
  if (isSelected) return true;
  const status = String(room.status || "").toLowerCase();
  return status.includes("available");
};

const AppointmentPage = () => {
  const connectionRef = useRef(null);
  const activeGroupRef = useRef(null);
  const selectedRoomRef = useRef("");
  const selectedDepartmentRef = useRef(null);

  const [activeTab, setActiveTab] = useState("book");
  const [connected, setConnected] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [selectedRoomType, setSelectedRoomType] = useState("");

  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);

  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  const [loadingState, setLoadingState] = useState({
    patients: false,
    rooms: false,
    blocking: false,
    doctors: false,
    creating: false,
  });

  const doctorId = getLoggedInUserId();
  const hubUrl = useMemo(() => getHubUrl(axiosInstance), []);

  const loadDoctorsForRoom = async (assignedFromHub, departmentId) => {
    const hubDoctors = mergeDoctorOptions(toArray(assignedFromHub));
    let departmentDoctors = [];

    if (departmentId) {
      try {
        const res = await axiosInstance.get(`/api/Department/GetDoctorsOfDepartment/${departmentId}`);
        departmentDoctors = mergeDoctorOptions(toArray(res.data));
      } catch (err) {
        console.error("Failed to load department doctors:", err);
      }
    }

    let merged = mergeDoctorOptions(hubDoctors, departmentDoctors);

    if (doctorId && !merged.some((item) => item.id === doctorId)) {
      try {
        const res = await axiosInstance.get(`/api/Accounts/GetDoctors/${doctorId}`);
        merged = mergeDoctorOptions(merged, [res.data]);
      } catch (err) {
        console.error("Failed to load logged-in doctor profile:", err);
      }
    }

    return merged;
  };

  const backendRoomType = useMemo(
    () => ROOM_TYPES.find((item) => item.value === selectedRoomType)?.backendValue || "",
    [selectedRoomType]
  );

  const resetAfterPatient = () => {
    setSelectedDepartment(null);
    setSelectedRoomType("");
    setRooms([]);
    setSelectedRoom(null);
    selectedRoomRef.current = "";
    setDoctors([]);
    setSelectedDoctor(null);
  };

  const resetAfterDepartment = () => {
    setSelectedRoomType("");
    setRooms([]);
    setSelectedRoom(null);
    selectedRoomRef.current = "";
    setDoctors([]);
    setSelectedDoctor(null);
  };

  const resetAfterRoomType = () => {
    setRooms([]);
    setSelectedRoom(null);
    selectedRoomRef.current = "";
    setDoctors([]);
    setSelectedDoctor(null);
  };

  const loadActiveAppointments = async () => {
    try {
      await axiosInstance.get("/api/AppointmentToRoom");
    } catch (err) {
      console.error("Failed to load active appointments", err);
    }
  };

  const safeInvoke = async (method, ...args) => {
    if (!connectionRef.current || connectionRef.current.state !== signalR.HubConnectionState.Connected) {
      setErrorMessage("Realtime connection is not ready.");
      return false;
    }
    try {
      await connectionRef.current.invoke(method, ...args);
      return true;
    } catch (err) {
      setErrorMessage(err?.message || "Realtime request failed.");
      return false;
    }
  };

  const normalizeRooms = (incomingRooms) => {
    if (!Array.isArray(incomingRooms)) return [];
    return incomingRooms.map((room, index) => {
      const statusValue = String(room.status ?? room.Status ?? "").toLowerCase();
      return {
        id: room.id ?? room.Id ?? room.roomId ?? index,
        displayName: `${room.roomType ?? room.RoomType ?? backendRoomType} ${
          room.number ?? room.Number ?? room.roomNumber ?? index + 1
        }`,
        status: statusValue.includes("busy") ? "Busy" : "Available",
        blockedByAnotherUser: false,
        isOccupied: statusValue.includes("busy"),
      };
    });
  };

  const setupConnection = async () => {
    if (connectionRef.current?.state === signalR.HubConnectionState.Connected) return;
    try {
      const connection = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl, { withCredentials: true })
        .withAutomaticReconnect()
        .build();

      connection.on("ReceiveAvailableRooms", (data) => {
        setLoadingState((prev) => ({ ...prev, rooms: false }));
        if (!hubSuccess(data)) {
          setErrorMessage(hubValue(data, "message") || "Failed to load rooms.");
          return;
        }
        setRooms(normalizeRooms(hubValue(data, "rooms")));
      });

      connection.on("BlockRoomResult", async (data) => {
        setLoadingState((prev) => ({ ...prev, blocking: false }));
        if (!hubSuccess(data)) {
          setErrorMessage(hubValue(data, "message") || "Failed to lock room.");
          setSelectedRoom(null);
          selectedRoomRef.current = "";
          setLoadingState((prev) => ({ ...prev, doctors: false }));
          return;
        }

        const blockedRoomId = String(hubValue(data, "roomId") ?? "");
        selectedRoomRef.current = blockedRoomId;
        setRooms((prev) =>
          prev.map((room) =>
            String(room.id) === blockedRoomId
              ? { ...room, status: "Blocked", blockedByAnotherUser: false }
              : room
          )
        );

        const doctorOptions = await loadDoctorsForRoom(
          hubValue(data, "assignedDoctors"),
          selectedDepartmentRef.current?.id
        );
        setDoctors(doctorOptions);

        const selfDoctor = doctorOptions.find((item) => item.id === doctorId);
        if (selfDoctor) {
          setSelectedDoctor(selfDoctor);
        } else if (doctorOptions.length === 1) {
          setSelectedDoctor(doctorOptions[0]);
        } else {
          setSelectedDoctor(null);
        }

        setLoadingState((prev) => ({ ...prev, doctors: false }));
      });

      connection.on("RoomStatusChanged", (data) => {
        const roomId = String(hubValue(data, "roomId") ?? "");
        const statusValue = String(hubValue(data, "status") ?? "").toLowerCase();
        const isAvailable = statusValue.includes("available");

        setRooms((prev) =>
          prev.map((room) => {
            if (String(room.id) !== roomId) return room;
            if (isAvailable) {
              return { ...room, status: "Available", blockedByAnotherUser: false, isOccupied: false };
            }
            const isMine = roomId === selectedRoomRef.current;
            return {
              ...room,
              status: isMine ? "Blocked" : "Busy",
              blockedByAnotherUser: !isMine,
              isOccupied: !isMine,
            };
          })
        );

        if (!isAvailable && selectedRoom && String(selectedRoom.id) === roomId && roomId !== selectedRoomRef.current) {
          setSelectedRoom(null);
          selectedRoomRef.current = "";
          setDoctors([]);
          setSelectedDoctor(null);
        }
      });

      connection.on("AppointmentCreationResult", (data) => {
        setLoadingState((prev) => ({ ...prev, creating: false }));
        if (!hubSuccess(data)) {
          const message = hubValue(data, "message") || "Failed to create appointment.";
          setErrorMessage(message);
          toast.error(message);
          return;
        }
        setErrorMessage("");
        toast.success(hubValue(data, "message") || "Appointment created successfully!");
        setSelectedPatient(null);
        resetAfterPatient();
      });

      connection.on("AppointmentCreated", () => {
        setLoadingState((prev) => ({ ...prev, creating: false }));
      });

      connection.on("ReleaseRoomResult", (data) => {
        setLoadingState((prev) => ({ ...prev, blocking: false }));
        if (!hubSuccess(data)) {
          setErrorMessage(hubValue(data, "message") || "Failed to release room.");
        }
      });

      await connection.start();
      connectionRef.current = connection;
      setConnected(true);
      setErrorMessage("");
    } catch (err) {
      setConnected(false);
      setErrorMessage(err?.message || "Failed to connect realtime.");
    }
  };

  const loadPatients = async () => {
    if (!doctorId) {
      setErrorMessage("Doctor session not found. Please login again.");
      return;
    }

    setLoadingState((prev) => ({ ...prev, patients: true }));
    setErrorMessage("");
    try {
      const response = await axiosInstance.get(`/api/Accounts/GetPatients`);
      const patientItems = toArray(response.data);

      setPatients(
        patientItems.map((item) => ({
          id: item.id ?? item.Id ?? item.patientId ?? item.PatientId ?? "",
          email: item.email ?? item.Email ?? "Unknown Patient",
        }))
      );

      if (patientItems.length === 0) {
        setErrorMessage("No patients found for your account.");
      }
    } catch (err) {
      const status = err?.response?.status;
      if (status === 429) {
        setErrorMessage("Too many requests. Please wait a few seconds and reopen the page.");
      } else {
        setErrorMessage(
          err?.response?.data?.message || err?.message || "Failed to load patients."
        );
      }
    } finally {
      setLoadingState((prev) => ({ ...prev, patients: false }));
    }
  };

  const joinGroupAndLoadRooms = async (departmentId, roomTypeForBackend) => {
    if (!connected || !departmentId || !roomTypeForBackend) return;

    setErrorMessage("");
    setLoadingState((prev) => ({ ...prev, rooms: true }));

    if (activeGroupRef.current) {
      const leaveOk = await safeInvoke(
        "LeaveDepartmentRoomGroup",
        activeGroupRef.current.departmentId,
        activeGroupRef.current.roomType
      );
      if (!leaveOk) {
        setLoadingState((prev) => ({ ...prev, rooms: false }));
        return;
      }
    }

    const joinOk = await safeInvoke(
      "JoinDepartmentRoomGroup",
      Number(departmentId),
      roomTypeForBackend
    );
    if (!joinOk) {
      setLoadingState((prev) => ({ ...prev, rooms: false }));
      return;
    }

    activeGroupRef.current = { departmentId: Number(departmentId), roomType: roomTypeForBackend };
  };

  const handleRoomSelect = async (room, isChecked) => {
    if (!room || room.blockedByAnotherUser || room.isOccupied || !backendRoomType) return;
    if (isChecked && !isRoomSelectable(room, false)) return;
    setErrorMessage("");
    setLoadingState((prev) => ({ ...prev, blocking: true }));

    if (isChecked) {
      setSelectedRoom(room);
      setSelectedDoctor(null);
      setDoctors([]);
      selectedRoomRef.current = String(room.id);
      setLoadingState((prev) => ({ ...prev, doctors: true }));

      const blockOk = await safeInvoke("BlockRoomSlot", Number(room.id), backendRoomType);
      if (!blockOk) {
        setLoadingState((prev) => ({ ...prev, blocking: false, doctors: false }));
        setSelectedRoom(null);
        selectedRoomRef.current = "";
      }
    } else {
      const reportDto = buildReleaseReportDto({
        createdBy: doctorId,
      });

      const releaseOk = await safeInvoke(
        "ReleaseRoom",
        doctorId,
        Number(room.id),
        backendRoomType,
        reportDto
      );
      if (releaseOk) {
        setSelectedRoom(null);
        selectedRoomRef.current = "";
        setDoctors([]);
        setSelectedDoctor(null);
      }
      setLoadingState((prev) => ({ ...prev, blocking: false }));
    }
  };

  const createAppointment = async () => {
    if (!doctorId) {
      setErrorMessage("Creator is missing. Please login again.");
      return;
    }
    if (!selectedPatient?.id || !selectedDepartment?.id || !selectedRoom?.id || !selectedDoctor?.id) {
      setErrorMessage("Please complete all required steps before creating appointment.");
      return;
    }

    setLoadingState((prev) => ({ ...prev, creating: true }));
    setErrorMessage("");

    const dto = {
      createdBy: doctorId,
      patientId: selectedPatient.id,
      roomId: Number(selectedRoom.id),
      primaryDoctorId: selectedDoctor.id,
      startTime: new Date().toISOString(),
    };

    const ok = await safeInvoke("CreateAppointmentWithDoctor", dto, backendRoomType);
    if (!ok) {
      setLoadingState((prev) => ({ ...prev, creating: false }));
    } else {
      await loadActiveAppointments();
      setLoadingState((prev) => ({ ...prev, creating: false }));
    }
  };

  useEffect(() => {
    loadPatients();
    setupConnection();
    return () => {
      if (connectionRef.current) connectionRef.current.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    selectedDepartmentRef.current = selectedDepartment;
  }, [selectedDepartment]);

  useEffect(() => {
    if (!selectedDepartment?.id || !backendRoomType || !connected) return;
    joinGroupAndLoadRooms(selectedDepartment.id, backendRoomType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDepartment, backendRoomType, connected]);

  const canSelectDepartment = Boolean(selectedPatient?.id);
  const canSelectRoomType = canSelectDepartment && Boolean(selectedDepartment?.id);
  const canSelectRoom = canSelectRoomType && Boolean(selectedRoomType);
  const canSelectDoctor = Boolean(selectedRoom?.id) && !loadingState.doctors;
  const canCreateAppointment =
    Boolean(selectedPatient?.id) &&
    Boolean(selectedDepartment?.id) &&
    Boolean(selectedRoomType) &&
    Boolean(selectedRoom?.id) &&
    Boolean(selectedDoctor?.id) &&
    !loadingState.creating;

  return (
    <div className="appointment-page">
      <ToastContainer position="top-center" autoClose={3000} stacked />
      <div className="appointment-shell">
        <div className="appointment-page-header">
          <h1>Hospital Rooms</h1>
          <span className={`connection-pill ${connected ? "online" : "offline"}`}>
            {connected ? "Realtime connected" : "Connecting..."}
          </span>
        </div>

        <div className="appointment-tabs">
          <button
            type="button"
            className={`appointment-tab ${activeTab === "book" ? "active" : ""}`}
            onClick={() => setActiveTab("book")}
          >
            Assign Patient
          </button>
          <button
            type="button"
            className={`appointment-tab ${activeTab === "release" ? "active" : ""}`}
            onClick={() => setActiveTab("release")}
          >
            Release Room
          </button>
        </div>

        {activeTab === "release" ? (
          <ReleaseRoomSection />
        ) : (
          <>
            <section className="appointment-card">
              <h2>Patient</h2>
              <div className="appointment-field">
                <label>Select Patient</label>
                <select
                  value={selectedPatient?.id || ""}
                  disabled={loadingState.patients}
                  onChange={(e) => {
                    const patient = patients.find((item) => String(item.id) === e.target.value) || null;
                    setSelectedPatient(patient);
                    resetAfterPatient();
                  }}
                >
                  <option value="">
                    {loadingState.patients ? "Loading patients..." : "Choose patient"}
                  </option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.email}
                    </option>
                  ))}
                </select>
              </div>
            </section>

            <section className="appointment-card">
              <h2>Department</h2>
              <div className="appointment-field">
                <label>Select Department</label>
                <select
                  value={selectedDepartment?.id || ""}
                  disabled={!canSelectDepartment}
                  onChange={(e) => {
                    const nextDepartment =
                      DEFAULT_DEPARTMENTS.find((item) => String(item.id) === e.target.value) || null;
                    setSelectedDepartment(nextDepartment);
                    resetAfterDepartment();
                  }}
                >
                  <option value="">Choose department</option>
                  {DEFAULT_DEPARTMENTS.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </div>
            </section>

            <section className="appointment-card">
              <h2>Room Type</h2>
              <div className="appointment-field">
                <label>Select Room Type</label>
                <select
                  value={selectedRoomType}
                  disabled={!canSelectRoomType}
                  onChange={(e) => {
                    setSelectedRoomType(e.target.value);
                    resetAfterRoomType();
                  }}
                >
                  <option value="">Choose room type</option>
                  {ROOM_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </section>

            <section className="appointment-card">
              <h2>Room Selection</h2>
              {loadingState.rooms ? (
                <div className="loading-pill">Loading rooms...</div>
              ) : !canSelectRoom ? (
                <p className="appointment-muted">Select room type first.</p>
              ) : rooms.length === 0 ? (
                <p className="appointment-muted">No rooms available for this selection.</p>
              ) : (
                <div className="room-radio-list">
                  {rooms.map((room) => {
                    const isSelected = String(selectedRoom?.id || "") === String(room.id);
                    const statusMeta = getRoomStatusMeta(room, isSelected, room.blockedByAnotherUser);
                    const selectable = isRoomSelectable(room, isSelected);
                    return (
                      <label
                        key={room.id}
                        className={`room-option ${!selectable && !isSelected ? "disabled" : ""}`}
                      >
                        <input
                          type="checkbox"
                          name="room-selection"
                          value={room.id}
                          checked={isSelected}
                          disabled={
                            !canSelectRoom ||
                            !selectable ||
                            loadingState.blocking ||
                            (selectedRoom && !isSelected)
                          }
                          onChange={(e) => handleRoomSelect(room, e.target.checked)}
                        />
                        <span>
                          {room.displayName}
                          <span className={`status-badge ${statusMeta.className}`}>
                            {statusMeta.label}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
              {loadingState.blocking && <div className="loading-pill">Locking room...</div>}
            </section>

            <section className="appointment-card">
              <h2>Doctor</h2>
              {loadingState.doctors ? (
                <div className="loading-pill">Loading doctors...</div>
              ) : (
                <div className="appointment-field">
                  <label>Select Doctor</label>
                  <select
                    value={selectedDoctor?.id || ""}
                    disabled={!canSelectDoctor || doctors.length === 0}
                    onChange={(e) => {
                      const doctor = doctors.find((item) => String(item.id) === e.target.value) || null;
                      setSelectedDoctor(doctor);
                    }}
                  >
                    <option value="">
                      {doctors.length > 0 ? "Choose doctor" : "Select room first"}
                    </option>
                  {doctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.name}
                      {doctor.id === doctorId ? " (You)" : ""}
                      {doctor.isAssignedToRoom ? " • Assigned to room" : ""}
                    </option>
                  ))}
                  </select>
                </div>
              )}
            </section>

            <section className="appointment-card">
              <h2>Create Appointment</h2>
              <div className="appointment-grid">
                <div className="appointment-field">
                  <label>Patient</label>
                  <input value={selectedPatient?.email || "-"} readOnly />
                </div>
                <div className="appointment-field">
                  <label>Department</label>
                  <input value={selectedDepartment?.name || "-"} readOnly />
                </div>
                <div className="appointment-field">
                  <label>Room Type</label>
                  <input value={selectedRoomType || "-"} readOnly />
                </div>
                <div className="appointment-field">
                  <label>Room</label>
                  <input value={selectedRoom?.displayName || "-"} readOnly />
                </div>
                <div className="appointment-field">
                  <label>Doctor</label>
                  <input value={selectedDoctor?.name || "-"} readOnly />
                </div>
              </div>
              <div className="appointment-actions">
                <button
                  type="button"
                  className="appointment-btn primary"
                  onClick={createAppointment}
                  disabled={!canCreateAppointment}
                >
                  {loadingState.creating ? "Creating..." : "Create Appointment"}
                </button>
              </div>
            </section>
          </>
        )}

        {errorMessage && <p className="global-error">{errorMessage}</p>}
      </div>
    </div>
  );
};

export default AppointmentPage;
