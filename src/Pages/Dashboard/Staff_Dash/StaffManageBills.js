import React, { useEffect, useState } from "react";
import "../Admin_Dash/ManageBills.css";
import axiosInstance from "../../../Config/axios";
import { ToastContainer, toast } from "react-toastify";

import "react-toastify/dist/ReactToastify.css";

const ConfirmToastContent = ({ billId, onConfirm, onCancel }) => {
  return (
    <div style={{ padding: "4px", fontFamily: "sans-serif" }}>
      <p style={{ margin: "0 0 12px 0", color: "#2c3e50", fontSize: "14px", fontWeight: "500", lineHeight: "1.4" }}>
        Are you sure you want to close invoice <strong style={{ color: "#e74c3c" }}>#{billId}</strong>? This action updates system balances.
      </p>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
        <button
          style={{
            background: "none",
            border: "none",
            color: "#7f8c8d",
            fontWeight: "600",
            cursor: "pointer",
            padding: "6px 10px",
            fontSize: "13px"
          }}
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          style={{
            background: "#e74c3c",
            border: "none",
            color: "#ffffff",
            fontWeight: "600",
            borderRadius: "4px",
            padding: "6px 14px",
            cursor: "pointer",
            fontSize: "13px"
          }}
          onClick={onConfirm}
        >
          Confirm Close
        </button>
      </div>
    </div>
  );
};

