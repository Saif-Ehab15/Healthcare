import React, { useEffect, useState } from "react";
import "./ManageBills.css";
import axiosInstance from "../../../Config/axios";
import { ToastContainer, toast } from "react-toastify";

export default function ManageBills() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchId, setSearchId] = useState("");
  const [selectedBill, setSelectedBill] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    fetchAllBills();
  }, []);

  const fetchAllBills = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/api/Bill");
      let data = res.data;
      if (data?.$values) data = data.$values;
      setBills(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load patient bills.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchId.trim()) {
      fetchAllBills();
      return;
    }

    setLoading(true);
    try {
      const res = await axiosInstance.get(`/api/Bill/GetBillByid/${searchId.trim()}`);
      let data = res.data;
      if (data?.$values) data = data.$values;
      const result = Array.isArray(data) ? data : [data];
      setBills(result.filter(Boolean));
      toast.success(`Found bill #${searchId}`);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 404) {
        toast.error(`Bill #${searchId} not found.`);
        setBills([]);
      } else {
        toast.error("Error looking up bill.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetails = async (billId) => {
    setModalLoading(true);
    setSelectedBill(null);
    try {
      const res = await axiosInstance.get(`/api/Bill/GetBillByid/${billId}`);
      let data = res.data;
      if (data?.$values) data = data.$values;
      if (Array.isArray(data)) data = data[0];
      setSelectedBill(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch bill details.");
    } finally {
      setModalLoading(false);
    }
  };

  const handleClearSearch = () => {
    setSearchId("");
    fetchAllBills();
  };

  return (
    <div className="manage-bills-container">
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

      <div className="manage-bills-header">
        <div>
          <h1 className="dashboard-title">Patient Bills</h1>
          <p className="dashboard-subtitle">Monitor and review billing statuses, active treatments, and totals for all patients.</p>
        </div>
      </div>

      <div className="controls-row">
        <form onSubmit={handleSearch} className="bill-search-form">
          <input
            type="number"
            placeholder="Search by Bill ID..."
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            className="bill-search-input"
          />
          <button type="submit" className="action-btn search-btn">
            Search
          </button>
          {searchId && (
            <button type="button" onClick={handleClearSearch} className="action-btn reset-btn">
              Clear
            </button>
          )}
        </form>
        <button onClick={fetchAllBills} className="action-btn refresh-btn">
          Refresh List
        </button>
      </div>

      {loading ? (
        <div className="dashboard-loading">
          <div className="db-spinner"></div>
          <p>Retrieving patient billing data...</p>
        </div>
      ) : bills.length === 0 ? (
        <div className="empty-bills-card">
          <p>No bills found. Try searching a different ID or checking the database logs.</p>
        </div>
      ) : (
        <div className="bills-table-wrapper">
          <table className="bills-db-table">
            <thead>
              <tr>
                <th>Bill ID</th>
                <th>Patient Name</th>
                <th>Status</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Total Balance</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((bill) => (
                <tr key={bill.id}>
                  <td className="bill-id-col">#{bill.id}</td>
                  <td className="patient-name-col">{bill.patientName || "Unknown"}</td>
                  <td>
                    <span className={`db-status-badge ${bill.status?.toLowerCase()}`}>
                      {bill.status}
                    </span>
                  </td>
                  <td>{bill.st_Date ? new Date(bill.st_Date).toLocaleDateString() : "-"}</td>
                  <td>{bill.end_Date ? new Date(bill.end_Date).toLocaleDateString() : "Active"}</td>
                  <td className="bill-amount-col">{bill.totalAmount || bill.TotalAmount} {bill.currency || "EGP"}</td>
                  <td>
                    <button onClick={() => handleOpenDetails(bill.id)} className="table-details-btn">
                      View details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Details Modal */}
      {selectedBill && (
        <div className="modal-backdrop" onClick={() => setSelectedBill(null)}>
          <div className="bill-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Detailed Invoice #{selectedBill.id}</h3>
              <button className="close-modal-btn" onClick={() => setSelectedBill(null)}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="modal-info-grid">
                <div className="info-block">
                  <span className="info-lbl">Patient Name</span>
                  <p className="info-val">{selectedBill.patientName || "N/A"}</p>
                </div>
                <div className="info-block">
                  <span className="info-lbl">Status</span>
                  <p><span className={`db-status-badge ${selectedBill.status?.toLowerCase()}`}>{selectedBill.status}</span></p>
                </div>
                <div className="info-block">
                  <span className="info-lbl">Date Initiated</span>
                  <p className="info-val">{selectedBill.st_Date ? new Date(selectedBill.st_Date).toLocaleString() : "N/A"}</p>
                </div>
                <div className="info-block">
                  <span className="info-lbl">Date Closed</span>
                  <p className="info-val">{selectedBill.end_Date ? new Date(selectedBill.end_Date).toLocaleString() : "Active (In Treatment)"}</p>
                </div>
              </div>

              <div className="treatment-details-section">
                <span className="info-lbl">Treatment History / Itemized Notes</span>
                <div className="treatment-notes">
                  {selectedBill.Details || selectedBill.details ? (
                    <p className="treatment-text">{selectedBill.Details || selectedBill.details}</p>
                  ) : (
                    <p className="treatment-text empty">No additional detailed treatment log found for this bill.</p>
                  )}
                </div>
              </div>

              <div className="modal-footer-pricing">
                <div>
                  <span className="info-lbl">Outstanding Balance</span>
                  <p className="tax-notice">Taxes and operational overhead included</p>
                </div>
                <div className="price-tag">
                  {selectedBill.totalAmount || selectedBill.TotalAmount} <span className="curr">{selectedBill.currency || "EGP"}</span>
                </div>
              </div>
            </div>

            <div className="modal-actions-row">
              <button onClick={() => setSelectedBill(null)} className="action-btn close-btn-bottom">
                Close Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {modalLoading && (
        <div className="modal-backdrop">
          <div className="modal-spinner-box">
            <div className="db-spinner"></div>
            <p>Loading invoice records...</p>
          </div>
        </div>
      )}
    </div>
  );
}
