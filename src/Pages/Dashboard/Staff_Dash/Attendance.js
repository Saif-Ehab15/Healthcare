import { useState, useEffect, useCallback } from "react";
import axiosInstance from "../../../Config/axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./Attendance.css";


const STATUS_OPTIONS = [
    { key: "Attend",  label: "Attend",  icon: "✅" },
    { key: "Late",    label: "Late",    icon: "⏰" },
    { key: "Absent",  label: "Absent",  icon: "❌" },
    { key: "Off",     label: "Off",     icon: "🌙" },
];

const statusClass = (s) => s?.toLowerCase() ?? "none";

// Format a local Date → "YYYY-MM-DD"
function toInputDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

/* ─── Component ───────────────────────────────────────────────────────── */
export default function Attendance() {
    const todayStr = toInputDate(new Date());

    const [selectedDate, setSelectedDate] = useState(todayStr);
    const isToday = selectedDate === todayStr;

    // staff list split by role — each item is an AssignWorksDto
    const [doctors, setDoctors] = useState([]);
    const [nurses,  setNurses]  = useState([]);

    // { doctorId: statusKey }  — the currently selected (or already-submitted) status
    const [attendance, setAttendance] = useState({});
    // { doctorId: true }  — rows that are permanently locked (already saved)
    const [confirmed, setConfirmed]   = useState({});
    // shiftId lookup  { doctorId: shiftId }
    const [shiftMap, setShiftMap]     = useState({});

    const [loading,    setLoading]    = useState(false);
    const [submitting, setSubmitting] = useState(null); // doctorId being saved
    const [activeTab,  setActiveTab]  = useState("doctors");

    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            setDoctors([]);
            setNurses([]);
            setAttendance({});
            setConfirmed({});
            setShiftMap({});

            try {
                // 1. Staff assigned to work on the selected date
                const staffEndpoint = isToday
                    ? "/api/AssignWorks/GetAssignWorksForAttendancetoday"
                    : `/api/AssignWorks/GetAssignWorksForAttendanceBydate/${selectedDate}`;

                const staffRes = await axiosInstance.get(staffEndpoint);
                const all = staffRes.data || [];

                setDoctors(all.filter(p => p.userType === "Doctor"));
                setNurses( all.filter(p => p.userType === "Nurse" || p.userType === "Staff"));

                // Build shiftId lookup keyed by doctorId
                const newShiftMap = {};
                all.forEach(p => { newShiftMap[p.doctorId] = p.shiftId; });
                setShiftMap(newShiftMap);

                // 2. Already-submitted attendance for the selected date
                const attEndpoint = isToday
                    ? "/api/Attendance/today"
                    : `/api/Attendance/date/${selectedDate}`;

                let doneRecords = [];
                try {
                    const doneRes = await axiosInstance.get(attEndpoint);
                    doneRecords = doneRes.data || [];
                } catch {
                }

                const attMap  = {};
                const confMap = {};
                doneRecords.forEach(record => {
                    if (record.userrId && record.status) {
                        const normalised =
                            record.status.charAt(0).toUpperCase() +
                            record.status.slice(1).toLowerCase();
                        const matched = STATUS_OPTIONS.find(
                            s => s.key.toLowerCase() === normalised.toLowerCase()
                        );
                        if (matched) {
                            attMap[record.userrId]  = matched.key;
                            confMap[record.userrId] = true; 
                        }
                    }
                });
                setAttendance(attMap);
                setConfirmed(confMap);

            } catch (err) {
                toast.error("Failed to load staff data.");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchAll();
    }, [selectedDate]);

    const handleStatusChange = useCallback((person, statusKey) => {
        setAttendance(prev => ({ ...prev, [person.doctorId]: statusKey }));

        toast(
            ({ closeToast }) => (
                <div className="att-confirm-toast">
                    <p>
                        Mark <strong>{person.doctorName ?? "Staff"}</strong> as{" "}
                        <span className={`att-badge att-badge--${statusClass(statusKey)}`}>
                            {statusKey}
                        </span>?
                    </p>
                    <div className="att-confirm-actions">
                        <button
                            className="att-confirm-yes"
                            onClick={async () => {
                                closeToast();
                                await submitAttendance(person, statusKey);
                            }}
                        >
                            Confirm
                        </button>
                        <button
                            className="att-confirm-no"
                            onClick={() => {
                                setAttendance(prev => {
                                    const next = { ...prev };
                                    delete next[person.doctorId];
                                    return next;
                                });
                                closeToast();
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ),
            {
                autoClose: false,
                closeButton: false,
                position: "top-center",
                className: "att-toast-wrapper",
            }
        );
    }, []); 

    const submitAttendance = async (person, statusKey) => {
        setSubmitting(person.doctorId);
        try {
            await axiosInstance.post("/api/Attendance", {
                date:    selectedDate,          // "YYYY-MM-DD" — parsed as DateOnly
                status:  statusKey,             // "Attend" | "Late" | "Absent" | "Off"
                userrId: person.doctorId,       // userId from AssignWorksDto
                shiftId: shiftMap[person.doctorId] ?? person.shiftId ?? 0,
            });
            toast.success(`✅ ${person.doctorName ?? "Staff"} marked as ${statusKey}.`);
            // Lock the row permanently
            setConfirmed(prev => ({ ...prev, [person.doctorId]: true }));
        } catch (err) {
            toast.error(`Failed to save attendance for ${person.doctorName ?? "Staff"}.`);
            // Revert optimistic highlight
            setAttendance(prev => {
                const next = { ...prev };
                delete next[person.doctorId];
                return next;
            });
            console.error(err);
        } finally {
            setSubmitting(null);
        }
    };

    const renderTable = (people, role) => {
        if (!people.length) {
            return (
                <div className="att-empty">
                    <span className="att-empty-icon">👥</span>
                    <p>No {role} assigned for this date.</p>
                </div>
            );
        }

        return (
            <div className="att-table-wrapper">
                <table className="att-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Name</th>
                            <th>Shift</th>
                            {STATUS_OPTIONS.map(s => (
                                <th key={s.key}>
                                    <span className="att-th-icon">{s.icon}</span>
                                    {s.label}
                                </th>
                            ))}
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {people.map((person, idx) => {
                            const uid       = person.doctorId;
                            const selected  = attendance[uid];
                            const isLoading = submitting === uid;
                            const isLocked  = !!confirmed[uid];
                            const sc        = statusClass(selected);

                            return (
                                <tr
                                    key={uid ?? idx}
                                    className={[
                                        "att-row",
                                        selected  ? `att-row--${sc}` : "",
                                        isLocked  ? "att-row--locked" : "",
                                    ].join(" ").trim()}
                                >
                                    <td className="att-index">{idx + 1}</td>

                                    <td className="att-name">
                                        <div className="att-avatar-name">
                                            <div className="att-avatar">
                                                {(person.doctorName ?? "?")[0].toUpperCase()}
                                            </div>
                                            <span>{person.doctorName ?? "—"}</span>
                                        </div>
                                    </td>

                                    <td className="att-shift">
                                        {person.startTime && person.endTime
                                            ? `${person.startTime.slice(0, 5)} – ${person.endTime.slice(0, 5)}`
                                            : "—"}
                                    </td>

                                    {STATUS_OPTIONS.map(s => (
                                        <td key={s.key} className="att-check-cell">
                                            <label
                                                className={[
                                                    "att-check-label",
                                                    `att-check--${statusClass(s.key)}`,
                                                    selected === s.key ? "att-check--active" : "",
                                                    isLocked            ? "att-check--locked" : "",
                                                ].join(" ").trim()}
                                                title={
                                                    isLocked
                                                        ? "Attendance already recorded"
                                                        : `Mark ${s.label}`
                                                }
                                            >
                                                <input
                                                    type="radio"
                                                    name={`status-${uid}`}
                                                    value={s.key}
                                                    checked={selected === s.key}
                                                    onChange={() =>
                                                        !isLoading &&
                                                        !isLocked &&
                                                        handleStatusChange(person, s.key)
                                                    }
                                                    disabled={isLoading || isLocked}
                                                />
                                                <span className="att-check-custom" />
                                            </label>
                                        </td>
                                    ))}

                                    <td className="att-status-cell">
                                        {isLoading ? (
                                            <span className="att-spinner" />
                                        ) : selected ? (
                                            <span className={`att-badge att-badge--${sc}`}>
                                                {STATUS_OPTIONS.find(s => s.key === selected)?.icon}{" "}
                                                {selected}
                                                {isLocked && (
                                                    <span className="att-locked-icon" title="Locked">🔒</span>
                                                )}
                                            </span>
                                        ) : (
                                            <span className="att-badge att-badge--none">—</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    };

    /* ── JSX ─────────────────────────────────────────────────────────── */
    return (
        <div className="att-page">
            <ToastContainer
                position="top-center"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop
                closeOnClick
                pauseOnHover
                draggable
            />

            {/* ── Header ─────────────────────────────────────────────── */}
            <div className="att-header">
                <div className="att-header-left">
                    <h1 className="att-title">
                        <span className="att-title-icon">📋</span>
                        Attendance Management
                    </h1>
                    <p className="att-subtitle">
                        {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
                            weekday: "long",
                            year:    "numeric",
                            month:   "long",
                            day:     "numeric",
                        })}
                        {isToday && <span className="att-today-badge">Today</span>}
                    </p>
                </div>

                {/* ── Date picker ──────────────────────────────────────── */}
                <div className="att-date-picker-wrapper">
                    <label className="att-date-label" htmlFor="att-date-input">
                        📅 Select Date
                    </label>
                    <input
                        id="att-date-input"
                        type="date"
                        className="att-date-input"
                        value={selectedDate}
                        max={todayStr}
                        onChange={e => setSelectedDate(e.target.value)}
                    />
                </div>

                {/* ── Summary chips ────────────────────────────────────── */}
                <div className="att-summary">
                    <div className="att-summary-item">
                        <span className="att-summary-count">{doctors.length}</span>
                        <span className="att-summary-label">Doctors</span>
                    </div>
                    <div className="att-summary-item">
                        <span className="att-summary-count">{nurses.length}</span>
                        <span className="att-summary-label">Nurses</span>
                    </div>
                    <div className="att-summary-item">
                        <span className="att-summary-count">{Object.keys(confirmed).length}</span>
                        <span className="att-summary-label">Locked</span>
                    </div>
                    <div className="att-summary-item">
                        <span className="att-summary-count">
                            {doctors.length + nurses.length - Object.keys(confirmed).length}
                        </span>
                        <span className="att-summary-label">Pending</span>
                    </div>
                </div>
            </div>

            {/* ── Tabs ───────────────────────────────────────────────── */}
            <div className="att-tabs">
                <button
                    className={`att-tab${activeTab === "doctors" ? " att-tab--active" : ""}`}
                    onClick={() => setActiveTab("doctors")}
                >
                    🩺 Doctors <span className="att-tab-count">{doctors.length}</span>
                </button>
                <button
                    className={`att-tab${activeTab === "nurses" ? " att-tab--active" : ""}`}
                    onClick={() => setActiveTab("nurses")}
                >
                    💉 Nurses <span className="att-tab-count">{nurses.length}</span>
                </button>
            </div>

            {/* ── Content ────────────────────────────────────────────── */}
            <div className="att-content">
                {loading ? (
                    <div className="att-loading">
                        <div className="att-loading-spinner" />
                        <p>Loading staff data…</p>
                    </div>
                ) : (
                    <>
                        {activeTab === "doctors" && renderTable(doctors, "doctors")}
                        {activeTab === "nurses"  && renderTable(nurses,  "nurses / staff")}
                    </>
                )}
            </div>
        </div>
    );
}