import React, { useState, useEffect, useMemo } from "react";
import styles from "./ManageDoctors.module.css";
import axiosInstance from "../../../Config/axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const PHONE_REGEX = /^(010|011|012|015)\d{8}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{9,}$/;

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

export default function ManageDoctors() {

  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/api/Accounts/GetDoctors");
      const doctorsFromApi = Array.isArray(res.data) ? res.data : [];

      const normalizedDoctors = doctorsFromApi.map((doctor, index) => ({
        id: doctor.id ?? doctor.doctorId ?? index,
        username: (doctor.doctorName ?? doctor.name ?? doctor.username ?? "Unknown").trim(),
        email: doctor.email ?? "",
        phone: doctor.phone ?? doctor.phoneNumber ?? "",
        degree: doctor.degree ?? "",
        university: doctor.university ?? "",
        departmentId: doctor.departmentId ?? doctor.department ?? "",
        department: doctor.departmentName ?? doctor.department ?? "",
        dateOfBirth: doctor.dateOfBirth ?? "",
        image: doctor.image ?? doctor.imageUrl ?? null,
      }));

      setDoctors(normalizedDoctors);
    } catch (error) {
      console.error("Failed to fetch doctors:", error);
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  };

  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    username: "",
    degree: "",
    phone: "",
    email: "",
    password: "",
    university: "",
    Rank: 0,
    departmentId: 1,
    dateOfBirth: "",
    image: null
  });

  const [errors, setErrors] = useState({});
  const [editingId, setEditingId] = useState(null);

  const [assignments, setAssignments] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [roomsForWork, setRoomsForWork] = useState([]);
  const [workPanelDoctorId, setWorkPanelDoctorId] = useState(null);
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

  const openWorkPanel = async (doc) => {
    if (workPanelDoctorId === doc.id) {
      setWorkPanelDoctorId(null);
      setRoomsForWork([]);
      return;
    }
    setWorkPanelDoctorId(doc.id);
    setWorkForm({
      roomId: "",
      shiftId: shifts[0]?.id != null ? String(shifts[0].id) : "",
      startDate: new Date().toISOString().slice(0, 10),
      endDate: "",
      editingWorkId: null,
    });
    await loadRoomsForDepartment(doc.departmentId);
  };

  const startEditWork = (doc, row) => {
    setWorkPanelDoctorId(doc.id);
    loadRoomsForDepartment(doc.departmentId);
    setWorkForm({
      roomId: row.roomId != null ? String(row.roomId) : "",
      shiftId: row.shiftId != null ? String(row.shiftId) : "",
      startDate: formatDateInput(row.startDate),
      endDate: formatDateInput(row.endDate) || "",
      editingWorkId: row.id,
    });
  };

  const resetWorkForm = (doc) => {
    setWorkForm({
      roomId: "",
      shiftId: shifts[0]?.id ? String(shifts[0].id) : "",
      startDate: new Date().toISOString().slice(0, 10),
      endDate: "",
      editingWorkId: null,
    });
    if (doc) loadRoomsForDepartment(doc.departmentId);
  };

  const handleWorkSubmit = async (doc) => {
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
      doctorId: doc.id,
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
        toast.success("Work assigned to doctor");
      }
      await fetchAssignments();
      resetWorkForm(doc);
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
    fetchDoctors();
    fetchAssignments();
    fetchShifts();
  }, []);

  useEffect(() => {
    if (!editingId) return;
    const dept = doctors.find((d) => d.id === editingId)?.departmentId;
    loadRoomsForDepartment(dept ?? "");
  }, [editingId, doctors]);

  // validation
  const validate = (values = form) => {

    const e = {};

    if (!values.username.trim())
      e.username = "Full name is required";


    if (!EMAIL_REGEX.test(values.email || ""))
      e.email = "Invalid email";

    if (!PHONE_REGEX.test(values.phone || ""))
      e.phone = "Egyptian phone required (11 digits)";

    if (!PASSWORD_REGEX.test(values.password || ""))
      e.password =
        "Password must be at least 9 chars with uppercase, number and symbol";

    return e;
  };

  // change
  const handleChange = (field, value) => {

    if (field === "phone")
      value = value.replace(/\D/g, "").slice(0, 11);

    setForm(prev => ({
      ...prev,
      [field]: value
    }));

    if (errors[field])
      setErrors(prev => ({
        ...prev,
        [field]: ""
      }));
  };

  // image upload
  const handleImageUpload = (file) => {

    if (!file) return;

    setForm(prev => ({
      ...prev,
      image: file
    }));
  };

  // reset
  const resetForm = () => {

    setForm({
      username: "",
      degree: "",
      phone: "",
      email: "",
      departmentId: "",
      password: "",
      dateOfBirth: "",
      image: null
    });

    setErrors({});
    setEditingId(null);
    setShowForm(false);
    setWorkPanelDoctorId(null);
    setRoomsForWork([]);
  };

  // save (create or update)
  const handleSave = async () => {

    const e = validate();
    setErrors(e);

    if (Object.keys(e).length) return;

    try {

      if (editingId) {
        // UPDATE existing doctor (backend expects [FromForm])
        const formData = new FormData();
        formData.append("Id", editingId);
        formData.append("Name", form.username);
        formData.append("Email", form.email);
        formData.append("Phone", form.phone);
        formData.append("University", form.university || "");
        formData.append("Degree", form.degree || "");
        formData.append("DateOfBirth", form.dateOfBirth || "");
        formData.append("DepartmentId", form.departmentId || 0);

        if (form.image && form.image instanceof File) {
          formData.append("Image", form.image);
        }

        await axiosInstance.put("/api/Accounts/UpdateDoctorProfile", formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });

        console.log("Doctor updated successfully");
        await fetchDoctors();
        await fetchAssignments();
        toast.success("Doctor updated successfully");

      } else {
        // CREATE new doctor
        const formData = new FormData();

        formData.append("username", form.username);
        formData.append("email", form.email);
        formData.append("Password", form.password);
        formData.append("Phone", form.phone);
        formData.append("University", form.university || "");
        formData.append("Degree", form.degree || "");
        formData.append("Rank", 0);
        formData.append("DepartmentId", form.departmentId || 0);
        formData.append("DateOfBirth", form.dateOfBirth || "");

        if (form.image) {
          formData.append("Image", form.image);
        }

        await axiosInstance.post(
          "/api/Accounts/SignupAsADoctor",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data"
            }
          }
        );

        console.log("Doctor created successfully");
        await fetchDoctors();
        await fetchAssignments();
        toast.success("Doctor added successfully");
      }

      resetForm();

    } catch (error) {

      console.error(editingId ? "Update doctor error:" : "Create doctor error:", error);

      toast.error(
        error?.response?.data?.message ||
        (editingId ? "Failed to update doctor" : "Failed to create doctor")
      );
    }
  };

  // edit
  const handleEdit = (doc) => {

    setForm({
      username: doc.username || "",
      email: doc.email || "",
      phone: doc.phone || "",
      password: doc.password || "",
      degree: doc.degree || "",
      university: doc.university || "",
      departmentId: doc.departmentId || "",
      department: doc.department || "",
      Rank: doc.Rank ?? 0,
      dateOfBirth: doc.dateOfBirth || "",
      image: doc.image || null,
    });

    setEditingId(doc.id);
    setErrors({});
    setShowForm(true);
    setWorkPanelDoctorId(null);
    setRoomsForWork([]);

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };

  // delete
  const handleDelete = async (id) => {
    const confirmToast = toast(
      <div>
        <p>Are you sure you want to remove this doctor?</p>
        <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
          <button
            style={{ background: "#e74c3c", color: "white", padding: "5px 10px", border: "none", borderRadius: "4px", cursor: "pointer" }}
            onClick={async () => {
              toast.dismiss(confirmToast);
              try {
                await axiosInstance.delete(`/api/Accounts/doctor/${id}`);
                console.log("Doctor deleted successfully");
                await fetchDoctors();
                await fetchAssignments();
                toast.success("Doctor deleted successfully");
              } catch (error) {
                console.error("Delete doctor error:", error);
                toast.error(
                  error?.response?.data?.message ||
                  "Failed to delete doctor"
                );
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

  // search
  const filtered = useMemo(() => {

    const q = searchTerm.trim().toLowerCase();

    if (!q) return doctors;

    return doctors.filter(d =>
      (d.username || "").toLowerCase().includes(q) ||
      (d.id && d.id.toString().includes(q))
    );

  }, [doctors, searchTerm]);

  // initials
  const getInitials = (name) => {
    return (name || "")
      .split(" ")
      .map(n => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  return (

    <div className={styles.adminsContainer}>
      <ToastContainer position="top-center" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick pauseOnHover draggable stacked />

      <div className={styles.headerSection}>
        <h1 className={styles.header}>🏥 Manage Doctors</h1>
        <p className={styles.subHeader}>
          Add, edit, and manage doctor profiles
        </p>
      </div>

      <div className={styles.actionBar}>

        <div className={styles.searchSection}>
          <input
            className={styles.searchInput}
            placeholder="Search by name, specialization, hospital, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button
          className={styles.toggleFormButton}
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "✕ Cancel" : "➕ Add New Doctor"}
        </button>

      </div>

      {showForm && (

        <div className={styles.formCard}>

          <div className={styles.formHeader}>
            <h3 className={styles.formTitle}>
              {editingId ? "✏️ Edit Doctor" : "👨‍⚕️ Add New Doctor"}
            </h3>

            <button
              onClick={resetForm}
              className={styles.clearButton}
            >
              Clear Form
            </button>
          </div>

          <div className={styles.formGrid}>

            <div className={styles.formSection}>

              <h4 className={styles.sectionTitle}>
                Personal Information
              </h4>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>
                  Full Name *
                </label>

                <input
                  className={`${styles.input} ${errors.username ? styles.inputError : ""}`}
                  placeholder="Dr. Ahmed Mohamed"
                  value={form.username}
                  onChange={(e) => handleChange("username", e.target.value)}
                />

                {errors.username &&
                  <div className={styles.errorText}>
                    {errors.username}
                  </div>}
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>
                  Doctor Image
                </label>

                <input
                  type="file"
                  accept="image/*"
                  className={styles.input}
                  onChange={(e) => handleImageUpload(e.target.files[0])}
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>
                  Phone Number *
                </label>

                <input
                  className={`${styles.input} ${errors.phone ? styles.inputError : ""}`}
                  placeholder="01012345678"
                  value={form.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                />

                {errors.phone &&
                  <div className={styles.errorText}>
                    {errors.phone}
                  </div>}
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>
                  Email Address *
                </label>

                <input
                  className={`${styles.input} ${errors.email ? styles.inputError : ""}`}
                  placeholder="doctor@hospital.com"
                  value={form.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                />

                {errors.email &&
                  <div className={styles.errorText}>
                    {errors.email}
                  </div>}
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>
                  Date of Birth
                </label>

                <input
                  type="date"
                  className={styles.input}
                  value={form.dateOfBirth}
                  onChange={(e) => handleChange("dateOfBirth", e.target.value)}
                />
              </div>


              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>
                  Password *
                </label>

                <input
                  type="password"
                  className={`${styles.input} ${errors.password ? styles.inputError : ""}`}
                  placeholder="Enter strong password"
                  value={form.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                />

                {errors.password &&
                  <div className={styles.errorText}>
                    {errors.password}
                  </div>}
              </div>



            </div>

            <div className={styles.formSection}>

              <h4 className={styles.sectionTitle}>
                Professional Information
              </h4>


              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>
                  University
                </label>

                <input
                  className={styles.input}
                  placeholder="Cairo University"
                  value={form.university}
                  onChange={(e) => handleChange("university", e.target.value)}
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>
                  Degree
                </label>

                <input
                  className={styles.input}
                  placeholder="MD, PhD, etc."
                  value={form.degree}
                  onChange={(e) => handleChange("degree", e.target.value)}
                />
              </div>

            </div>

            <div className={styles.formSection}>

              <h4 className={styles.sectionTitle}>
                Hospital Information
              </h4>



              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>
                  Department ID
                </label>

                <input
                  className={styles.input}
                  placeholder="1"
                  value={form.departmentId}
                  onChange={(e) => handleChange("departmentId", e.target.value)}
                />
              </div>

              {editingId && (
                <div className={styles.hospitalWorkSummary}>
                  <p className={styles.workHint}>
                    Room and shift assignments for this doctor appear below and on their card under{" "}
                    <strong>Hospital assignments</strong>. Rooms must belong to the same department as the doctor.
                  </p>
                  {assignments.filter((a) => String(a.doctorId) === String(editingId)).length === 0 ? (
                    <p className={styles.workEmpty}>No assignments yet — use &quot;+ Assign work&quot; on the doctor card.</p>
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

            </div>

          </div>

          <div className={styles.formActions}>
            <button
              className={styles.saveButton}
              onClick={handleSave}
            >
              {editingId ? "💾 Save Changes" : "👨‍⚕️ Add Doctor"}
            </button>
          </div>

        </div>

      )}

      <div className={styles.doctorsSection}>

        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            Doctors ({filtered.length})
          </h2>

          {searchTerm &&
            <span className={styles.searchResults}>
              Showing results for "{searchTerm}"
            </span>}
        </div>

        {loading ? (
          <div className={styles.emptyState}>Loading doctors...</div>
        ) : filtered.length === 0 ? (

          <div className={styles.emptyState}>
            {doctors.length === 0
              ? "No doctors added yet. Start by adding your first doctor above."
              : "No doctors match your search criteria."}
          </div>

        ) : (

          <div className={styles.adminsGrid}>

            {filtered.map(doc => (

              <div key={doc.id} className={styles.adminCard}>

                <div className={styles.cardHeader}>

                  <div className={styles.adminAvatar}>

                    {doc.image ? (
                      <img
                        src={getDoctorImageSrc(doc.image)}
                        alt="doctor"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          borderRadius: "50%"
                        }}
                      />
                    ) : (
                      getInitials(doc.username)
                    )}

                  </div>

                  <div className={styles.doctorInfo}>
                    <h3 className={styles.adminName}>
                      {doc.username}
                    </h3>


                  </div>

                </div>

                <div className={styles.cardBody}>


                  {doc.department && (
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>
                        Department:
                      </span>

                      <span className={styles.infoValue}>
                        {doc.department}
                      </span>
                    </div>
                  )}

                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>
                      University:
                    </span>

                    <span className={styles.infoValue}>
                      {doc.university}
                    </span>
                  </div>

                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>
                      Email:
                    </span>

                    <span className={styles.infoValue}>
                      {doc.email}
                    </span>
                  </div>

                  <div className={styles.workSection}>
                    <div className={styles.workSectionTitle}>Hospital assignments</div>
                    {assignments.filter((a) => String(a.doctorId) === String(doc.id)).length === 0 ? (
                      <p className={styles.workEmpty}>No room / shift assigned yet.</p>
                    ) : (
                      <ul className={styles.workList}>
                        {assignments
                          .filter((a) => String(a.doctorId) === String(doc.id))
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
                                  onClick={() => startEditWork(doc, row)}
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
                      onClick={() => openWorkPanel(doc)}
                    >
                      {workPanelDoctorId === doc.id ? "Close assignment form" : "+ Assign work"}
                    </button>
                    {workPanelDoctorId === doc.id && (
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
                            onClick={() => handleWorkSubmit(doc)}
                          >
                            {workForm.editingWorkId ? "Update assignment" : "Save assignment"}
                          </button>
                          {workForm.editingWorkId && (
                            <button
                              type="button"
                              className={styles.workCancelBtn}
                              onClick={() => resetWorkForm(doc)}
                            >
                              Cancel edit
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                </div>

                <div className={styles.btnRow}>

                  <button
                    className={styles.editBtn}
                    onClick={() => handleEdit(doc)}
                  >
                    ✏️ Edit
                  </button>

                  <button
                    className={styles.deleteBtn}
                    onClick={() => handleDelete(doc.id)}
                  >
                    🗑 Delete
                  </button>

                </div>

              </div>

            ))}

          </div>

        )}

      </div>

    </div>
  );
}