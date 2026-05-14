import React, { useState, useEffect } from "react";
import styles from "./Departments.module.css";
import axiosInstance from "../../../Config/axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function Departments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newDept, setNewDept] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");

  // Fetch departments from API
  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/api/Department");
      const data = Array.isArray(res.data) ? res.data : [];
      setDepartments(data);
    } catch (error) {
      console.error("Failed to fetch departments:", error);
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  // Add department
  const handleAdd = async () => {
    if (!newDept.trim()) return;

    try {
      await axiosInstance.post("/api/Department", { name: newDept });
      toast.success("Department added successfully");
      setNewDept("");
      await fetchDepartments();
    } catch (error) {
      console.error("Add department error:", error);
      toast.error(error?.response?.data?.message || "Failed to add department");
    }
  };

  // Update department
  const handleUpdate = async (id) => {
    if (!editName.trim()) return;

    try {
      await axiosInstance.put(`/api/Department/${id}`, { name: editName });
      toast.success("Department updated successfully");
      setEditingId(null);
      setEditName("");
      await fetchDepartments();
    } catch (error) {
      console.error("Update department error:", error);
      toast.error(error?.response?.data?.message || "Failed to update department");
    }
  };

  // Delete department
  const handleDelete = async (id) => {
    const confirmToast = toast(
      <div>
        <p>Are you sure you want to delete this department?</p>
        <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
          <button
            style={{ background: "#e74c3c", color: "white", padding: "5px 10px", border: "none", borderRadius: "4px", cursor: "pointer" }}
            onClick={async () => {
              toast.dismiss(confirmToast);
              try {
                await axiosInstance.delete(`/api/Department/${id}`);
                toast.success("Department deleted successfully");
                await fetchDepartments();
              } catch (error) {
                console.error("Delete department error:", error);
                toast.error(error?.response?.data?.message || "Failed to delete department");
              }
            }}
          >Yes</button>
          <button
            style={{ background: "#ccc", color: "black", padding: "5px 10px", border: "none", borderRadius: "4px", cursor: "pointer" }}
            onClick={() => toast.dismiss(confirmToast)}
          >No</button>
        </div>
      </div>,
      { autoClose: false, closeOnClick: false, closeButton: false }
    );
  };

  const startEdit = (dept) => {
    setEditingId(dept.id);
    setEditName(dept.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleAdd();
  };

  const handleEditKeyPress = (e, id) => {
    if (e.key === "Enter") handleUpdate(id);
    if (e.key === "Escape") cancelEdit();
  };

  return (
    <div className={styles.departmentsContainer}>
      <ToastContainer position="top-center" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick pauseOnHover draggable stacked />

      <h1 className={styles.header}>🏥 Manage Departments</h1>

      <div className={styles.addCard}>
        <div className={styles.inputGroup}>
          <input
            className={styles.input}
            placeholder="Enter department name..."
            value={newDept}
            onChange={(e) => setNewDept(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <button className={styles.addButton} onClick={handleAdd}>
            Add Department
          </button>
        </div>
      </div>

      {loading ? (
        <div className={styles.emptyState}>Loading departments...</div>
      ) : departments.length === 0 ? (
        <div className={styles.emptyState}>
          No departments added yet. Start by adding a new department above.
        </div>
      ) : (
        <div className={styles.departmentsGrid}>
          {departments.map((dept) => (
            <div key={dept.id} className={styles.departmentCard}>
              {editingId === dept.id ? (
                <>
                  <input
                    className={styles.input}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => handleEditKeyPress(e, dept.id)}
                    autoFocus
                  />
                  <button className={styles.addButton} onClick={() => handleUpdate(dept.id)}>
                    Save
                  </button>
                  <button className={styles.deleteButton} style={{ marginTop: "6px" }} onClick={cancelEdit}>
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <div className={styles.departmentName}>{dept.name}</div>
                  <button className={styles.addButton} onClick={() => startEdit(dept)}>
                    Edit
                  </button>
                  <button className={styles.deleteButton} style={{ marginTop: "6px" }} onClick={() => handleDelete(dept.id)}>
                    Delete Department
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}