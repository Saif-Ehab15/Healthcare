import React, { useState, useEffect, useRef } from "react";
import styles from "./SubAdmin.module.css";
import axiosInstance from "../../../Config/axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const PHONE_REGEX = /^(010|011|012|015)\d{8}$/;

export default function SubAdmin() {
  const [subAdmins, setSubAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);

  // Fetch subadmins from API on mount
  const fetchSubAdmins = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/api/Accounts/GetSubAdmins");
      const data = Array.isArray(res.data) ? res.data : [];
      const normalized = data.map((s, i) => ({
        id: s.id ?? s.subAdminId ?? i,
        username: (s.name ?? s.username ?? "Unknown").trim(),
        email: s.email ?? "",
        phone: s.phone ?? s.phoneNumber ?? "",
        dateOfBirth: s.dateOfBirth ?? "",
        image: s.image ?? s.imageUrl ?? null,
      }));
      setSubAdmins(normalized);
    } catch (error) {
      console.error("Failed to fetch subadmins:", error);
      setSubAdmins([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubAdmins();
  }, []);
  const fileInputRef = useRef(null);

  const [newMember, setNewMember] = useState({
    username: "",
    email: "",
    password: "",
    phone: "",
    dateOfBirth: "",
    image: null,
    imagePreview: ""
  });

  const [errors, setErrors] = useState({});

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validatePassword = (password) => {
    if (password.length < 9) return "Passwords must be at least 9 characters.";
    if (!/[A-Z]/.test(password)) return "Passwords must have at least one uppercase (A-Z).";
    if (!/[0-9]/.test(password)) return "Passwords must have at least one digit (0-9).";
    if (!/[^A-Za-z0-9]/.test(password)) return "Passwords must have at least one special character.";
    return "";
  };

  const validateForm = () => {
    const newErrors = {};
    if (!newMember.username.trim()) newErrors.username = "Username is required *";
    if (!newMember.email.trim()) newErrors.email = "Email is required *";
    else if (!validateEmail(newMember.email)) newErrors.email = "Invalid email format";
    if (!newMember.password.trim()) newErrors.password = "Password is required *";
    else {
      const p = validatePassword(newMember.password);
      if (p) newErrors.password = p;
    }
    if (!newMember.phone.trim()) newErrors.phone = "Phone is required *";
    else if (!PHONE_REGEX.test(newMember.phone))
      newErrors.phone = "Phone must be 11 digits and start with 010/011/012/015";
    if (!newMember.image && !editingId) newErrors.image = "Image is required *";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setNewMember({
      username: "",
      email: "",
      password: "",
      phone: "",
      dateOfBirth: "",
      image: null,
      imagePreview: ""
    });
    setEditingId(null);
    setErrors({});
    if (fileInputRef.current) fileInputRef.current.value = null;
  };

  const handleAdd = async () => {
    if (!validateForm()) {
      toast.warn("Please fix the errors in the form");
      return;
    }

    // إنشاء FormData للـ multipart/form-data
    const formData = new FormData();
    formData.append("username", newMember.username);
    formData.append("email", newMember.email);
    formData.append("password", newMember.password);
    formData.append("phone", newMember.phone);
    formData.append("DateOfBirth", newMember.dateOfBirth);
    if (newMember.image) formData.append("image", newMember.image);

    try {
      const response = await axiosInstance.post("/api/Accounts/SignUpSubAdmin", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success("SubAdmin added successfully");
      await fetchSubAdmins();
      resetForm();
      console.log("API response:", response.data);

    } catch (error) {
      console.error("Failed to add SubAdmin:", error);
      toast.error("Failed to add SubAdmin");
    }
  };

  const handleUpdate = async () => {
    if (!validateForm()) {
      toast.warn("Please correct the highlighted errors");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("Id", editingId);
      formData.append("Name", newMember.username);
      formData.append("Email", newMember.email);
      formData.append("Phone", newMember.phone);
      formData.append("DateOfBirth", newMember.dateOfBirth || "");

      if (newMember.image && newMember.image instanceof File) {
        formData.append("Image", newMember.image);
      }

      await axiosInstance.put("/api/Accounts/UpdateAdminProfile", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      toast.success("SubAdmin updated successfully");
      await fetchSubAdmins();
      resetForm();
    } catch (error) {
      console.error("Update subadmin error:", error);
      toast.error("Failed to update SubAdmin");
    }
  };

  const handleCancelEdit = () => resetForm();

  const handleEdit = (member) => {
    setEditingId(member.id);
    setNewMember({
      username: member.username,
      email: member.email,
      password: member.password,
      phone: member.phone,
      dateOfBirth: member.dateOfBirth || "",
      image: member.image,
      imagePreview: member.imagePreview
    });
  };

  const handleDelete = async (id) => {
    const confirmToast = toast(
      <div>
        <p>Are you sure you want to remove this SubAdmin?</p>
        <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
          <button
            style={{ background: "#e74c3c", color: "white", padding: "5px 10px", border: "none", borderRadius: "4px", cursor: "pointer" }}
            onClick={async () => {
              toast.dismiss(confirmToast);
              try {
                await axiosInstance.delete(`/api/Accounts/subadmin/${id}`);
                toast.success("SubAdmin removed");
                await fetchSubAdmins();
              } catch (error) {
                console.error("Delete subadmin error:", error);
                toast.error("Failed to delete SubAdmin");
              }
              if (editingId === id) resetForm();
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

  const handleInputChange = (field, value) => {
    if (field === "image") {
      const file = value;
      const preview = URL.createObjectURL(file);
      setNewMember({ ...newMember, image: file, imagePreview: preview });
    } else if (field === "phone") {
      const digitsOnly = value.replace(/\D/g, "").slice(0, 11);
      setNewMember({ ...newMember, [field]: digitsOnly });
    } else {
      setNewMember({ ...newMember, [field]: value });
    }
    if (errors[field]) setErrors({ ...errors, [field]: "" });
  };

  return (
    <div className={styles.SubAdminContainer}>
      <ToastContainer position="top-center" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick pauseOnHover draggable stacked />

      <h1 className={styles.header}>👨‍💼 Manage SubAdmins</h1>

      <div className={styles.formCard}>
        <h3 className={styles.formTitle}>
          {editingId ? "Edit SubAdmin" : "Add New SubAdmin"}
        </h3>

        <div className={styles.formGrid}>
          <div className={styles.inputGroup}>
            <input
              className={`${styles.input} ${errors.username ? styles.inputError : ""}`}
              placeholder="Username *"
              value={newMember.username}
              onChange={(e) => handleInputChange("username", e.target.value)}
            />
            {errors.username && <span className={styles.errorText}>{errors.username}</span>}
          </div>

          <div className={styles.inputGroup}>
            <input
              className={`${styles.input} ${errors.email ? styles.inputError : ""}`}
              placeholder="Email *"
              value={newMember.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
            />
            {errors.email && <span className={styles.errorText}>{errors.email}</span>}
          </div>

          <div className={styles.inputGroup}>
            <input
              className={`${styles.input} ${errors.password ? styles.inputError : ""}`}
              type="password"
              placeholder="Password *"
              value={newMember.password}
              onChange={(e) => handleInputChange("password", e.target.value)}
            />
            {errors.password && <span className={styles.errorText}>{errors.password}</span>}
          </div>

          <div className={styles.inputGroup}>
            <input
              className={`${styles.input} ${errors.phone ? styles.inputError : ""}`}
              placeholder="Phone (010xxxxxxxx) *"
              value={newMember.phone}
              onChange={(e) => handleInputChange("phone", e.target.value)}
            />
            {errors.phone && <span className={styles.errorText}>{errors.phone}</span>}
          </div>

          <div className={styles.inputGroup}>
            <input
              type="date"
              className={styles.input}
              value={newMember.dateOfBirth}
              onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
            />
          </div>

          <div className={styles.inputGroup}>
            <input
              type="file"
              ref={fileInputRef}
              className={`${styles.input} ${errors.image ? styles.inputError : ""}`}
              onChange={(e) => handleInputChange("image", e.target.files[0])}
            />
            {errors.image && <span className={styles.errorText}>{errors.image}</span>}
          </div>
        </div>

        {editingId ? (
          <>
            <button className={styles.addButton} onClick={handleUpdate}>Update SubAdmin</button>
            <button className={styles.deleteButton} style={{ marginTop: "10px" }} onClick={handleCancelEdit}>Cancel Edit</button>
          </>
        ) : (
          <button className={styles.addButton} onClick={handleAdd}>Add SubAdmin</button>
        )}
      </div>

      <div className={styles.subAdminGrid}>
        {subAdmins.map((member) => (
          <div key={member.id} className={styles.subAdminCard}>
            <div className={styles.avatar}>
              {member.imagePreview && <img src={member.imagePreview} alt="subadmin" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />}
            </div>

            <h3 className={styles.subAdminName}>{member.username}</h3>
            <div className={styles.subAdminEmail}>{member.email}</div>

            <button className={styles.deleteButton} onClick={() => handleDelete(member.id)}>Remove SubAdmin</button>
            <button className={styles.addButton} style={{ marginTop: "8px" }} onClick={() => handleEdit(member)}>Edit SubAdmin</button>
          </div>
        ))}
      </div>
    </div>
  );
}