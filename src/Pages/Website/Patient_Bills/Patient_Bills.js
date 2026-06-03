import React, { useState } from "react";
import "./Patient_Bills.css";
import Navbar from "../../../Components/Navbar/Navbar";
import ChatbotWidget from "../Chatbot/Chatbot";
import axiosInstance from "../../../Config/axios";
import { ToastContainer, toast } from "react-toastify";

export default function PatientBills() {
  const [billIdInput, setBillIdInput] = useState("");
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!billIdInput.trim()) {
      toast.warning("Please enter a valid Bill ID.");
      return;
    }

    setLoading(true);
    setError(null);
    setBill(null);

    try {
      const res = await axiosInstance.get(`/api/Bill/GetBillByid/${billIdInput.trim()}`);
      
      let data = res.data;
      // Handle potential wrapped collection ($values)
      if (data?.$values) data = data.$values;
      if (Array.isArray(data)) data = data[0];

      setBill(data);
      toast.success("Bill loaded successfully!");
    } catch (err) {
      console.error("Error fetching bill:", err);
      const status = err.response?.status;
      if (status === 403) {
        setError("Access Denied: You are not authorized to view this bill. It belongs to another patient.");
        toast.error("You are not authorized to view this bill.");
      } else if (status === 404) {
        setError(`Bill ID #${billIdInput} not found. Please verify the ID.`);
        toast.error("Bill not found.");
      } else {
        setError(err.response?.data || "An error occurred while fetching the bill.");
        toast.error("Failed to load bill.");
      }
    } finally {
      setLoading(false);
    }
  };

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
        <div className="bills-search-container">
          <h1 className="bills-title">Medical Invoices</h1>
          <p className="bills-subtitle">Enter your Bill ID below to view your detailed invoice status, active treatments, and payment totals.</p>
          
          <form onSubmit={handleSearch} className="search-form-card">
            <div className="search-input-wrapper">
              <label htmlFor="billId">Bill Invoice ID</label>
              <div className="search-input-row">
                <input
                  id="billId"
                  type="number"
                  placeholder="e.g. 5"
                  value={billIdInput}
                  onChange={(e) => setBillIdInput(e.target.value)}
                  disabled={loading}
                />
                <button type="submit" className="search-submit-btn" disabled={loading}>
                  {loading ? <div className="btn-spinner"></div> : <span>Lookup Invoice</span>}
                </button>
              </div>
            </div>
          </form>
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
              <p>Contacting secure billing servers...</p>
            </div>
          )}

          {bill && (
            <div className="invoice-card-wrapper">
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
                    <span className="detail-label">Patient Details</span>
                    <h4 className="detail-value">{bill.patientName}</h4>
                    <p className="detail-subtext">ID: {bill.PatientId}</p>
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
                    {bill.Details ? (
                      <p className="treatment-text">{bill.Details}</p>
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
          )}
        </div>
      </div>

      <ChatbotWidget />
    </div>
  );
}
