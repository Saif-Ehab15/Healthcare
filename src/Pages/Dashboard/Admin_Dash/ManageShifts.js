import React, { useState, useEffect } from "react";
import axiosInstance from "../../../Config/axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./ManageShifts.css";

export default function ManageShifts() {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    startTime: "",
    endTime: "",
  });

  const fetchShifts = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/api/Shift");
      setShifts(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Failed to fetch shifts:", error);
      toast.error("Failed to fetch shifts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShifts();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setForm({ startTime: "", endTime: "" });
    setEditingId(null);
    setShowForm(false);
  };

  const formatTime = (time) => {
    if (!time) return "—";
    return time.length >= 5 ? time.slice(0, 5) : time;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.startTime || !form.endTime) {
      toast.warn("Please provide both start and end times.");
      return;
    }

    try {
      // Ensure times are in HH:MM:SS format
      const payload = {
        startTime: form.startTime.length === 5 ? `${form.startTime}:00` : form.startTime,
        endTime: form.endTime.length === 5 ? `${form.endTime}:00` : form.endTime,
      };

      if (editingId) {
        await axiosInstance.put(`/api/Shift/${editingId}`, payload);
        toast.success("Shift updated successfully");
      } else {
        await axiosInstance.post("/api/Shift", payload);
        toast.success("Shift created successfully");
      }
      fetchShifts();
      resetForm();
    } catch (error) {
      console.error("Failed to save shift:", error);
      toast.error(error?.response?.data?.message || "Failed to save shift");
    }
  };

  const handleEdit = (shift) => {
    setForm({
      startTime: formatTime(shift.startTime),
      endTime: formatTime(shift.endTime),
    });
    setEditingId(shift.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this shift?");
    if (!confirmDelete) return;

    try {
      await axiosInstance.delete(`/api/Shift/${id}`);
      toast.success("Shift deleted successfully");
      fetchShifts();
    } catch (error) {
      console.error("Failed to delete shift:", error);
      toast.error("Failed to delete shift");
    }
  };

  return (
    <div className="manage-shifts-container">
      <ToastContainer position="top-center" autoClose={3000} />
      
      <div className="header-section">
        <h1 className="header">⏱️ Manage Shifts</h1>
        <p className="sub-header">Add, edit, and remove hospital shifts</p>
      </div>

      <div className="action-bar">
        <button
          className="toggle-form-btn"
          onClick={() => {
            if (showForm) resetForm();
            else setShowForm(true);
          }}
        >
          {showForm ? "✕ Cancel" : "➕ Add New Shift"}
        </button>
      </div>

      {showForm && (
        <div className="form-card">
          <h3 className="form-title">{editingId ? "✏️ Edit Shift" : "➕ Add Shift"}</h3>
          <form onSubmit={handleSubmit} className="shift-form">
            <div className="input-group">
              <label>Start Time</label>
              <input
                type="time"
                name="startTime"
                value={form.startTime}
                onChange={handleChange}
                required
              />
            </div>
            <div className="input-group">
              <label>End Time</label>
              <input
                type="time"
                name="endTime"
                value={form.endTime}
                onChange={handleChange}
                required
              />
            </div>
            <button type="submit" className="save-btn">
              {editingId ? "💾 Save Changes" : "➕ Create Shift"}
            </button>
          </form>
        </div>
      )}

      <div className="shifts-grid">
        {loading ? (
          <p className="loading-text">Loading shifts...</p>
        ) : shifts.length === 0 ? (
          <p className="empty-state">No shifts found. Create one!</p>
        ) : (
          shifts.map((shift) => (
            <div key={shift.id} className="shift-card">
              <div className="shift-info">
                <h4>Shift #{shift.id}</h4>
                <p><strong>Start:</strong> {formatTime(shift.startTime)}</p>
                <p><strong>End:</strong> {formatTime(shift.endTime)}</p>
              </div>
              <div className="shift-actions">
                <button className="edit-btn" onClick={() => handleEdit(shift)}>Edit</button>
                <button className="delete-btn" onClick={() => handleDelete(shift.id)}>Delete</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}