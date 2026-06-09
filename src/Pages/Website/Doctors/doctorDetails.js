import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../../../Components/Navbar/Navbar";
import axiosInstance from "../../../Config/axios";
import { ChatPage } from "./Patientchat";
import "./doctorDetails.css";

const getDoctorImageSrc = (image) => {
  if (!image) return null;

  if (
    image.startsWith("http://") ||
    image.startsWith("https://") ||
    image.startsWith("data:") ||
    image.startsWith("blob:")
  ) {
    return image;
  }

  const baseURL = axiosInstance.defaults.baseURL || "";
  if (image.startsWith("/")) return `${baseURL}${image}`;
  return `${baseURL}/images/${image}`;
};

export default function DoctorDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchDoctorDetails() {
      try {
        const res = await axiosInstance.get(`/api/Accounts/GetDoctors/${id}`, {
          signal: controller.signal,
        });
        const apiDoctor = res.data || {};

        setDoctor({
          id: apiDoctor.id ?? apiDoctor.doctorId ?? id,
          doctorName: apiDoctor.doctorName ?? apiDoctor.name ?? "Unknown Doctor",
          specialization:
            apiDoctor.specialization ??
            apiDoctor.specialty ??
            apiDoctor.departmentName ??
            apiDoctor.department ??
            "",
          image: apiDoctor.image ?? apiDoctor.imageUrl ?? null,
          email: apiDoctor.email ?? "",
          phone: apiDoctor.phone ?? "",
          description: apiDoctor.description ?? apiDoctor.bio ?? "",
          university:
            apiDoctor.university ??
            apiDoctor.universityName ??
            apiDoctor.college ??
            "",
          degree:
            apiDoctor.degree ??
            apiDoctor.academicDegree ??
            apiDoctor.qualification ??
            "",
          rank:
            apiDoctor.rank ??
            apiDoctor.Rank ??
            apiDoctor.doctorRank ??
            apiDoctor.position ??
            null,
        });
      } catch (error) {
        if (error.name === "CanceledError" || error.name === "AbortError") {
          console.log("Fetch doctor details cancelled");
        } else {
          console.error("Failed to fetch doctor details:", error);
          setDoctor(null);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchDoctorDetails();

    return () => {
      controller.abort();
    };
  }, [id]);

  return (
    <>
      <Navbar />

      <div className="doctor-details-page">
        {loading ? (
          <p className="doctor-details-status">Loading doctor details...</p>
        ) : !doctor ? (
          <p className="doctor-details-status">Doctor details not found.</p>
        ) : (
          <div className="doctor-details-card">
            <div className="doctor-details-image-wrap">
              {doctor.image ? (
                <img
                  src={getDoctorImageSrc(doctor.image)}
                  alt={doctor.doctorName}
                  className="doctor-details-image"
                />
              ) : (
                <div className="doctor-details-image-placeholder">No Photo</div>
              )}
            </div>

            <div className="doctor-details-content">
              <p><strong>Name:</strong> {doctor.doctorName}</p>
              {doctor.specialization && (
                <p className="doctor-details-specialization">
                  <strong>Specialization:</strong> {doctor.specialization}
                </p>
              )}

              {doctor.email && <p><strong>Email:</strong> {doctor.email}</p>}
              {doctor.phone && <p><strong>Phone:</strong> {doctor.phone}</p>}
              {doctor.university && <p><strong>University:</strong> {doctor.university}</p>}
              {doctor.degree && <p><strong>Degree:</strong> {doctor.degree}</p>}
              {Number(doctor.rank) > 0 && (
                <p><strong>Rank:</strong> {Number(doctor.rank)}</p>
              )}


              <div className="doctor-details-actions">
                <button
                  className="register-now-btn"
                  onClick={() => navigate(`/doctors/${doctor.id}/reservation`)}
                >
                  Register Now
                </button>
                <button
                  className="chat-now-btn"
                  onClick={() => setIsChatOpen(true)}
                >
                  <svg
                    className="chat-btn-icon"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path
                      d="M8 10H16M8 14H13M7 19L3 21V5C3 3.9 3.9 3 5 3H19C20.1 3 21 3.9 21 5V17C21 18.1 20.1 19 19 19H7Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Chat
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {isChatOpen && doctor && (
        <div className="doctor-chat-overlay" onClick={() => setIsChatOpen(false)}>
          <div className="doctor-chat-modal" onClick={(e) => e.stopPropagation()}>
            <div className="doctor-chat-modal-header">
              <h3>Chat with Dr {doctor.doctorName}</h3>
              <button
                className="doctor-chat-close-btn"
                onClick={() => setIsChatOpen(false)}
              >
                ×
              </button>
            </div>
            <div className="doctor-chat-modal-body">
              <ChatPage doctorId={doctor.id} doctorName={doctor.doctorName} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
