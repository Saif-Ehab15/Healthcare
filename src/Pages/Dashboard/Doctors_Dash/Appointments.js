import React, { useEffect, useMemo, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";
import axiosInstance from "../../../Config/axios";
import "./appointments.css";

const DEPARTMENTS = [
    { id: 1, name: "Heart" },
    { id: 2, name: "Kidney" },
    { id: 3, name: "Liver" },
];

const ROOM_TYPES = [
    { value: "ICU", label: "ICU", backendValue: "ICU" },
    { value: "Normal", label: "Normal", backendValue: "Room" },
    { value: "Emergency", label: "Emergency", backendValue: "Emergency" },
];

const AppointmentPage = () => {
    const connectionRef = useRef(null);
    const activeGroupRef = useRef(null);
    const selectedRoomRef = useRef("");

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

    const hubUrl = useMemo(() => {
        const apiBase = axiosInstance.defaults.baseURL || window.location.origin;
        return `${apiBase.replace(/\/$/, "")}/appointmentHub`;
    }, []);

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

    const safeInvoke = async (method, ...args) => {
        if (!connectionRef.current || connectionRef.current.state !== "Connected") {
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
        return incomingRooms.map((room, index) => ({
            id: room.id ?? room.roomId ?? index,
            displayName: `${room.roomType ?? backendRoomType} ${room.number ?? room.roomNumber ?? index + 1}`,
            status: String(room.status || "").toLowerCase().includes("busy") ? "Blocked" : "Available",
            blockedByAnotherUser: false,
        }));
    };

    const setupConnection = async () => {
        if (connectionRef.current?.state === "Connected") return;
        try {
            const connection = new signalR.HubConnectionBuilder()
                .withUrl(hubUrl, { withCredentials: true })
                .withAutomaticReconnect()
                .build();

            connection.on("ReceiveAvailableRooms", (data) => {
                setLoadingState((prev) => ({ ...prev, rooms: false }));
                if (!data?.success) {
                    setErrorMessage(data?.message || "Failed to load rooms.");
                    return;
                }
                setRooms(normalizeRooms(data.rooms));
            });

            connection.on("BlockRoomResult", (data) => {
                setLoadingState((prev) => ({ ...prev, blocking: false }));
                if (!data?.success) {
                    setErrorMessage(data?.message || "Failed to lock room.");
                    setSelectedRoom(null);
                    selectedRoomRef.current = "";
                    return;
                }

                const blockedRoomId = String(data.roomId ?? "");
                selectedRoomRef.current = blockedRoomId;
                setRooms((prev) =>
                    prev.map((room) =>
                        String(room.id) === blockedRoomId
                            ? { ...room, status: "Blocked", blockedByAnotherUser: false }
                            : room
                    )
                );

                const doctorsResult = Array.isArray(data.assignedDoctors) ? data.assignedDoctors : [];
                setDoctors(
                    doctorsResult.map((item) => ({
                        id: item.doctorId ?? item.id ?? "",
                        name: item.doctorName ?? item.name ?? "Unknown Doctor",
                    }))
                );
                setLoadingState((prev) => ({ ...prev, doctors: false }));
            });

            connection.on("RoomStatusChanged", (data) => {
                const roomId = String(data?.roomId ?? "");
                const isAvailable = String(data?.status || "").toLowerCase().includes("available");

                setRooms((prev) =>
                    prev.map((room) => {
                        if (String(room.id) !== roomId) return room;
                        if (isAvailable) {
                            return { ...room, status: "Available", blockedByAnotherUser: false };
                        }
                        const isMine = roomId === selectedRoomRef.current;
                        return { ...room, status: "Blocked", blockedByAnotherUser: !isMine };
                    })
                );

                if (selectedRoomRef.current === roomId && !isAvailable) {
                    return;
                }

                if (!isAvailable && selectedRoom && String(selectedRoom.id) === roomId) {
                    setSelectedRoom(null);
                    selectedRoomRef.current = "";
                    setDoctors([]);
                    setSelectedDoctor(null);
                }
            });

            connection.on("AppointmentCreationResult", (data) => {
                setLoadingState((prev) => ({ ...prev, creating: false }));
                if (!data?.success) {
                    setErrorMessage(data?.message || "Failed to create appointment.");
                } else {
                    setErrorMessage("");
                    alert("Appointment created successfully!");
                    setSelectedPatient(null);
                    resetAfterPatient();
                }
            });

            connection.on("ReleaseRoomResult", (data) => {
                setLoadingState((prev) => ({ ...prev, blocking: false }));
                if (!data?.success) {
                    setErrorMessage(data?.message || "Failed to release room.");
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
        setLoadingState((prev) => ({ ...prev, patients: true }));
        setErrorMessage("");
        try {
            const response = await axiosInstance.get("/api/Accounts/GetPatients");
            const raw = response.data;
            const patientItems = Array.isArray(raw)
                ? raw
                : Array.isArray(raw?.$values)
                    ? raw.$values
                    : Array.isArray(raw?.data)
                        ? raw.data
                        : [];

            setPatients(
                patientItems.map((item) => ({
                    id: item.id ?? item.Id ?? item.patientId ?? item.PatientId ?? "",
                    name: item.name ?? item.Name ?? item.patientName ?? item.PatientName ?? "Unknown Patient",
                }))
            );

            if (patientItems.length === 0) {
                setErrorMessage("No patients returned from API.");
            }
        } catch (err) {
            const status = err?.response?.status;
            if (status === 429) {
                setErrorMessage("Too many requests. Please wait a few seconds and reopen the page.");
            } else {
                setErrorMessage(err?.response?.data?.message || err?.message || "Failed to load patients.");
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

        const joinOk = await safeInvoke("JoinDepartmentRoomGroup", Number(departmentId), roomTypeForBackend);
        if (!joinOk) {
            setLoadingState((prev) => ({ ...prev, rooms: false }));
            return;
        }

        activeGroupRef.current = { departmentId: Number(departmentId), roomType: roomTypeForBackend };
        const loadOk = await safeInvoke("GetAvailableRoomsByDepartment", Number(departmentId), roomTypeForBackend);
        if (!loadOk) {
            setLoadingState((prev) => ({ ...prev, rooms: false }));
        }
    };

    const handleRoomSelect = async (room, isChecked) => {
        if (!room || room.blockedByAnotherUser || !backendRoomType) return;
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
            }
        } else {
            const userStr = localStorage.getItem("user");
            // Use parsed id or fallback string
            const creatorId = userStr ? (JSON.parse(userStr)?.id || "") : "";
            const reportDto = {
                id: 0,
                report: "Released from UI",
                medicines: [],
                endTime: new Date().toISOString(),
                CreatedBy: creatorId
            };

            const releaseOk = await safeInvoke("ReleaseRoom", Number(room.id), backendRoomType, reportDto);
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
        const userStr = localStorage.getItem("user");
        const creatorId = userStr ? JSON.parse(userStr)?.id : null;
        if (!creatorId) {
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
            createdBy: creatorId,
            patientId: selectedPatient.id,
            roomId: Number(selectedRoom.id),
            primaryDoctorId: selectedDoctor.id,
            startTime: new Date().toISOString(),
            endTime: null,
        };

        const ok = await safeInvoke("CreateAppointmentWithDoctor", dto, backendRoomType);
        if (!ok) {
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
        if (!selectedDepartment?.id || !backendRoomType) return;
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
        <>
            <div className="appointment-page">
                <div className="appointment-shell">
                    <h1>Hospital Rooms</h1>

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
                                        {patient.name}
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
                                        DEPARTMENTS.find((item) => String(item.id) === e.target.value) || null;
                                    setSelectedDepartment(nextDepartment);
                                    resetAfterDepartment();
                                }}
                            >
                                <option value="">Choose department</option>
                                {DEPARTMENTS.map((department) => (
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
                                    const isLocked = room.blockedByAnotherUser;
                                    return (
                                        <label key={room.id} className={`room-option ${isLocked ? "disabled" : ""}`}>
                                            <input
                                                type="checkbox"
                                                name="room-selection"
                                                value={room.id}
                                                checked={isSelected}
                                                disabled={
                                                    !canSelectRoom ||
                                                    isLocked ||
                                                    loadingState.blocking ||
                                                    (selectedRoom && !isSelected)
                                                }
                                                onChange={(e) => handleRoomSelect(room, e.target.checked)}
                                            />
                                            <span>
                                                {room.displayName}
                                                <span className={`status-badge ${isLocked ? "blocked" : "available"}`}>
                                                    {isLocked ? "Locked / Reserved" : "Available"}
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
                                <input value={selectedPatient?.name || "-"} readOnly />
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
                                className="appointment-btn primary"
                                onClick={createAppointment}
                                disabled={!canCreateAppointment}
                            >
                                {loadingState.creating ? "Creating..." : "Create Appointment"}
                            </button>
                        </div>
                    </section>

                    {errorMessage && <p className="global-error">{errorMessage}</p>}
                </div>
            </div>
        </>
    );
};

export default AppointmentPage;