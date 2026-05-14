import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./doctors.css";
import Navbar from "../../../Components/Navbar/Navbar";
import axiosInstance from "../../../Config/axios";

export default function AllDoctors() {

  const navigate = useNavigate();

  const [doctors, setDoctors] = useState([]);
  const [filteredDoctors, setFilteredDoctors] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchDoctors() {
      try {
        const res = await axiosInstance.get("/api/Accounts/GetDoctors", {
          signal: controller.signal,
        });
        const doctorsFromApi = Array.isArray(res.data) ? res.data : [];

        const normalizedDoctors = doctorsFromApi.map((doctor, index) => ({
          id: doctor.id ?? doctor.doctorId ?? index,
          doctorName: (doctor.doctorName ?? doctor.name ?? "Unknown Doctor").trim(),
          specialization:
            (
              doctor.specialization ??
              doctor.specialty ??
              doctor.departmentName ??
              doctor.department ??
              ""
            ).trim(),
          image: doctor.image ?? doctor.imageUrl ?? null,
        }));

        setDoctors(normalizedDoctors);
        setFilteredDoctors(normalizedDoctors);
      } catch (error) {
        if (error.name === "CanceledError" || error.name === "AbortError") {
          console.log("Fetch doctors cancelled");
        } else {
          console.error("Failed to fetch doctors:", error);
          setDoctors([]);
          setFilteredDoctors([]);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchDoctors();

    return () => {
      controller.abort();
    };
  }, []);

  const handleSearch = (value) => {
    const normalizeSearchText = (text) =>
      (text || "")
        .toLowerCase()
        .replace(/^dr\.?\s+/, "")
        .trim();

    const search = normalizeSearchText(value);

    if (search === "") {
      setFilteredDoctors(doctors);
      return;
    }

    const result = doctors.filter((doc) =>
      normalizeSearchText(doc.doctorName).includes(search) ||
      (doc.specialization || "").toLowerCase().includes(search)
    );

    setFilteredDoctors(result);
  };

  return (
    <>
      <Navbar />

      <div className="main-page">
        <div className="search-section">
          <input
            className="doctors-search-input"
            type="text"
            placeholder="Search doctor or specialization"
            value={searchInput}
            onChange={(e) => {
              const value = e.target.value;
              setSearchInput(value);
              handleSearch(value);
            }}
          />
        </div>

        <div className="pets-grid">
          {loading ? (
            <p>Loading doctors...</p>
          ) : filteredDoctors.length === 0 ? (
            <p>No doctors found</p>
          ) : (
            filteredDoctors.map((doctor) => (
              <DoctorBox
                key={doctor.id}
                doctor={doctor}
                onDetailsClick={() => navigate(`/doctor-details/${doctor.id}`)}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}

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

  if (image.startsWith("/")) {
    return `${baseURL}${image}`;
  }

  return `${baseURL}/images/${image}`;
};

const DoctorBox = ({ doctor, onDetailsClick }) => (
  <div className="doctor-box">
    <div className="doctor-image-container">
      {doctor.image ? (
        <img src={getDoctorImageSrc(doctor.image)} alt={doctor.doctorName} />
      ) : (
        "No Photo"
      )}
    </div>

    <h3 className="doctor-name">Dr {doctor.doctorName}</h3>
    <p className="doctor-specialization">{doctor.specialization}</p>
    <button className="details-btn" onClick={onDetailsClick}>
      View Details
    </button>
  </div>
);