export default function StaffManageBills() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchId, setSearchId] = useState("");
  const [selectedBill, setSelectedBill] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [closingBill, setClosingBill] = useState(false);

  const isBillOpen = (bill) => {
    const status = String(bill?.status ?? bill?.Status ?? "").toLowerCase();
    return status === "open";
  };

  const getBillId = (bill) => bill?.id ?? bill?.Id;
  const getPatientId = (bill) => bill?.patientId ?? bill?.PatientId;

  useEffect(() => {
    fetchAllBills();
  }, []);

  // GET: /api/Bill
  const fetchAllBills = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await axiosInstance.get("/api/Bill");
      let data = res.data;
      if (data?.$values) data = data.$values;
      setBills(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load patient bills.");
    } finally {
      if (!silent) setLoading(false);
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
      if (Array.isArray(data)) data = data;
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

  const executeBillClosure = async (billId, patientId) => {
    setClosingBill(true);
    try {
   
      const res = await axiosInstance.put(
        `/api/Bill/CloseBill/${billId}`,
        null, 
        {
          params: {
            patientId: patientId 
          }
        }
      );
      
      let updatedBill = res.data;
      if (updatedBill?.$values) updatedBill = updatedBill.$values;
      if (Array.isArray(updatedBill)) updatedBill = updatedBill;

      toast.success(`Bill #${billId} closed successfully!`);
      
      setSelectedBill((prev) => (prev && getBillId(prev) === billId ? updatedBill : prev));
      
      setBills((prevBills) =>
        prevBills.map((b) => (getBillId(b) === billId ? updatedBill : b))
      );
      
      await fetchAllBills(true);
    } catch (err) {
      console.error(err);
      const message =
        typeof err.response?.data === "string"
          ? err.response.data
          : err.response?.data?.message || "Failed to close bill.";
      toast.error(message);
    } finally {
      setClosingBill(false);
    }
  };

  const handleCloseBill = (bill) => {
    const billId = getBillId(bill);
    const patientId = getPatientId(bill);

    if (!billId || !patientId) {
      toast.error("Missing required bill or patient identification records.");
      return;
    }

    if (!isBillOpen(bill)) {
      toast.info("This invoice is already closed.");
      return;
    }

    toast(
      ({ closeToast }) => (
        <ConfirmToastContent
          billId={billId}
          onCancel={closeToast}
          onConfirm={() => {
            executeBillClosure(billId, patientId);
            closeToast();
          }}
        />
      ),
      {
        position: "top-center",
        autoClose: false,
        closeOnClick: false,
        draggable: false,
        closeButton: true,
      }
    );
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
              {bills.map((bill) => {
                const bId = getBillId(bill);
                const bStatus = bill?.status ?? bill?.Status ?? "";
                const startDate = bill?.st_Date ?? bill?.st_date;
                const endDate = bill?.end_Date ?? bill?.end_date;
                return (
                  <tr key={bId}>
                    <td className="bill-id-col">#{bId}</td>
                    <td className="patient-name-col">{bill?.patientName ?? bill?.PatientName ?? "Unknown"}</td>
                    <td>
                      <span className={`db-status-badge ${bStatus.toLowerCase()}`}>
                        {bStatus}
                      </span>
                    </td>
                    <td>{startDate ? new Date(startDate).toLocaleDateString() : "-"}</td>
                    <td>{endDate ? new Date(endDate).toLocaleDateString() : "Active"}</td>
                    <td className="bill-amount-col">
                      {bill?.totalAmount ?? bill?.TotalAmount ?? 0} {bill?.currency ?? bill?.Currency ?? "EGP"}
                    </td>
                    <td className="bill-actions-col">
                      <button onClick={() => handleOpenDetails(bId)} className="table-details-btn">
                        View details
                      </button>
                      {isBillOpen(bill) && (
                        <button
                          onClick={() => handleCloseBill(bill)}
                          className="table-close-bill-btn"
                          disabled={closingBill}
                        >
                          Close Patient Invoice
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Details Modal */}
      {selectedBill && (
        <div className="modal-backdrop" onClick={() => setSelectedBill(null)}>
          <div className="bill-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Detailed Invoice #{getBillId(selectedBill)}</h3>
              <button className="close-modal-btn" onClick={() => setSelectedBill(null)}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="modal-info-grid">
                <div className="info-block">
                  <span className="info-lbl">Patient Name</span>
                  <p className="info-val">{selectedBill?.patientName ?? selectedBill?.PatientName ?? "Unknown"}</p>
                </div>
                <div className="info-block">
                  <span className="info-lbl">Status</span>
                  <p>
                    <span className={`db-status-badge ${String(selectedBill?.status ?? selectedBill?.Status ?? "").toLowerCase()}`}>
                      {selectedBill?.status ?? selectedBill?.Status}
                    </span>
                  </p>
                </div>
                <div className="info-block">
                  <span className="info-lbl">Date Initiated</span>
                  <p className="info-val">
                    {selectedBill?.st_Date || selectedBill?.st_date ? new Date(selectedBill?.st_Date || selectedBill?.st_date).toLocaleString() : "N/A"}
                  </p>
                </div>
                <div className="info-block">
                  <span className="info-lbl">Date Closed</span>
                  <p className="info-val">
                    {selectedBill?.end_Date || selectedBill?.end_date ? new Date(selectedBill?.end_Date || selectedBill?.end_date).toLocaleString() : "Active (In Treatment)"}
                  </p>
                </div>
              </div>

              <div className="treatment-details-section">
                <span className="info-lbl">Treatment History / Itemized Notes</span>
                <div className="treatment-notes">
                  {selectedBill?.details || selectedBill?.Details ? (
                    <p className="treatment-text">{selectedBill?.details || selectedBill?.Details}</p>
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
                  {selectedBill?.totalAmount ?? selectedBill?.TotalAmount} <span className="curr">{selectedBill?.currency ?? "EGP"}</span>
                </div>
              </div>
            </div>

            <div className="modal-actions-row">
              {isBillOpen(selectedBill) && (
                <button
                  onClick={() => handleCloseBill(selectedBill)}
                  className="action-btn close-bill-btn"
                  disabled={closingBill}
                >
                  {closingBill ? "Calculating..." : "Close Bill & Calculate"}
                </button>
              )}
              <button onClick={() => setSelectedBill(null)} className="action-btn close-btn-bottom">
                Dismiss
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