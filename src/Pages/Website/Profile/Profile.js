import React, { useEffect, useState } from "react";
import "../Profile/Profile.css";
import Navbar from "../../../Components/Navbar/Navbar";
import ChatbotWidget from "../Chatbot/Chatbot";
import axiosInstance from "../../../Config/axios";
import { ToastContainer, toast } from "react-toastify";

const normalizeMedicines = (medicines) => {
  if (!medicines) return [];
  if (Array.isArray(medicines)) return medicines;
  if (medicines?.$values) return medicines.$values;
  return [];
};

const getImageUrl = (imagePath) => {
  if (!imagePath) return "https://via.placeholder.com/150";
  if (imagePath.startsWith("http")) return imagePath;
  const cleanPath = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
  if (cleanPath.startsWith("/images/")) {
    return `https://localhost:7250${cleanPath}`;
  }
  return `https://localhost:7250/images${cleanPath}`;
};

export default function Profile() {
  const [patient, setPatient] = useState(null);
  const [patientReports, setPatientReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    id: "",
    name: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    hasSugar: false,
    hasPressure: false,
    history: "",
    image: null,
  });

  useEffect(() => {
    const fetchPatient = async () => {
      try {
        const storedUser = localStorage.getItem("user");
        if (!storedUser) return setLoading(false);

        const user = JSON.parse(storedUser);
        const userId = user.id;
        // Handle both possible property names from Login.js
        const userName = user.userName || user.username || user.name || "Unknown";

        // Using the new API: /api/Accounts/GetPatients/{id}
        const res = await axiosInstance.get(`/api/Accounts/GetPatients/${userId}`);

        // Handle potential wrapping and normalize data
        let rawData = res.data;
        if (rawData?.$values) rawData = rawData.$values;
        if (Array.isArray(rawData)) rawData = rawData[0];

        const normalized = {
          ...rawData,
          id: rawData?.id || rawData?.Id || userId,
          name: rawData?.name || rawData?.userName || rawData?.patientName || "No Name",
          email: rawData?.email || "",
          phone: rawData?.phone || rawData?.phoneNumber || "",
          dateOfBirth: rawData?.dateOfBirth || rawData?.DateOfBirth || "",
          image: rawData?.image || rawData?.imageUrl || null,
          hasSugar: !!rawData?.hasSugar,
          hasPressure: !!rawData?.hasPressure,
          gender: rawData?.gender || "",
          history: rawData?.history || ""
        };
        setPatient(normalized);

        // Fetch reports
        const reportsRes = await axiosInstance.get(`/api/ReportDoctorToPatient/patient/${userId}`);
        let reportsData = reportsRes.data?.$values || (Array.isArray(reportsRes.data) ? reportsRes.data : []);
        reportsData = reportsData.map((report) => ({
          ...report,
          medicines: normalizeMedicines(report.medicines || report.Medicines),
        }));
        setPatientReports(reportsData);

      } catch (error) {
        console.error("Error fetching patient:", error);
        if (error.response?.status === 403) {
          toast.error("Access Forbidden (403): You don't have permission to view this profile or the name mismatch.");
        } else {
          toast.error("Failed to load patient details.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPatient();
  }, []);

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const storedUser = localStorage.getItem("user");
      const patientId = editForm.id || (storedUser ? JSON.parse(storedUser).id : null);
      if (!patientId) {
        toast.error("Could not determine patient ID. Please log in again.");
        return;
      }

      const formData = new FormData();
      formData.append("Id", patientId);
      formData.append("Name", editForm.name);
      formData.append("Email", editForm.email);
      formData.append("Phone", editForm.phone);
      formData.append("DateOfBirth", editForm.dateOfBirth);
      formData.append("HasSugar", String(editForm.hasSugar));
      formData.append("HasPressure", String(editForm.hasPressure));
      if (editForm.image) formData.append("Image", editForm.image);

      await axiosInstance.put("/api/Accounts/UpdatePatientProfile", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Profile updated!");
      window.location.reload();
    } catch (err) {
      console.error("Profile update error:", err);
      toast.error(err.response?.data || "Update failed.");
    }
  };

  if (loading) return <div className="loading-state">Loading...</div>;

  return (
    <div className="profile-page-wrapper">
      <ToastContainer />
      <Navbar />
      <div className="profile-page-container">
        <div className="profile-sidebar">
          <div className="patient-info-card">
            <div className="profile-avatar-container">
              <img
                src={getImageUrl(patient?.image)}
                alt="Profile"
                className="profile-avatar"
              />
            </div>
            <h2 className="patient-name">{patient?.name}</h2>
            <p className="patient-detail">{patient?.email}</p>
            <p className="patient-detail">{patient?.phone}</p>
            {patient?.gender && <p className="patient-detail">{patient.gender}</p>}
            <p className="patient-detail">{patient?.dateOfBirth?.split("T")[0]}</p>
            {(patient?.hasSugar || patient?.hasPressure) && (
              <div className="health-badges">
                {patient?.hasSugar && <div className="health-badge sugar">Diabetes</div>}
                {patient?.hasPressure && <div className="health-badge pressure">Hypertension</div>}
              </div>
            )}
            <button className="edit-profile-btn" onClick={() => {
              const storedUser = localStorage.getItem("user");
              const userId = storedUser ? JSON.parse(storedUser).id : null;
              setEditForm({
                ...patient,
                id: patient?.id || patient?.Id || userId,
                image: null,
              });
              setIsEditing(true);
            }}>
              <span>Edit Profile</span>
            </button>
          </div>
        </div>

        <div className="profile-main-content">
          <h1 className="history-title">Medical History</h1>
          <div className="history-list">
            {patientReports.map((report, idx) => (
              <div className="history-card" key={idx}>
                <div className="history-card-header">
                  <h3 className="doctor-name">Dr. {report.doctorName}</h3>
                  <span className="appointment-date">{report.createdAt?.split("T")[0]}</span>
                </div>
                <p className="appointment-summary">{report.report}</p>
                {report.medicines?.length > 0 && (
                  <div className="medicines-section">
                    <h4 className="medicines-title">Prescribed Medicines</h4>
                    <ul className="medicines-list">
                      {report.medicines.map((medicine, medIdx) => (
                        <li key={medIdx} className="medicine-item">{medicine}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {isEditing && (
        <div className="edit-modal-overlay">
          <div className="edit-modal-content">
            <h3>Edit Profile</h3>
            <form onSubmit={handleEditSubmit}>
              <div className="edit-form-grid">
                <div className="edit-form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    value={editForm.name || ""}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                </div>
                <div className="edit-form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={editForm.email || ""}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  />
                </div>
                <div className="edit-form-group">
                  <label>Phone</label>
                  <input
                    type="text"
                    value={editForm.phone || ""}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>
                <div className="edit-form-group">
                  <label>Date of Birth</label>
                  <input
                    type="date"
                    value={editForm.dateOfBirth ? editForm.dateOfBirth.split("T")[0] : ""}
                    onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })}
                  />
                </div>

                <div className="edit-form-group">
                  <label>Profile Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setEditForm({ ...editForm, image: e.target.files[0] })}
                  />
                </div>
              </div>

              <div className="checkbox-row">
                <div
                  className="checkbox-group"
                  onClick={() => setEditForm({ ...editForm, hasSugar: !editForm.hasSugar })}
                >
                  <input
                    type="checkbox"
                    checked={!!editForm.hasSugar}
                    onChange={() => { }}
                  />
                  <label>Have Diabetes</label>
                </div>
                <div
                  className="checkbox-group"
                  onClick={() => setEditForm({ ...editForm, hasPressure: !editForm.hasPressure })}
                >
                  <input
                    type="checkbox"
                    checked={!!editForm.hasPressure}
                    onChange={() => { }}
                  />
                  <label>Have Pressure</label>
                </div>
              </div>



              <div className="edit-modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setIsEditing(false)}>
                  Cancel
                </button>
                <button type="submit" className="save-btn">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ChatbotWidget />
    </div>
  );
}