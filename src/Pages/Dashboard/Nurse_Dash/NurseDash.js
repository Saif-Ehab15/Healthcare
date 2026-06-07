import { useState, useEffect, useRef } from "react";
import axiosInstance from "../../../Config/axios";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Nursesidebar from "./Nurse_Sidebar";
import { ToastContainer, toast } from "react-toastify";
import "./Nurse.css";

export default function Nursedash() {
    const location = useLocation();
    const navigate = useNavigate();
    const isProfileRoute = location.pathname === '/dashboard/nurse' || location.pathname === '/dashboard/nurse/';
    const defaultAvatar =
        "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 150 150'><rect width='150' height='150' fill='%23e5e7eb'/><circle cx='75' cy='58' r='28' fill='%239ca3af'/><path d='M25 132c7-23 24-36 50-36s43 13 50 36' fill='%239ca3af'/></svg>";

    const [nurseInfo, setNurseInfo] = useState({
        name: "",
        photo: defaultAvatar,
        university: "",
        DateOfBirth: "",
        gender: "",
        email: "",
        phone: ""
    });

    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [assignedWorks, setAssignedWorks] = useState([]);
    const fileInputRef = useRef(null);

    useEffect(() => {
        async function fetchNurseData() {
            try {
                const storedUser = localStorage.getItem("user");
                const token = localStorage.getItem("token");

                if (!storedUser || !token) {
                    toast.info("Please login to access nurse dashboard.");
                    setLoading(false);
                    navigate("/Login", { replace: true });
                    return;
                }

                const user = JSON.parse(storedUser);

                if (!user?.id) {
                    console.error("User ID not found");
                    setLoading(false);
                    return;
                }

                const res = await axiosInstance.get(
                    `/api/Accounts/GetNurses/${user.id}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                const data = res.data;
                setNurseInfo(prevState => ({
                    ...prevState,
                    name: data.name || data.userName || "",
                    photo: data.image
                        ? (data.image.startsWith("/")
                            ? `https://localhost:7250${data.image}`
                            : `https://localhost:7250/images/${data.image}`)
                        : defaultAvatar,
                    university: data.university || "",
                    DateOfBirth: (data.dateOfBirth && data.dateOfBirth !== "0001-01-01") ? data.dateOfBirth : "",
                    gender: data.gender || "",
                    email: data.email || "",
                    phone: data.phone || ""
                }));

            } catch (error) {
                console.error("Error fetching nurse data:", error);
                const status = error.response?.status;
                if (status === 401) {
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");
                    toast.info("Session expired. Please login again.");
                    navigate("/Login", { replace: true });
                } else if (status === 403) {
                    toast.error("Access denied: you don't have permission to view this profile.");
                } else if (status === 404) {
                    toast.error("Nurse profile not found.");
                } else {
                    toast.error("Failed to load profile. Please try again.");
                }
            } finally {
                setLoading(false);
            }
        }

        async function fetchAssignedWorks() {
            try {
                const storedUser = localStorage.getItem("user");
                if (!storedUser) return;
                const user = JSON.parse(storedUser);
                if (!user?.id) return;

                const res = await axiosInstance.get(`/api/AssignWorks/doctor/${user.id}`);
                const data = res.data?.$values || (Array.isArray(res.data) ? res.data : []);
                setAssignedWorks(data);
            } catch (error) {
                console.error("Error fetching assigned works:", error);
            }
        }

        fetchNurseData();
        fetchAssignedWorks();
    }, [defaultAvatar, navigate]);

    // 4. Function to handle input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNurseInfo({
            ...nurseInfo,
            [name]: value
        });
    };

    // Handle photo file selection
    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedPhoto(file);
            setNurseInfo(prev => ({
                ...prev,
                photo: URL.createObjectURL(file)
            }));
        }
    };

    // 5. Function to toggle Edit mode
    const toggleEdit = async () => {
        if (isEditing) {
            try {
                const storedUser = localStorage.getItem("user");
                const token = localStorage.getItem("token");

                if (!storedUser || !token) {
                    toast.info("Your session expired. Please login again.");
                    navigate("/Login", { replace: true });
                    return;
                }

                const user = JSON.parse(storedUser);

                const formData = new FormData();
                formData.append("Id", user.id);
                formData.append("Name", nurseInfo.name);
                formData.append("DateOfBirth", nurseInfo.DateOfBirth);
                formData.append("University", nurseInfo.university);
                formData.append("Email", nurseInfo.email);
                formData.append("Phone", nurseInfo.phone);

                if (selectedPhoto) {
                    formData.append("Image", selectedPhoto);
                }

                await axiosInstance.put(
                    "/api/Accounts/UpdateNurseProfile",
                    formData,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "multipart/form-data"
                        },
                    }
                );

                toast.success("Profile updated successfully!");

                user.name = nurseInfo.name;
                user.email = nurseInfo.email;
                localStorage.setItem("user", JSON.stringify(user));
                setSelectedPhoto(null);

            } catch (error) {
                toast.error(error.response?.data?.join ? error.response.data.join(", ") : "Failed to update profile");
                return;
            }
        }
        setIsEditing(!isEditing);
    };

    if (loading) {
        return (
            <div className="nurse-dashboard">
                <div className="Nursedash-container">
                    <Nursesidebar />
                    <main className="nursedash-content">
                        <h2>Loading nurse data...</h2>
                    </main>
                </div>
            </div>
        );
    }

    return (
        <>
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
            <div className="nurse-dashboard">
                <div className="Nursedash-container">
                    <Nursesidebar />

                    <main className="nursedash-content">
                        {isProfileRoute && (
                            <div className="nurse-header-panel">
                                <div className="header-top-row">
                                    <h1>Welcome back, <span className="highlight">{nurseInfo.name}</span></h1>
                                    <button
                                        className={`edit-btn ${isEditing ? 'save-mode' : ''}`}
                                        onClick={toggleEdit}
                                    >
                                        {isEditing ? "Save Changes" : "Edit Profile"}
                                    </button>
                                </div>

                                <div className="nurse-info-card">
                                    <div className="nurse-photo-container" onClick={() => isEditing && fileInputRef.current?.click()} style={isEditing ? { cursor: 'pointer' } : {}}>
                                        <img src={nurseInfo.photo} alt={nurseInfo.name} className="nurse-photo" />
                                        {isEditing && (
                                            <div className="photo-overlay">
                                                <span>📷 Change Photo</span>
                                            </div>
                                        )}
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            accept="image/*"
                                            style={{ display: 'none' }}
                                            onChange={handlePhotoChange}
                                        />
                                    </div>

                                    <div className="nurse-details-grid">

                                        <div className="detail-item">
                                            <strong>Name:</strong>
                                            {isEditing ? (
                                                <input type="text" name="name" value={nurseInfo.name} onChange={handleInputChange} />
                                            ) : (
                                                <span>{nurseInfo.name}</span>
                                            )}
                                        </div>

                                        <div className="detail-item">
                                            <strong>University:</strong>
                                            {isEditing ? (
                                                <input type="text" name="university" value={nurseInfo.university} onChange={handleInputChange} />
                                            ) : (
                                                <span>{nurseInfo.university}</span>
                                            )}
                                        </div>

                                        <div className="detail-item">
                                            <strong>DateOfBirth:</strong>
                                            {isEditing ? (
                                                <input type="date" name="DateOfBirth" value={nurseInfo.DateOfBirth} onChange={handleInputChange} />
                                            ) : (
                                                <span>{nurseInfo.DateOfBirth}</span>
                                            )}
                                        </div>

                                        <div className="detail-item">
                                            <strong>Gender:</strong>
                                            {isEditing ? (
                                                <select name="gender" value={nurseInfo.gender} onChange={handleInputChange}>
                                                    <option value="Female">Female</option>
                                                    <option value="Male">Male</option>
                                                </select>
                                            ) : (
                                                <span>{nurseInfo.gender}</span>
                                            )}
                                        </div>

                                        <div className="detail-item">
                                            <strong>Email:</strong>
                                            {isEditing ? (
                                                <input type="email" name="email" value={nurseInfo.email} onChange={handleInputChange} />
                                            ) : (
                                                <span>{nurseInfo.email}</span>
                                            )}
                                        </div>

                                        <div className="detail-item">
                                            <strong>Phone:</strong>
                                            {isEditing ? (
                                                <input type="tel" name="phone" value={nurseInfo.phone} onChange={handleInputChange} />
                                            ) : (
                                                <span>{nurseInfo.phone}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="assigned-work-panel">
                                    <div className="card-header-row">
                                        <h2>📋 Your Assignments</h2>
                                        <p className="subtitle">Current room and shift assignments</p>
                                    </div>
                                    <div className="assigned-list">
                                        {assignedWorks.length > 0 ? (
                                            assignedWorks.map((work) => (
                                                <div key={work.id} className="assignment-item">
                                                    <div className="assignment-main">
                                                        <span className="room-badge">
                                                            {work.roomNumber ? `Room ${work.roomNumber}` : (work.roomId ? `Room ${work.roomId}` : "Work Session")}
                                                        </span>
                                                        <span className="shift-time">
                                                            ⏰ {(work.startTime?.slice(0, 5) || "—")} – {(work.endTime?.slice(0, 5) || "—")}
                                                        </span>
                                                    </div>
                                                    <div className="assignment-footer">
                                                        <span className="date-label">📅 {(work.startDate || work.day)?.slice(0, 10) || "—"}</span>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="empty-assignments">
                                                <p>No work assignments found.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        <Outlet />
                    </main>
                </div>
            </div>
        </>
    )
}