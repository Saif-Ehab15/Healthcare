import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import axiosInstance from '../../../Config/axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './DoctorProfile.css';

const getDoctorImageSrc = (image) => {
  if (!image) return 'https://via.placeholder.com/150';

  if (
    image.startsWith("http://") ||
    image.startsWith("https://") ||
    image.startsWith("data:") ||
    image.startsWith("blob:")
  ) {
    return image;
  }

  const baseURL = axiosInstance.defaults.baseURL || "";

  if (image.startsWith("/")) {
    return `${baseURL}${image}`;
  }

  return `${baseURL}/images/${image}`;
};

const formatDisplayDate = (isoDate) => {
  if (!isoDate) return '';
  const d = new Date(`${isoDate}T00:00:00`);
  return Number.isNaN(d.getTime()) ? isoDate : d.toLocaleDateString();
};

const pad2 = (n) => String(n).padStart(2, '0');

const toTimeHHmm = (value) => {
  if (value == null || value === '') return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

const apiDayToYmd = (day) => {
  if (day == null || day === '') return '';
  if (typeof day === 'string') return day.split('T')[0];
  return '';
};

const combineLocalDateTimeToIso = (dateStr, timeStr) => `${dateStr}T${timeStr}:00`;


const mapAvailableTimeApiToRow = (item) => {
  const day = item.day ?? item.Day;
  const start = item.startTime ?? item.StartTime;
  const end = item.endTime ?? item.EndTime;
  return {
    id: item.id ?? item.Id,
    date: apiDayToYmd(day),
    startTime: toTimeHHmm(start),
    endTime: toTimeHHmm(end),
    slots: item.slots ?? item.Slots ?? 0
  };
};

const GET_AVAILABLE_TIMES_BY_DOCTOR_ID = '/api/AvailableTimeOfDoctor/GetAvailableTimesByDoctorId';

const getLoggedInDoctorId = () => {
  try {
    const u = JSON.parse(localStorage.getItem('user') || 'null');
    return u?.id ?? null;
  } catch {
    return null;
  }
};

const DoctorProfile = () => {
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editedDoctor, setEditedDoctor] = useState(null);
  const [showAddAppointment, setShowAddAppointment] = useState(false);
  const [newAppointment, setNewAppointment] = useState({
    date: '',
    startTime: '',
    endTime: '',
    slots: ''
  });

  const [tempImage, setTempImage] = useState(null); // For UI preview
  const [imageFile, setImageFile] = useState(null); // For API upload
  const [appointments, setAppointments] = useState([]);
  const [assignedWorks, setAssignedWorks] = useState([]);

  const resolvedDoctorId = useMemo(
    () => doctor?.id ?? getLoggedInDoctorId(),
    [doctor?.id]
  );

  const availableTimesFetchRef = useRef({ inFlight: false });

  useEffect(() => {
    const fetchDoctor = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("user"));
        if (!user || !user.id) {
          setError("User not found. Please login again.");
          setLoading(false);
          return;
        }
        const res = await axiosInstance.get(`/api/Accounts/GetDoctors/${user.id}`);
        const data = res.data;
        // Normalize doctor data
        const normalized = {
          ...data,
          name: data.name ?? data.doctorName ?? "Unknown",
          image: data.image ?? data.imageUrl ?? null,
          phone: data.phone ?? data.phoneNumber ?? ""
        };
        setDoctor(normalized);
        setEditedDoctor(normalized);
      } catch (err) {
        console.error("Error fetching doctor:", err);
        setError(err.response?.data?.message || "Failed to load doctor profile.");
      } finally {
        setLoading(false);
      }
    };
    fetchDoctor();
  }, []);

  const loadAvailableTimes = useCallback(async () => {
    const doctorId = resolvedDoctorId;
    if (!doctorId) return;
    if (availableTimesFetchRef.current.inFlight) return;
    availableTimesFetchRef.current.inFlight = true;

    const doGet = () =>
      axiosInstance.get(GET_AVAILABLE_TIMES_BY_DOCTOR_ID, {
        params: { doctorId }
      });

    try {
      const res = await doGet();
      const list = Array.isArray(res.data) ? res.data : [];
      setAppointments(list.map(mapAvailableTimeApiToRow));
    } catch (err) {
      const status = err.response?.status;
      if (status === 429) {
        toast.warn('Too many requests. Retrying once in a few seconds…');
        try {
          await new Promise((r) => setTimeout(r, 2200));
          const res = await doGet();
          const list = Array.isArray(res.data) ? res.data : [];
          setAppointments(list.map(mapAvailableTimeApiToRow));
        } catch (retryErr) {
          console.error('Error loading available times (retry):', retryErr);
        }
      } else {
        toast.error(err.response?.data?.message || 'Failed to load available times.');
      }
    } finally {
      availableTimesFetchRef.current.inFlight = false;
    }
  }, [resolvedDoctorId]);

  const fetchAssignedWorks = useCallback(async () => {
    const doctorId = resolvedDoctorId;
    if (!doctorId) return;
    try {
      const res = await axiosInstance.get(`/api/AssignWorks/doctor/${doctorId}`);
      const data = res.data?.$values || (Array.isArray(res.data) ? res.data : []);
      setAssignedWorks(data);
    } catch (err) {
      console.error("Error fetching assigned works:", err);
    }
  }, [resolvedDoctorId]);

  useEffect(() => {
    if (resolvedDoctorId) {
      const timer = setTimeout(() => {
        loadAvailableTimes();
        fetchAssignedWorks();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [resolvedDoctorId, loadAvailableTimes, fetchAssignedWorks]);


  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      // Use FormData to allow file uploads
      const formData = new FormData();
      formData.append('id', editedDoctor.id);
      formData.append('name', editedDoctor.name);
      formData.append('email', editedDoctor.email);
      formData.append('phone', editedDoctor.phone);
      formData.append('university', editedDoctor.university);
      formData.append('degree', editedDoctor.degree);
      formData.append('departmentName', editedDoctor.departmentName);

      if (imageFile) {
        formData.append('Image', imageFile); // Property name must match backend
      }

      const res = await axiosInstance.put("/api/Accounts/UpdateDoctorProfile", formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const updatedData = res.data;
      if (updatedData && (updatedData.id || updatedData.doctorId)) {
        const normalized = {
          ...updatedData,
          name: updatedData.name ?? updatedData.doctorName ?? "Unknown",
          image: updatedData.image ?? updatedData.imageUrl ?? null,
          phone: updatedData.phone ?? updatedData.phoneNumber ?? ""
        };
        setDoctor(normalized);
        setEditedDoctor(normalized);
      } else {
        // If API returns success but not the full object, use editedDoctor
        setDoctor(editedDoctor);
      }
      setIsEditing(false);
      setTempImage(null);
      setImageFile(null);
      toast.success("Profile updated successfully!");
    } catch (err) {
      console.error("Error updating profile:", err);
      toast.error(err.response?.data?.message || "Failed to update profile.");
    }
  };

  const handleCancel = () => {
    setEditedDoctor(doctor);
    setIsEditing(false);
    setTempImage(null);
    setImageFile(null);
  };

  const handleInputChange = (e) => {
    setEditedDoctor({
      ...editedDoctor,
      [e.target.name]: e.target.value
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddAppointment = async () => {
    const slotsNum = parseInt(String(newAppointment.slots), 10);
    if (!newAppointment.date || !newAppointment.startTime || !newAppointment.endTime || !Number.isFinite(slotsNum) || slotsNum < 1) {
      toast.error('Please enter date, start time, end time, and at least 1 slot.');
      return;
    }

    const payload = {
      doctorId: resolvedDoctorId,
      startTime: combineLocalDateTimeToIso(newAppointment.date, newAppointment.startTime),
      endTime: combineLocalDateTimeToIso(newAppointment.date, newAppointment.endTime),
      day: newAppointment.date,
      slots: slotsNum
    };

    try {
      const res = await axiosInstance.post('/api/AvailableTimeOfDoctor', payload);
      if (res.data) {
        setAppointments((prev) => [...prev, mapAvailableTimeApiToRow(res.data)]);
      }
      setNewAppointment({ date: '', startTime: '', endTime: '', slots: '' });
      setShowAddAppointment(false);
      toast.success('Availability added.');
    } catch (err) {
      toast.error('Failed to add availability.');
    }
  };

  const handleDeleteAppointment = async (availableTimeId) => {
    if (!availableTimeId) return;

    const previousAppointments = [...appointments];

    try {
      // Optimistic UI update
      setAppointments((prev) =>
        prev.filter((item) => item.id !== availableTimeId)
      );

      const response = await axiosInstance.delete(`/api/AvailableTimeOfDoctor/DeleteAvailableTime?id=${availableTimeId}`);

      console.log("Delete response:", response);

      const success =
        response.status === 200 &&
        response.data !== false &&
        response.data !== "false" &&
        response.data !== 0 &&
        response.data !== "0" &&
        response.data !== "Failed";

      if (!success) {
        setAppointments(previousAppointments);

        toast.error(
          (response.data && typeof response.data === 'object' && response.data.message) ||
          "Unable to delete available time."
        );

        return;
      }

      toast.success("Available time deleted successfully.");

      await loadAvailableTimes();
    } catch (error) {
      console.error("Delete error:", error);

      setAppointments(previousAppointments);

      toast.error(
        error.response?.data?.message ||
        error.response?.data ||
        "Failed to delete available time."
      );
    }
  };

  if (loading) return <div className="profile-container"><p>Loading...</p></div>;
  if (error) return <div className="profile-container"><p style={{ color: 'red' }}>{error}</p></div>;

  return (
    <div className="profile-container">
      <ToastContainer position="top-center" autoClose={3000} stacked />
      <div className="profile-header">
        <h2>Doctor Profile</h2>
        <div className="header-actions">
          {!isEditing ? (
            <button className="btn-edit" onClick={handleEdit}>✏️ Edit Profile</button>
          ) : (
            <>
              <button className="btn-save" onClick={handleSave}>💾 Save</button>
              <button className="btn-cancel" onClick={handleCancel}>❌ Cancel</button>
            </>
          )}
        </div>
      </div>

      <div className="profile-content">
        <div className="left-panel">
          <div className="doctor-card">
            <div className="doctor-avatar">
              <img
                src={
                  tempImage || getDoctorImageSrc(editedDoctor?.image)
                }
                alt={editedDoctor?.name}
                onError={(e) => { e.target.src = 'https://via.placeholder.com/150'; }}
              />
              <div className={`status-dot ${doctor?.isActive ? 'active' : 'inactive'}`} />

              {isEditing && (
                <div className="image-upload-overlay">
                  <label htmlFor="image-upload" className="image-upload-label">
                    <span>📷</span>
                    <span>Change Photo</span>
                  </label>
                  <input
                    type="file"
                    id="image-upload"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                  />
                </div>
              )}
            </div>

            <div className="doctor-name">
              {isEditing ? (
                <input
                  type="text"
                  name="name"
                  value={editedDoctor.name}
                  onChange={handleInputChange}
                  className="edit-input"
                />
              ) : (
                <h3>{doctor.name}</h3>
              )}
            </div>

            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">📧 Email</span>
                {isEditing ? (
                  <input type="email" name="email" value={editedDoctor.email} onChange={handleInputChange} className="edit-input" />
                ) : (
                  <span className="info-value">{doctor.email}</span>
                )}
              </div>

              <div className="info-item">
                <span className="info-label">📞 Phone</span>
                {isEditing ? (
                  <input type="text" name="phone" value={editedDoctor.phone} onChange={handleInputChange} className="edit-input" />
                ) : (
                  <span className="info-value">{doctor.phone}</span>
                )}
              </div>

              <div className="info-item">
                <span className="info-label">🎓 University</span>
                {isEditing ? (
                  <input type="text" name="university" value={editedDoctor.university} onChange={handleInputChange} className="edit-input" />
                ) : (
                  <span className="info-value">{doctor.university}</span>
                )}
              </div>

              <div className="info-item">
                <span className="info-label"> Degree</span>
                {isEditing ? (
                  <input type="text" name="degree" value={editedDoctor.degree} onChange={handleInputChange} className="edit-input" />
                ) : (
                  <span className="info-value">{doctor.degree}</span>
                )}
              </div>

              <div className="info-item">
                <span className="info-label">🏥 Department</span>
                {isEditing ? (
                  <input type="text" name="departmentName" value={editedDoctor.departmentName} onChange={handleInputChange} className="edit-input" />
                ) : (
                  <span className="info-value">{doctor.departmentName}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="right-panel">
          <div className="appointments-card">
            <div className="card-header">
              <h4>📅 Available Time</h4>
              <button className="btn-small" onClick={() => setShowAddAppointment(true)}>+ Add</button>
            </div>

            <div className="appointments-list">
              {appointments.map(apt => (
                <div key={apt.id} className="appointment-row">
                  <div className="appointment-details">
                    <span className="appointment-day">{formatDisplayDate(apt.date)}</span>
                    <span className="appointment-time">{apt.startTime} – {apt.endTime}</span>
                    <span className="appointment-time">Slots: {apt.slots}</span>
                  </div>
                  <button className="btn-delete" onClick={() => handleDeleteAppointment(apt.id)}>🗑️</button>
                </div>
              ))}
            </div>
          </div>
          <div className="appointments-card" style={{ marginTop: '20px' }}>
            <div className="card-header">
              <h4>📋 Assigned Work</h4>
            </div>
            <div className="appointments-list">
              {appointments.length > 0 ? (
                appointments.map((apt) => (
                  <div key={apt.id} className="appointment-row">
                    <div className="appointment-details">
                      <span className="appointment-day">
                        {formatDisplayDate(apt.date)}
                      </span>

                      <span className="appointment-time">
                        {apt.startTime} – {apt.endTime}
                      </span>

                      <span className="appointment-time">
                        Slots: {apt.slots}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p
                  style={{
                    textAlign: "center",
                    color: "#94a3b8",
                    padding: "10px",
                  }}
                >
                  No available times found.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {showAddAppointment && (
        <div className="modal">
          <div className="modal-content">
            <h4>Add New Appointment</h4>
            <label className="info-label">Date</label>
            <input type="date" value={newAppointment.date} onChange={(e) => setNewAppointment({ ...newAppointment, date: e.target.value })} />
            <label className="info-label">Start time</label>
            <input type="time" value={newAppointment.startTime} onChange={(e) => setNewAppointment({ ...newAppointment, startTime: e.target.value })} />
            <label className="info-label">End time</label>
            <input type="time" value={newAppointment.endTime} onChange={(e) => setNewAppointment({ ...newAppointment, endTime: e.target.value })} />
            <label className="info-label">Slots</label>
            <input type="number" min={1} value={newAppointment.slots} onChange={(e) => setNewAppointment({ ...newAppointment, slots: e.target.value })} />

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowAddAppointment(false)}>Cancel</button>
              <button className="btn-save" onClick={handleAddAppointment}>Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorProfile;