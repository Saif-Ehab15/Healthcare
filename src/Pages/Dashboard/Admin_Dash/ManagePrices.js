import React, { useEffect, useMemo, useState } from "react";
import "./ManagePrices.css";
import axiosInstance from "../../../Config/axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const ROOM_TYPES = ["ICU", "Room", "Emergency", "HeartReservation", "KidneyReservation", "LiverReservation"];

const ADDITIONAL_SERVICES = ["HeartReservation", "KidneyReservation", "LiverReservation"];

const unwrapList = (data) => {
  if (data?.$values) return data.$values;
  return Array.isArray(data) ? data : [];
};

const getField = (item, ...keys) => {
  for (const key of keys) {
    if (item?.[key] !== undefined && item?.[key] !== null) return item[key];
  }
  return undefined;
};

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  // If date is invalid or a placeholder year (e.g., year 1), show dash
  if (Number.isNaN(date.getTime()) || date.getFullYear() === 1) return "—";
  return date.toLocaleDateString();
};

const isPriceActive = (price, today = new Date()) => {
  const deleted = getField(price, "is_Deleted", "isDeleted", "Is_Deleted");
  if (deleted) return false;

  const start = getField(price, "st_Date", "stDate", "St_Date");
  const end = getField(price, "end_Date", "endDate", "End_Date");
  if (!start) return false;

  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startDate = new Date(start);
  const startOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  if (startOnly > todayOnly) return false;

  if (!end) return true;
  const endDate = new Date(end);
  const endOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  return endOnly >= todayOnly;
};

const emptyForm = () => ({
  serviceName: "",
  price: "",
  st_Date: "",
  end_Date: "",
  roomType: "ICU",
  departmentId: "",
});

export default function ManagePrices() {
  const [prices, setPrices] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState("current");
  const [serviceFilter, setServiceFilter] = useState("");
  const [form, setForm] = useState(emptyForm());
  const [editingPrice, setEditingPrice] = useState(null);

  const fetchPrices = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const endpoint = viewMode === "current" ? "/api/Prices/current" : "/api/Prices";
      const res = await axiosInstance.get(endpoint);
      setPrices(unwrapList(res.data));
    } catch (err) {
      console.error(err);
      toast.error("Failed to load service prices.");
      setPrices([]);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await axiosInstance.get("/api/Department");
      const data = unwrapList(res.data);
      setDepartments(data);
      if (data.length > 0) {
        setForm((prev) => ({
          ...prev,
          departmentId: prev.departmentId || String(data[0].id),
          serviceName: prev.serviceName || buildServiceName(prev.roomType || "ICU", data[0].name),
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const buildServiceName = (roomType, departmentName) => `${roomType}${departmentName || ""}`;

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchPrices();
  }, [viewMode]);

  const serviceOptions = useMemo(() => {
    const fromPrices = prices.map((p) => getField(p, "serviceName", "ServiceName")).filter(Boolean);
    const fromDepartments = departments.flatMap((dept) =>
      ROOM_TYPES.map((type) => buildServiceName(type, dept.name))
    );
    const fromAdditional = ADDITIONAL_SERVICES;
    return [...new Set([...fromPrices, ...fromDepartments, ...fromAdditional])].sort();
  }, [prices, departments]);


  const filteredPrices = useMemo(() => {
    const query = serviceFilter.trim().toLowerCase();
    return prices
      .filter((price) => {
        if (!query) return true;
        const name = String(getField(price, "serviceName", "ServiceName") || "").toLowerCase();
        return name.includes(query);
      })
      .sort((a, b) => {
        const nameA = String(getField(a, "serviceName", "ServiceName") || "");
        const nameB = String(getField(b, "serviceName", "ServiceName") || "");
        if (nameA !== nameB) return nameA.localeCompare(nameB);
        const dateA = new Date(getField(a, "st_Date", "St_Date") || 0);
        const dateB = new Date(getField(b, "st_Date", "St_Date") || 0);
        return dateB - dateA;
      });
  }, [prices, serviceFilter]);

  const handleRoomTypeChange = (roomType) => {
    const dept = departments.find((d) => String(d.id) === String(form.departmentId));
    setForm((prev) => ({
      ...prev,
      roomType,
      serviceName: buildServiceName(roomType, dept?.name),
    }));
  };

  const handleDepartmentChange = (departmentId) => {
    const dept = departments.find((d) => String(d.id) === String(departmentId));
    setForm((prev) => ({
      ...prev,
      departmentId,
      serviceName: buildServiceName(prev.roomType, dept?.name),
    }));
  };

  const openCreateModal = () => {
    const defaultDept = departments[0];
    setForm({
      ...emptyForm(),
      departmentId: defaultDept ? String(defaultDept.id) : "",
      serviceName: defaultDept ? buildServiceName("ICU", defaultDept.name) : "",
    });
    setEditingPrice(null);
    setShowModal(true);
  };

  const openEditModal = (price) => {
    setEditingPrice(price);
    const serviceName = getField(price, "serviceName", "ServiceName") || "";
    let roomType = "ICU";
    if (serviceName.startsWith("Room")) {
      roomType = "Room";
    } else if (serviceName.startsWith("Emergency")) {
      roomType = "Emergency";
    }

    const suffix = serviceName.replace(roomType, "");
    const dept = departments.find((d) => d.name === suffix);

    const amount = getField(price, "price", "Price") || 0;
    const start = getField(price, "st_Date", "St_Date");
    const end = getField(price, "end_Date", "End_Date");

    setForm({
      serviceName,
      price: String(amount),
      st_Date: start ? new Date(start).toISOString().split("T")[0] : "",
      end_Date: end ? new Date(end).toISOString().split("T")[0] : "",
      roomType,
      departmentId: dept ? String(dept.id) : "",
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setForm(emptyForm());
    setEditingPrice(null);
  };

  const handleCreatePrice = async (e) => {
    e.preventDefault();

    const serviceName = form.serviceName.trim();
    const priceValue = Number(form.price);

    if (!serviceName) {
      toast.error("Service name is required.");
      return;
    }
    if (!Number.isFinite(priceValue) || priceValue < 0) {
      toast.error("Enter a valid price.");
      return;
    }
    if (priceValue > 99999999.99) {
      toast.error("Price cannot exceed 99,999,999.99.");
      return;
    }

    const payload = {
      serviceName,
      price: priceValue,
    };
    if (form.st_Date) payload.st_Date = form.st_Date;
    if (form.end_Date) payload.end_Date = form.end_Date;

    setSaving(true);
    try {
      if (editingPrice) {
        const id = getField(editingPrice, "id", "Id");
        await axiosInstance.put(`/api/Prices/${id}`, payload);
        toast.success(`Price for "${serviceName}" updated.`);
      } else {
        await axiosInstance.post("/api/Prices", payload);
        toast.success(`Price for "${serviceName}" saved.`);
      }
      closeModal();
      await fetchPrices(true);
    } catch (err) {
      console.error(err);
      const data = err.response?.data;
      const message =
        typeof data === "string"
          ? data
          : data?.title || data?.message || Object.values(data?.errors || {})?.flat?.()?.[0] || "Failed to save price.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePrice = async (price) => {
    const id = getField(price, "id", "Id");
    const serviceName = getField(price, "serviceName", "ServiceName");
    if (!id) return;

    if (!window.confirm(`Delete price record #${id} for "${serviceName}"?`)) return;

    try {
      await axiosInstance.delete(`/api/Prices/${id}`);
      toast.success("Price record deleted.");
      await fetchPrices(true);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data || "Failed to delete price.");
    }
  };

  return (
    <div className="manage-prices-container">
      <ToastContainer position="top-center" autoClose={3000} theme="dark" stacked />

      <div className="manage-prices-header">
        <div>
          <h1 className="dashboard-title">Manage Service Prices</h1>
          <p className="dashboard-subtitle">
            Set hourly rates for ICU, Room, and Emergency services. Prices apply by service name and date range.
          </p>
        </div>
        <button type="button" className="action-btn add-price-btn" onClick={openCreateModal}>
          Add Price
        </button>
      </div>

      <div className="controls-row">
        <div className="view-toggle">
          <button
            type="button"
            className={`toggle-btn ${viewMode === "current" ? "active" : ""}`}
            onClick={() => setViewMode("current")}
          >
            Current Prices
          </button>
          <button
            type="button"
            className={`toggle-btn ${viewMode === "all" ? "active" : ""}`}
            onClick={() => setViewMode("all")}
          >
            All Records
          </button>
        </div>

        <div className="price-filter-form">
          <button type="button" className="action-btn refresh-btn" onClick={() => fetchPrices()}>
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="dashboard-loading">
          <div className="db-spinner" />
          <p>Loading service prices...</p>
        </div>
      ) : filteredPrices.length === 0 ? (
        <div className="empty-prices-card">
          <p>No price records found. Add a price to get started.</p>
        </div>
      ) : (
        <div className="prices-table-wrapper">
          <table className="prices-db-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Service</th>
                <th>Price / hour</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPrices.map((price) => {
                const id = getField(price, "id", "Id");
                const serviceName = getField(price, "serviceName", "ServiceName");
                const amount = getField(price, "price", "Price");
                const deleted = getField(price, "is_Deleted", "isDeleted", "Is_Deleted");
                const active = isPriceActive(price);

                return (
                  <tr key={id}>
                    <td className="price-id-col">#{id}</td>
                    <td className="service-name-col">{serviceName}</td>
                    <td className="price-amount-col">{Number(amount).toLocaleString()} EGP</td>
                    <td>{formatDate(getField(price, "st_Date", "St_Date"))}</td>
                    <td>{formatDate(getField(price, "end_Date", "End_Date"))}</td>
                    <td>
                      <span
                        className={`price-status-badge ${deleted ? "deleted" : active ? "active" : "scheduled"
                          }`}
                      >
                        {deleted ? "Deleted" : active ? "Active" : "Scheduled"}
                      </span>
                    </td>
                    <td>
                      {!deleted && (
                        <div className="table-actions-cell">
                          <button
                            type="button"
                            className="table-edit-btn"
                            onClick={() => openEditModal(price)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="table-delete-btn"
                            onClick={() => handleDeletePrice(price)}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="price-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingPrice ? "Edit Service Price" : "Add Service Price"}</h3>
              <button type="button" className="close-modal-btn" onClick={closeModal}>
                ×
              </button>
            </div>

            <form onSubmit={handleCreatePrice} className="price-form">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Room / service type</label>
                  <select
                    className="form-input"
                    value={form.roomType}
                    onChange={(e) => handleRoomTypeChange(e.target.value)}
                  >
                    {ROOM_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <select
                    className="form-input"
                    value={form.departmentId}
                    onChange={(e) => handleDepartmentChange(e.target.value)}
                    required
                  >
                    <option value="" disabled>
                      Select department
                    </option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Service name</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.serviceName}
                  onChange={(e) => setForm((prev) => ({ ...prev, serviceName: e.target.value }))}
                  placeholder="e.g. ICUHeart"
                  required
                />
                <p className="form-hint">Billing uses RoomType + DepartmentName (e.g. ICUHeart, RoomLiver).</p>
              </div>

              <div className="form-group">
                <label className="form-label">Price per hour (EGP)</label>
                <input
                  type="number"
                  className="form-input"
                  min="0"
                  max="99999999.99"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Start date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={form.st_Date}
                    onChange={(e) => setForm((prev) => ({ ...prev, st_Date: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">End date (optional)</label>
                  <input
                    type="date"
                    className="form-input"
                    value={form.end_Date}
                    onChange={(e) => setForm((prev) => ({ ...prev, end_Date: e.target.value }))}
                  />
                </div>
              </div>

              <div className="modal-actions-row">
                <button type="submit" className="action-btn save-price-btn" disabled={saving}>
                  {saving ? "Saving..." : editingPrice ? "Update Price" : "Save Price"}
                </button>
                <button type="button" className="action-btn cancel-btn" onClick={closeModal}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
