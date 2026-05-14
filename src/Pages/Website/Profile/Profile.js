import React, { useEffect, useState } from "react";
import "../Profile/Profile.css";
import Navbar from "../../../Components/Navbar/Navbar";
import ChatbotWidget from "../Chatbot/Chatbot";
import axiosInstance from "../../../Config/axios";
import { ToastContainer, toast } from "react-toastify";


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
    const controller = new AbortController();

    async function fetchPatient() {
      try {
        const storedUser = localStorage.getItem("user");
        const token = localStorage.getItem("token");

        if (!storedUser) {
          console.error("No user found in localStorage");
          setLoading(false);
          return;
        }

        const user = JSON.parse(storedUser);

        if (!user?.id) {
          console.error("User ID not found");
          setLoading(false);
          return;
        }

        const res = await axiosInstance.get(
          `/api/Accounts/GetPatients/${user.id}`,
          {
            signal: controller.signal,
          }
        );

        setPatient(res.data);

        // Fetch reports specifically
        const reportsRes = await axiosInstance.get(
          `/api/ReportDoctorToPatient/patient/${user.id}`,
          {
            signal: controller.signal,
          }
        );
        setPatientReports(reportsRes.data);

      } catch (error) {
        if (error.name === "CanceledError" || error.name === "AbortError") {
          console.log("Fetch patient profile cancelled");
        } else {
          console.error("Error fetching patient:", error);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchPatient();

    return () => {
      controller.abort();
    };
  }, []);

  const handleEditClick = () => {
    setEditForm({
      id: patient?.id || "",
      name: patient?.name || "",
      email: patient?.email || "",
      phone: patient?.phone || "",
      dateOfBirth: patient?.dateOfBirth || "",
      gender: patient?.gender || "",
      hasSugar: patient?.hasSugar || false,
      hasPressure: patient?.hasPressure || false,
      history: patient?.history || "",
      image: null,
    });
    setIsEditing(true);
  };

  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleFileChange = (e) => {
    setEditForm((prev) => ({
      ...prev,
      image: e.target.files[0],
    }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append("Id", editForm.id);
      formData.append("Name", editForm.name);
      formData.append("Email", editForm.email);
      formData.append("Phone", editForm.phone);
      formData.append("DateOfBirth", editForm.dateOfBirth);
      formData.append("Gender", editForm.gender);
      formData.append("HasSugar", editForm.hasSugar);
      formData.append("HasPressure", editForm.hasPressure);
      formData.append("History", editForm.history);
      if (editForm.image) {
        formData.append("Image", editForm.image);
      }

      const token = localStorage.getItem("token");
      const res = await axiosInstance.put("/api/Accounts/UpdatePatientProfile", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 200) {
        toast.success("Profile updated successfully!");
        setIsEditing(false);
        // Refresh patient data
        const updatedRes = await axiosInstance.get(`/api/Accounts/GetPatients/${editForm.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPatient(updatedRes.data);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.join ? err.response.data.join(", ") : "Failed to update profile");
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="profile-page-container">
          <h2>Loading patient data...</h2>
        </div>
      </>
    );
  }

  return (
    <>
      <ToastContainer position="top-center" autoClose={3000} stacked />
      <Navbar />

      <div className="profile-page-container">

        {/* Sidebar */}
        <aside className="profile-sidebar">
          <div className="patient-info-card">

            <div className="profile-avatar-container">
              <img
                src={
                  patient?.image
                    ? (patient.image.startsWith("/")
                      ? `https://localhost:7250${patient.image}`
                      : `https://localhost:7250/images/${patient.image}`)
                    : "https://via.placeholder.com/150"
                }
                alt="Patient Avatar"
                className="profile-avatar"
              />
            </div>

            <h2 className="patient-name">{patient?.name || "No Name"}</h2>

            <p className="patient-detail">{patient?.email || "No Email"}</p>

            <p className="patient-detail">{patient?.phone || "No Phone"}</p>

            <p className="patient-detail">{patient?.dateOfBirth || "No Date Of Birth"}</p>

            <p className="patient-detail">{patient?.gender || "No Gender"}</p>

            <p className="patient-detail">
              {patient?.hasSugar ? "Has Diabetes" : "No Diabetes"} |{" "}
              {patient?.hasPressure ? "Has Pressure" : "No Pressure"}
            </p>

            <button className="edit-profile-btn" onClick={handleEditClick}><span>Edit Profile</span></button>

            <hr className="sidebar-divider" />
          </div>
        </aside>

        {/* Main Content */}
        <main className="profile-main-content">

          <h1 className="history-title">Patient History</h1>

          <div className="history-list">

            {patientReports.length > 0 ? (
              patientReports.map((item) => (
                <div className="history-card" key={item.id}>

                  <div className="history-card-header">

                    <h3 className="doctor-name">{item.doctorName || "Unknown Doctor"}</h3>

                    <span className="appointment-date">{new Date(item.createdAt).toLocaleDateString()}</span>

                  </div>

                  <p className="doctor-specialization">
                    Medical Professional
                  </p>

                  <p className="appointment-summary">{item.report}</p>

                  <div className="medicines-section">

                    <h4 className="medicines-title">
                      💊 Prescribed Medicines:
                    </h4>

                    <ul className="medicines-list">

                      {item.medicines?.map((med, index) => (
                        <li key={index} className="medicine-item">
                          {med}
                        </li>
                      ))}

                    </ul>

                  </div>

                  <button className="view-details-btn">
                    View Full Report
                  </button>

                </div>
              ))
            ) : (
              <p>No medical history available.</p>
            )}

          </div>

        </main>

      </div>

      <ChatbotWidget />

      {isEditing && (
        <div className="edit-modal-overlay">
          <div className="edit-modal-content">
            <h3>Edit Profile</h3>
            <form onSubmit={handleEditSubmit}>
              <div className="edit-form-group">
                <label>Name</label>
                <input type="text" name="name" value={editForm.name} onChange={handleEditChange} required />
              </div>
              <div className="edit-form-group">
                <label>Email</label>
                <input type="email" name="email" value={editForm.email} onChange={handleEditChange} required />
              </div>
              <div className="edit-form-group">
                <label>Phone</label>
                <input type="tel" name="phone" value={editForm.phone} onChange={handleEditChange} required />
              </div>
              <div className="edit-form-group checkbox-group">
                <input type="checkbox" name="hasSugar" checked={editForm.hasSugar} onChange={handleEditChange} />
                <label>Has Diabetes</label>
              </div>
              <div className="edit-form-group checkbox-group">
                <input type="checkbox" name="hasPressure" checked={editForm.hasPressure} onChange={handleEditChange} />
                <label>Has Blood Pressure</label>
              </div>
              <div className="edit-form-group">
                <label>Profile Image</label>
                <input type="file" name="image" accept="image/*" onChange={handleFileChange} />
              </div>

              <div className="edit-modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setIsEditing(false)}>Cancel</button>
                <button type="submit" className="save-btn">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </>
  );
}