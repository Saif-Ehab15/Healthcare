import React, { useState, useEffect } from "react";
import styles from "./StaffCRUD.module.css";
import axiosInstance from "../../../Config/axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const PHONE_REGEX = /^(010|011|012|015)\d{8}$/;

function formatDateInput(val) {
  if (val == null || val === "") return "";
  if (typeof val === "string") return val.slice(0, 10);
  return "";
}

function formatTimeLabel(t) {
  if (t == null || t === "") return "—";
  if (typeof t === "string") return t.length >= 5 ? t.slice(0, 5) : t;
  return String(t);
}

function workPanelKeyFor(member) {
  return `${member.role}:${member.id}`;
}

function getDoctorImageSrc(image) {
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
}

const normalizePerson = (s, role, i) => ({
  id: s.id ?? s.userId ?? s.staffId ?? s.nurseId ?? i,
  role,
  username: (s.name ?? s.username ?? "Unknown").trim(),
  email: s.email ?? "",
  phone: s.phone ?? s.phoneNumber ?? "",
  university: s.university ?? "",
  departmentId: s.departmentId ?? "",
  dateOfBirth: s.dateOfBirth ?? "",
  image: s.image ?? s.imageUrl ?? null,
  imagePreview: null,
});

export default function StaffCRUD() {

  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editingRole, setEditingRole] = useState(null);
  const [addRole, setAddRole] = useState("staff");

  const fetchStaffAndNurses = async () => {
    try {
      setLoading(true);
      const [staffRes, nursesRes] = await Promise.all([
        axiosInstance.get("/api/Accounts/GetStaff").catch((e) => {
          console.error("Failed to fetch staff:", e);
          if (e.response?.status === 403) {
            toast.error(
              "Cannot load staff: this endpoint requires an Admin or SubAdmin account. Nurses may still appear if that API is open."
            );
          }
          return { data: [] };
        }),
        axiosInstance.get("/api/Accounts/GetNurses").catch((e) => {
          console.error("Failed to fetch nurses:", e);
          return { data: [] };
        }),
      ]);

      const staffFromApi = Array.isArray(staffRes.data) ? staffRes.data : [];
      const nursesFromApi = Array.isArray(nursesRes.data) ? nursesRes.data : [];

      const normalizedStaff = staffFromApi.map((s, i) => normalizePerson(s, "staff", i));
      const normalizedNurses = nursesFromApi.map((n, i) =>
        normalizePerson(n, "nurse", i)
      );

      const merged = [...normalizedStaff, ...normalizedNurses].sort((a, b) =>
        a.username.localeCompare(b.username, undefined, { sensitivity: "base" })
      );
      setStaff(merged);
    } catch (error) {
      console.error("Failed to fetch staff/nurses:", error);
      setStaff([]);
    } finally {
      setLoading(false);
    }
  };

  const [newMember, setNewMember] = useState({
    username: "",
    email: "",
    password: "",
    phone: "",
    dateOfBirth: "",
    image: null,
    imagePreview: "",
    university: "",
    departmentId: ""
  });

  const [errors, setErrors] = useState({});

  const [assignments, setAssignments] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [roomsForWork, setRoomsForWork] = useState([]);
  const [workPanelKey, setWorkPanelKey] = useState(null);
  const [workForm, setWorkForm] = useState({
    roomId: "",
    shiftId: "",
    startDate: "",
    endDate: "",
    editingWorkId: null,
  });
  const [workSaving, setWorkSaving] = useState(false);

  const fetchAssignments = async () => {
    try {
      const res = await axiosInstance.get("/api/AssignWorks");
      setAssignments(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Failed to fetch assignments:", error);
      setAssignments([]);
    }
  };

  const fetchShifts = async () => {
    try {
      const res = await axiosInstance.get("/api/Shift");
      setShifts(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Failed to fetch shifts:", error);
      setShifts([]);
    }
  };

  const loadRoomsForDepartment = async (departmentId) => {
    const did = parseInt(String(departmentId), 10);
    if (!did || Number.isNaN(did)) {
      setRoomsForWork([]);
      return;
    }
    try {
      const res = await axiosInstance.get(`/api/Room/department/${did}/type`);
      setRoomsForWork(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Failed to fetch rooms:", error);
      setRoomsForWork([]);
    }
  };

  const openWorkPanel = async (member) => {
    if (member.role !== "nurse") return;
    const key = workPanelKeyFor(member);
    if (workPanelKey === key) {
      setWorkPanelKey(null);
      setRoomsForWork([]);
      return;
    }
    setWorkPanelKey(key);
    setWorkForm({
      roomId: "",
      shiftId: shifts[0]?.id != null ? String(shifts[0].id) : "",
      startDate: new Date().toISOString().slice(0, 10),
      endDate: "",
      editingWorkId: null,
    });
    await loadRoomsForDepartment(member.departmentId);
  };

  const startEditWork = (member, row) => {
    if (member.role !== "nurse") return;
    setWorkPanelKey(workPanelKeyFor(member));
    loadRoomsForDepartment(member.departmentId);
    setWorkForm({
      roomId: row.roomId != null ? String(row.roomId) : "",
      shiftId: row.shiftId != null ? String(row.shiftId) : "",
      startDate: formatDateInput(row.startDate),
      endDate: formatDateInput(row.endDate) || "",
      editingWorkId: row.id,
    });
  };

  const resetWorkFormForMember = (member) => {
    setWorkForm({
      roomId: "",
      shiftId: shifts[0]?.id != null ? String(shifts[0].id) : "",
      startDate: new Date().toISOString().slice(0, 10),
      endDate: "",
      editingWorkId: null,
    });
    if (member?.role === "nurse") loadRoomsForDepartment(member.departmentId);
  };

  const handleWorkSubmit = async (member) => {
    if (member.role !== "nurse") return;
    const roomId = parseInt(String(workForm.roomId), 10);
    const shiftId = parseInt(String(workForm.shiftId), 10);
    if (!roomId || Number.isNaN(roomId)) {
      toast.warn("Select a room");
      return;
    }
    if (!shiftId || Number.isNaN(shiftId)) {
      toast.warn("Select a shift");
      return;
    }
    if (!workForm.startDate) {
      toast.warn("Start date is required");
      return;
    }

    const payload = {
      roomId,
      doctorId: member.id,
      shiftId,
      startDate: workForm.startDate,
      endDate: workForm.endDate || null,
    };

    try {
      setWorkSaving(true);
      if (workForm.editingWorkId) {
        await axiosInstance.put(`/api/AssignWorks/${workForm.editingWorkId}`, payload);
        toast.success("Assignment updated");
      } else {
        await axiosInstance.post("/api/AssignWorks", payload);
        toast.success("Work assigned to nurse");
      }
      await fetchAssignments();
      resetWorkFormForMember(member);
    } catch (error) {
      console.error("Assign work error:", error);
      const msg =
        typeof error?.response?.data === "string"
          ? error.response.data
          : error?.response?.data?.message ||
            error?.response?.data?.title ||
            "Could not save assignment";
      toast.error(msg);
    } finally {
      setWorkSaving(false);
    }
  };

  const handleWorkDelete = async (assignmentId) => {
    const t = toast(
      <div>
        <p>Remove this room assignment?</p>
        <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
          <button
            type="button"
            style={{
              background: "#e74c3c",
              color: "white",
              padding: "5px 10px",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
            onClick={async () => {
              toast.dismiss(t);
              try {
                await axiosInstance.delete(`/api/AssignWorks/${assignmentId}`);
                toast.success("Assignment removed");
                await fetchAssignments();
                setWorkForm((prev) =>
                  prev.editingWorkId === assignmentId
                    ? { ...prev, editingWorkId: null }
                    : prev
                );
              } catch (error) {
                console.error(error);
                toast.error("Failed to remove assignment");
              }
            }}
          >
            Yes
          </button>
          <button
            type="button"
            style={{
              background: "#ccc",
              color: "black",
              padding: "5px 10px",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
            onClick={() => toast.dismiss(t)}
          >
            No
          </button>
        </div>
      </div>,
      { autoClose: false, closeOnClick: false, closeButton: false }
    );
  };

  useEffect(() => {
    fetchStaffAndNurses();
    fetchAssignments();
    fetchShifts();
  }, []);

  useEffect(() => {
    if (!editingId || editingRole !== "nurse") return;
    loadRoomsForDepartment(newMember.departmentId);
  }, [editingId, editingRole, newMember.departmentId]);

  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const validatePassword = (password) => {
    if (password.length < 9) return "Password must be at least 9 characters";
    if (!/[A-Z]/.test(password)) return "Must contain uppercase letter";
    if (!/[0-9]/.test(password)) return "Must contain number";
    if (!/[^A-Za-z0-9]/.test(password)) return "Must contain special character";
    return "";
  };

  const validateForm = () => {

    const newErrors = {};

    if (!newMember.username.trim())
      newErrors.username = "Username is required";

    if (!newMember.email.trim())
      newErrors.email = "Email is required";
    else if (!validateEmail(newMember.email))
      newErrors.email = "Invalid email format";

    if (!editingId) {
      if (!newMember.password.trim())
        newErrors.password = "Password is required";
      else {
        const p = validatePassword(newMember.password);
        if (p) newErrors.password = p;
      }
    } else if (newMember.password.trim()) {
      const p = validatePassword(newMember.password);
      if (p) newErrors.password = p;
    }

    if (!newMember.phone.trim())
      newErrors.phone = "Phone is required";
    else if (!PHONE_REGEX.test(newMember.phone))
      newErrors.phone = "Phone must be 11 digits and start with 010/011/012/015";

    if (!newMember.image && !editingId)
      newErrors.image = "Image required";

    if (!newMember.university.trim())
      newErrors.university = "University required";

    if (!newMember.departmentId)
      newErrors.departmentId = "Department required";

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
      imagePreview: "",
      university: "",
      departmentId: ""
    });

    setEditingId(null);
    setEditingRole(null);
    setErrors({});
    setWorkPanelKey(null);
    setRoomsForWork([]);
  };

  const handleAdd = async () => {

    if (!validateForm()) {
      toast.warn("Please fix the errors in the form");
      return;
    }

    try {

      const formData = new FormData();

      formData.append("Username", newMember.username);
      formData.append("Email", newMember.email);
      formData.append("Password", newMember.password);
      formData.append("Phone", newMember.phone);
      formData.append("DateOfBirth", newMember.dateOfBirth);
      formData.append("University", newMember.university);
      formData.append("DepartmentId", newMember.departmentId);
      formData.append("Image", newMember.image);

      const signupUrl =
        addRole === "nurse"
          ? "/api/Accounts/SignupAsNurse"
          : "/api/Accounts/SignupAsSatff";

      const response = await axiosInstance.post(signupUrl, formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });

      console.log("Member created:", response.data);

      toast.success(
        addRole === "nurse" ? "Nurse created successfully" : "Staff member created successfully"
      );
      await fetchStaffAndNurses();
      await fetchAssignments();
      resetForm();

    } catch (error) {
      console.error(error);
      toast.error(addRole === "nurse" ? "Failed to create nurse" : "Failed to create staff");
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
      formData.append("University", newMember.university);
      formData.append("DepartmentId", newMember.departmentId || 0);
      formData.append("DateOfBirth", newMember.dateOfBirth || "");

      if (newMember.image && newMember.image instanceof File) {
        formData.append("Image", newMember.image);
      }

      const updateUrl =
        editingRole === "nurse"
          ? "/api/Accounts/UpdateNurseProfile"
          : "/api/Accounts/UpdateStaffProfile";

      await axiosInstance.put(updateUrl, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      toast.success(
        editingRole === "nurse" ? "Nurse updated successfully" : "Staff updated successfully"
      );
      await fetchStaffAndNurses();
      await fetchAssignments();
      resetForm();
    } catch (error) {
      console.error("Update staff error:", error);
      toast.error(
        editingRole === "nurse" ? "Failed to update nurse" : "Failed to update staff"
      );
    }
  };

  const handleCancelEdit = () => {
    resetForm();
  };

  const handleEdit = (member) => {

    setEditingId(member.id);
    setEditingRole(member.role);
    setWorkPanelKey(null);
    setRoomsForWork([]);

    setNewMember({
      username: member.username,
      email: member.email,
      password: "",
      phone: member.phone,
      dateOfBirth: member.dateOfBirth || "",
      image: member.image,
      imagePreview:
        member.imagePreview ||
        getDoctorImageSrc(member.image) ||
        "",
      university: member.university,
      departmentId: member.departmentId
    });
  };

  const handleDelete = async (member) => {
    const roleLabel = member.role === "nurse" ? "nurse" : "staff member";
    const deletePath =
      member.role === "nurse"
        ? `/api/Accounts/nurse/${member.id}`
        : `/api/Accounts/staff/${member.id}`;

    const confirmToast = toast(
      <div>
        <p>Are you sure you want to remove this {roleLabel}?</p>
        <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
          <button
            style={{ background: "#e74c3c", color: "white", padding: "5px 10px", border: "none", borderRadius: "4px", cursor: "pointer" }}
            onClick={async () => {
              toast.dismiss(confirmToast);
              try {
                await axiosInstance.delete(deletePath);
                toast.success(member.role === "nurse" ? "Nurse removed" : "Staff member removed");
                await fetchStaffAndNurses();
                await fetchAssignments();
              } catch (error) {
                console.error("Delete error:", error);
                toast.error(
                  member.role === "nurse" ? "Failed to delete nurse" : "Failed to delete staff"
                );
              }
              if (editingId === member.id && editingRole === member.role) resetForm();
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

      setNewMember({
        ...newMember,
        image: file,
        imagePreview: preview
      });

    } else {

      setNewMember({
        ...newMember,
        [field]: value
      });

    }

    if (errors[field]) {
      setErrors({ ...errors, [field]: "" });
    }
  };

  return (
    <div className={styles.staffContainer}>

      <ToastContainer position="top-center" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick pauseOnHover draggable stacked />

      <h1 className={styles.header}>👩‍⚕️ Manage Staff & Nurses</h1>

      <div className={styles.formCard}>

        <h3 className={styles.formTitle}>
          {editingId
            ? editingRole === "nurse"
              ? "Edit Nurse"
              : "Edit Staff Member"
            : "Add Staff or Nurse"}
        </h3>

        {!editingId && (
          <div className={styles.rolePicker} role="group" aria-label="Account type">
            <span className={styles.rolePickerLabel}>Create as</span>
            <label className={styles.roleOption}>
              <input
                type="radio"
                name="addRole"
                checked={addRole === "staff"}
                onChange={() => setAddRole("staff")}
              />
              Staff
            </label>
            <label className={styles.roleOption}>
              <input
                type="radio"
                name="addRole"
                checked={addRole === "nurse"}
                onChange={() => setAddRole("nurse")}
              />
              Nurse
            </label>
          </div>
        )}

        {editingId && (
          <p className={styles.editingRoleHint}>
            Role: <strong>{editingRole === "nurse" ? "Nurse" : "Staff"}</strong> (cannot be changed here)
          </p>
        )}

        <div className={styles.formGrid}>

          <div className={styles.inputGroup}>
            <input
              className={`${styles.input} ${errors.username ? styles.inputError : ""}`}
              placeholder="eg: Ahmed *"
              value={newMember.username}
              onChange={(e) => handleInputChange("username", e.target.value)}
            />
            {errors.username && <span className={styles.errorText}>{errors.username}</span>}
          </div>

          <div className={styles.inputGroup}>
            <input
              className={`${styles.input} ${errors.email ? styles.inputError : ""}`}
              placeholder="Email@gmail.com *"
              value={newMember.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
            />
            {errors.email && <span className={styles.errorText}>{errors.email}</span>}
          </div>

          <div className={styles.inputGroup}>
            <input
              className={`${styles.input} ${errors.password ? styles.inputError : ""}`}
              type="password"
              placeholder="Password must be at least 9 chars with uppercase, number and symbol) *"
              value={newMember.password}
              onChange={(e) => handleInputChange("password", e.target.value)}
            />
            {errors.password && <span className={styles.errorText}>{errors.password}</span>}
          </div>

          <div className={styles.inputGroup}>
            <input
              className={`${styles.input} ${errors.phone ? styles.inputError : ""}`}
              placeholder="Phone (010|011|012|015) *"
              value={newMember.phone}

              inputMode="numeric"
              maxLength={11}

              onChange={(e) => {
                let value = e.target.value;

                value = value.replace(/\D/g, "");

                if (value.length > 11) return;

                handleInputChange("phone", value);
              }}

              onKeyDown={(e) => {
                if (
                  !/[0-9]/.test(e.key) &&
                  e.key !== "Backspace" &&
                  e.key !== "Delete" &&
                  e.key !== "ArrowLeft" &&
                  e.key !== "ArrowRight" &&
                  e.key !== "Tab"
                ) {
                  e.preventDefault();
                }
              }}
            />

            {errors.phone && (
              <span className={styles.errorText}>{errors.phone}</span>
            )}
          </div>

          <div className={styles.inputGroup}>
            <input
              className={`${styles.input} ${errors.university ? styles.inputError : ""}`}
              placeholder="eg: Helwan University *"
              value={newMember.university}
              onChange={(e) => handleInputChange("university", e.target.value)}
            />
            {errors.university && <span className={styles.errorText}>{errors.university}</span>}
          </div>

          <div className={styles.inputGroup}>
            <input
              className={`${styles.input} ${errors.departmentId ? styles.inputError : ""}`}
              type="number"
              placeholder="Department ID *"
              value={newMember.departmentId}
              onChange={(e) => handleInputChange("departmentId", e.target.value)}
            />
            {errors.departmentId && <span className={styles.errorText}>{errors.departmentId}</span>}
          </div>

          {editingId && editingRole === "nurse" && (
            <div className={styles.hospitalWorkSummary}>
              <p className={styles.workHint}>
                Room and shift assignments for this nurse appear below and on their card under{" "}
                <strong>Hospital assignments</strong>. Rooms must belong to the same department as the nurse.
              </p>
              {assignments.filter((a) => String(a.doctorId) === String(editingId)).length === 0 ? (
                <p className={styles.workEmpty}>
                  No assignments yet — use &quot;+ Assign work&quot; on the nurse card.
                </p>
              ) : (
                <ul className={styles.workReadonlyList}>
                  {assignments
                    .filter((a) => String(a.doctorId) === String(editingId))
                    .map((row) => (
                      <li key={row.id}>
                        Room {row.roomNumber ?? row.roomId} · Shift {formatTimeLabel(row.startTime)}–
                        {formatTimeLabel(row.endTime)} · {formatDateInput(row.startDate)}
                        {row.endDate ? ` → ${formatDateInput(row.endDate)}` : " (open-ended)"}
                      </li>
                    ))}
                </ul>
              )}
            </div>
          )}

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
              className={`${styles.input} ${errors.image ? styles.inputError : ""}`}
              onChange={(e) => handleInputChange("image", e.target.files[0])}
            />
            {errors.image && <span className={styles.errorText}>{errors.image}</span>}
          </div>

        </div>

        {editingId ? (
          <>
            <button className={styles.addButton} onClick={handleUpdate}>
              {editingRole === "nurse" ? "Update Nurse" : "Update Staff Member"}
            </button>

            <button
              className={styles.deleteButton}
              style={{ marginTop: "10px" }}
              onClick={handleCancelEdit}
            >
              Cancel Edit
            </button>
          </>
        ) : (
          <button className={styles.addButton} onClick={handleAdd}>
            {addRole === "nurse" ? "Add Nurse" : "Add Staff Member"}
          </button>
        )}

      </div>

      <div className={styles.staffGrid}>

        {loading && (
          <p className={styles.emptyState}>Loading staff and nurses…</p>
        )}

        {!loading && staff.length === 0 && (
          <p className={styles.emptyState}>No staff or nurses found.</p>
        )}

        {!loading &&
          staff.map((member) => {
            const avatarSrc =
              member.imagePreview || getDoctorImageSrc(member.image) || "";
            return (
          <div key={`${member.role}-${member.id}`} className={styles.staffCard}>

            <div className={styles.avatar}>
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt=""
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "50%",
                    objectFit: "cover"
                  }}
                />
              ) : (
                member.role === "nurse" ? "N" : "S"
              )}
            </div>

            <div className={styles.staffNameRow}>
              <h3 className={styles.staffName}>{member.username}</h3>
              <span
                className={
                  member.role === "nurse" ? styles.roleBadgeNurse : styles.roleBadgeStaff
                }
              >
                {member.role === "nurse" ? "Nurse" : "Staff"}
              </span>
            </div>

            {member.university ? (
              <div className={styles.staffUniversity}>{member.university}</div>
            ) : null}
            <div
              className={
                member.role === "nurse"
                  ? `${styles.staffEmail} ${styles.staffEmailBeforeWork}`
                  : styles.staffEmail
              }
            >
              {member.email}
            </div>

            {member.role === "nurse" && (
              <div className={styles.workSection}>
                <div className={styles.workSectionTitle}>Hospital assignments</div>
                {assignments.filter((a) => String(a.doctorId) === String(member.id)).length === 0 ? (
                  <p className={styles.workEmpty}>No room / shift assigned yet.</p>
                ) : (
                  <ul className={styles.workList}>
                    {assignments
                      .filter((a) => String(a.doctorId) === String(member.id))
                      .map((row) => (
                        <li key={row.id} className={styles.workListItem}>
                          <div>
                            <strong>Room {row.roomNumber ?? row.roomId}</strong>
                            <span className={styles.workMeta}>
                              {" "}
                              · Shift {formatTimeLabel(row.startTime)}–{formatTimeLabel(row.endTime)}
                              · {formatDateInput(row.startDate)}
                              {row.endDate ? ` → ${formatDateInput(row.endDate)}` : ""}
                            </span>
                          </div>
                          <div className={styles.workItemActions}>
                            <button
                              type="button"
                              className={styles.workItemBtn}
                              onClick={() => startEditWork(member, row)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className={styles.workItemBtnDanger}
                              onClick={() => handleWorkDelete(row.id)}
                            >
                              Remove
                            </button>
                          </div>
                        </li>
                      ))}
                  </ul>
                )}
                <button
                  type="button"
                  className={styles.assignWorkToggle}
                  onClick={() => openWorkPanel(member)}
                >
                  {workPanelKey === workPanelKeyFor(member)
                    ? "Close assignment form"
                    : "+ Assign work"}
                </button>
                {workPanelKey === workPanelKeyFor(member) && (
                  <div className={styles.workForm}>
                    <label className={styles.inputLabel}>Room</label>
                    <select
                      className={styles.selectInput}
                      value={workForm.roomId}
                      onChange={(e) =>
                        setWorkForm((p) => ({ ...p, roomId: e.target.value }))
                      }
                    >
                      <option value="">Select room</option>
                      {roomsForWork.map((r) => (
                        <option key={r.id} value={String(r.id)}>
                          #{r.number ?? r.roomNumber}
                          {r.departmentName ? ` (${r.departmentName})` : ""}
                          {r.roomType ? ` - ${r.roomType}` : (r.type ? ` - ${r.type}` : "")}
                        </option>
                      ))}
                    </select>
                    <label className={styles.inputLabel}>Shift</label>
                    <select
                      className={styles.selectInput}
                      value={workForm.shiftId}
                      onChange={(e) =>
                        setWorkForm((p) => ({ ...p, shiftId: e.target.value }))
                      }
                    >
                      <option value="">Select shift</option>
                      {shifts.map((s) => (
                        <option key={s.id} value={String(s.id)}>
                          {formatTimeLabel(s.startTime)} – {formatTimeLabel(s.endTime)}
                        </option>
                      ))}
                    </select>
                    <label className={styles.inputLabel}>Start date *</label>
                    <input
                      type="date"
                      className={styles.input}
                      value={workForm.startDate}
                      onChange={(e) =>
                        setWorkForm((p) => ({ ...p, startDate: e.target.value }))
                      }
                    />
                    <label className={styles.inputLabel}>End date (optional)</label>
                    <input
                      type="date"
                      className={styles.input}
                      value={workForm.endDate}
                      onChange={(e) =>
                        setWorkForm((p) => ({ ...p, endDate: e.target.value }))
                      }
                    />
                    <div className={styles.workFormActions}>
                      <button
                        type="button"
                        className={styles.workSaveBtn}
                        disabled={workSaving}
                        onClick={() => handleWorkSubmit(member)}
                      >
                        {workForm.editingWorkId ? "Update assignment" : "Save assignment"}
                      </button>
                      {workForm.editingWorkId && (
                        <button
                          type="button"
                          className={styles.workCancelBtn}
                          onClick={() => resetWorkFormForMember(member)}
                        >
                          Cancel edit
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              className={styles.deleteButton}
              onClick={() => handleDelete(member)}
            >
              {member.role === "nurse" ? "Remove Nurse" : "Remove Staff"}
            </button>

            <button
              className={styles.addButton}
              style={{ marginTop: "8px" }}
              onClick={() => handleEdit(member)}
            >
              {member.role === "nurse" ? "Edit Nurse" : "Edit Staff"}
            </button>

          </div>
            );
          })}

      </div>

    </div>
  );
}