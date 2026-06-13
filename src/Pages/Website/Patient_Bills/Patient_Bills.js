import React, { useState, useEffect } from "react";
import "./Patient_Bills.css";
import Navbar from "../../../Components/Navbar/Navbar";
import ChatbotWidget from "../Chatbot/Chatbot";
import axiosInstance from "../../../Config/axios";
import { ToastContainer, toast } from "react-toastify";

export default function PatientBills() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBills = async () => {
      try {
        const userStr = localStorage.getItem("user");
        if (!userStr) {
          setError("You must be logged in to view your bills.");
          setLoading(false);
          return;
        }

        const user = JSON.parse(userStr);
        const patientId = user.id || user.userId || user.patientId || user.PatientId;

        if (!patientId) {
          setError("Could not identify patient profile. Please login again.");
          setLoading(false);
          return;
        }

        const res = await axiosInstance.get(`/api/Bill/GetBillsOfPatient/${patientId}`);

        let data = res.data;
        // Handle potential wrapped collection ($values)
        if (data?.$values) data = data.$values;

        setBills(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error fetching bills:", err);
        setError("Failed to load your bills.");
        toast.error("Failed to load bills.");
      } finally {
        setLoading(false);
      }
    };

    fetchBills();
  }, []);

  return (
    <div className="bills-page-wrapper">
      <ToastContainer
        position="top-center"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
        stacked
      />
      <Navbar />

      <div className="patient-bills-page">
        <div className="bills-search-container" style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1 className="bills-title">Medical Invoices</h1>
          <p className="bills-subtitle">Here is a complete record of your invoices, treatments, and payment statuses.</p>
        </div>

        <div className="invoice-result-section">
          {error && (
            <div className="invoice-error-card">
              <div className="error-icon">⚠️</div>
              <p className="error-text">{error}</p>
            </div>
          )}

          {loading && (
            <div className="invoice-loading-card">
              <div className="invoice-loader"></div>
              <p>Fetching your secure billing records...</p>
            </div>
          )}

          {!loading && !error && bills.length === 0 && (
            <div className="invoice-error-card" style={{ borderColor: "#3b82f6", background: "rgba(59, 130, 246, 0.1)", textAlign: "center" }}>
              <div className="error-icon" style={{ color: "#60a5fa" }}>ℹ️</div>
              <p className="error-text" style={{ color: "#93c5fd" }}>You have no medical invoices at this time.</p>
            </div>
          )}

          <div className="bills-list-grid" style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            {bills.map((bill) => (
              <div key={bill.id} className="invoice-card-wrapper">
                <div className="invoice-card">
                  <div className="invoice-header">
                    <div className="brand-info">
                      <span className="brand-logo">🏥</span>
                      <div>
                        <h3>SAFI MEDICAL CLINIC</h3>
                        <p>Care, Quality, Integrity</p>
                      </div>
                    </div>
                    <div className="invoice-meta">
                      <span className="invoice-id-badge">Invoice #{bill.id}</span>
                      <span className={`status-badge ${bill.status?.toLowerCase()}`}>
                        {bill.status}
                      </span>
                    </div>
                  </div>

                  <hr className="invoice-divider" />

                  <div className="invoice-details-grid">
                    <div className="detail-column">
                      <span className="detail-label">Patient Name</span>
                      <h4 className="detail-value">{bill.patientName}</h4>
                    </div>
                    <div className="detail-column">
                      <span className="detail-label">Date Issued</span>
                      <h4 className="detail-value">
                        {bill.st_Date ? new Date(bill.st_Date).toLocaleDateString("en-US", {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        }) : "N/A"}
                      </h4>
                    </div>
                    <div className="detail-column">
                      <span className="detail-label">Closing Date</span>
                      <h4 className="detail-value">
                        {bill.end_Date ? new Date(bill.end_Date).toLocaleDateString("en-US", {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        }) : "Still Active / Under Treatment"}
                      </h4>
                    </div>
                  </div>

                  <div className="invoice-treatment-details">
                    <span className="section-label">Medical Summary & Treatment Breakdown</span>
                    <div className="treatment-content-box">
                      {bill.Details || bill.details ? (
                        <p className="treatment-text">{bill.Details || bill.details}</p>
                      ) : (
                        <p className="treatment-text empty-details">
                          No additional clinical details recorded. Please contact front desk for full itemized log.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="invoice-footer">
                    <div className="total-label-box">
                      <p>Total Outstanding Balance</p>
                      <span>Tax Inclusive</span>
                    </div>
                    <div className="total-amount-box">
                      <span className="amount-value">{bill.TotalAmount || bill.totalAmount || 0}</span>
                      <span className="currency-label">{bill.currency || "EGP"}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ChatbotWidget />
    </div>
  );
}
