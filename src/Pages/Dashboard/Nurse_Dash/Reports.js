import React, { useState, useEffect } from "react";
import axiosInstance from "../../../Config/axios";
import { 
  Search, 
  FileText, 
  User, 
  Stethoscope, 
  Calendar, 
  Pill, 
  ClipboardCheck,
  AlertCircle
} from "lucide-react";
import "./Reports.css";

export default function NurseReports() {
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get("/api/ReportDoctorToPatient");
      // Handle wrapped array format ($values)
      const rawData = response.data?.$values || (Array.isArray(response.data) ? response.data : []);
      const sortedReports = [...rawData].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setReports(sortedReports);
      setFilteredReports(sortedReports);
      setError(null);
    } catch (err) {
      console.error("Error fetching reports:", err);
      setError("Failed to load reports. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const term = searchTerm.toLowerCase();
    const filtered = reports.filter(report => 
      (report.patientName?.toLowerCase().includes(term)) ||
      (report.doctorName?.toLowerCase().includes(term)) ||
      (report.report?.toLowerCase().includes(term))
    );
    setFilteredReports(filtered);
  }, [searchTerm, reports]);

  const getImageUrl = (image, name) => {
    if (image) {
      if (image.startsWith('http')) return image;
      return image.startsWith('/')
        ? `https://localhost:7250${image}`
        : `https://localhost:7250/images/${image}`;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'Patient')}&background=0D9488&color=fff&size=128`;
  };

  if (loading) {
    return (
      <div className="nurse-reports-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div className="loader">Loading reports...</div>
      </div>
    );
  }

  return (
    <div className="nurse-reports-container">
      <header className="reports-header">
        <div className="reports-title-row">
          <h1>
            <ClipboardCheck className="header-icon" />
            Medical <span>Reports</span>
          </h1>
          <div className="reports-filters">
            <div className="search-wrapper">
              <Search className="search-icon" />
              <input
                type="text"
                placeholder="Search by patient, doctor or diagnosis..."
                className="search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </header>

      {error ? (
        <div className="no-reports">
          <AlertCircle className="no-reports-icon" style={{ color: '#ef4444' }} />
          <h2>{error}</h2>
          <button onClick={fetchReports} className="btn-retry" style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#0d9488', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
            Try Again
          </button>
        </div>
      ) : filteredReports.length > 0 ? (
        <div className="reports-grid">
          {filteredReports.map((report) => (
            <div key={report.reportId || report.id} className="report-card">
              <div className="report-card-header">
                <div className="patient-info-mini">
                  <img 
                    src={getImageUrl(report.patientImage, report.patientName)} 
                    alt={report.patientName} 
                    className="patient-avatar-mini" 
                  />
                  <div className="patient-text">
                    <h3>{report.patientName || "Unknown Patient"}</h3>
                    <div className="doctor-tag">
                      <Stethoscope size={14} />
                      <span>Dr. {report.doctorName || "Unknown Doctor"}</span>
                    </div>
                  </div>
                </div>
                <div className="report-date">
                  <Calendar size={14} />
                  <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="report-content-box">
                <p>{report.report}</p>
              </div>

              {report.medicines && report.medicines.length > 0 && (
                <div className="meds-section">
                  <div className="meds-label">
                    <Pill size={16} />
                    <span>Prescribed Medications:</span>
                  </div>
                  <div className="meds-list">
                    {report.medicines.map((med, idx) => (
                      <span key={idx} className="med-badge">{med}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="no-reports">
          <FileText className="no-reports-icon" />
          <h2>No reports found</h2>
          <p>Try adjusting your search terms</p>
        </div>
      )}
    </div>
  );
}