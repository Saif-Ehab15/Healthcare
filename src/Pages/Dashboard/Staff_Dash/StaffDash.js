import { useState, useEffect, useRef } from "react";
import axiosInstance from "../../../Config/axios";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "../Nurse_Dash/Nurse.css"; 
import Staffsidebar from "./Staff_Sidebar";

export default function Staffdash() {
    const location = useLocation();
    const navigate = useNavigate();
    const isProfileRoute = location.pathname === '/dashboard/staff' || location.pathname === '/dashboard/staff/';
    const defaultAvatar =
        "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 150 150'><rect width='150' height='150' fill='%23e5e7eb'/><circle cx='75' cy='58' r='28' fill='%239ca3af'/><path d='M25 132c7-23 24-36 50-36s43 13 50 36' fill='%239ca3af'/></svg>";

    const [staffInfo, setStaffInfo] = useState({
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
    const fileInputRef = useRef(null);

    useEffect(() => {
        async function fetchStaffData() {
            try {
                const storedUser = localStorage.getItem("user");
                const token = localStorage.getItem("token");

                if (!storedUser || !token) {
                    toast.info("Please login to access staff dashboard.");
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
                    `/api/Accounts/GetStaff/${user.id}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                const data = res.data;
                setStaffInfo(prevState => ({
                    ...prevState,
                    name: data.name || "",
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
                console.error("Error fetching staff data:", error);
                const status = error.response?.status;
                if (status === 401) {
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");
                    toast.info("Session expired. Please login again.");
                    navigate("/Login", { replace: true });
                } else if (status === 403) {
                    toast.error("Access denied: you don't have permission to view this profile.");
                } else if (status === 404) {
                    toast.error("Staff profile not found.");
                } else {
                    toast.error("Failed to load profile. Please try again.");
                }
            } finally {
                setLoading(false);
            }
        }

        fetchStaffData();
    }, [defaultAvatar, navigate]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setStaffInfo({
            ...staffInfo,
            [name]: value
        });
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedPhoto(file);
            setStaffInfo(prev => ({
                ...prev,
                photo: URL.createObjectURL(file)
            }));
        }
    };

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
                formData.append("Name", staffInfo.name);
                formData.append("DateOfBirth", staffInfo.DateOfBirth);
                formData.append("University", staffInfo.university);
                formData.append("Email", staffInfo.email);
                formData.append("Phone", staffInfo.phone);

                if (selectedPhoto) {
                    formData.append("Image", selectedPhoto);
                }

                await axiosInstance.put(
                    "/api/Accounts/UpdateStaffProfile",
                    formData,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "multipart/form-data"
                        },
                    }
                );

                toast.success("Profile updated successfully!");

                user.name = staffInfo.name;
                user.email = staffInfo.email;
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
                    <Staffsidebar/>
                    <main className="nursedash-content">
                        <h2>Loading Staff data...</h2>
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
                    <Staffsidebar />

                    <main className="nursedash-content">
                        {isProfileRoute && (
                            <div className="nurse-header-panel">
                                <div className="header-top-row">
                                    <h1>Welcome back, <span className="highlight">{staffInfo.name}</span></h1>
                                    <button
                                        className={`edit-btn ${isEditing ? 'save-mode' : ''}`}
                                        onClick={toggleEdit}
                                    >
                                        {isEditing ? "Save Changes" : "Edit Profile"}
                                    </button>
                                </div>

                                <div className="nurse-info-card">
                                    <div className="nurse-photo-container" onClick={() => isEditing && fileInputRef.current?.click()} style={isEditing ? { cursor: 'pointer' } : {}}>
                                        <img src={staffInfo.photo} alt={staffInfo.name} className="nurse-photo" />
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
                                                <input type="text" name="name" value={staffInfo.name} onChange={handleInputChange} />
                                            ) : (
                                                <span>{staffInfo.name}</span>
                                            )}
                                        </div>

                                        <div className="detail-item">
                                            <strong>University:</strong>
                                            {isEditing ? (
                                                <input type="text" name="university" value={staffInfo.university} onChange={handleInputChange} />
                                            ) : (
                                                <span>{staffInfo.university}</span>
                                            )}
                                        </div>

                                        <div className="detail-item">
                                            <strong>DateOfBirth:</strong>
                                            {isEditing ? (
                                                <input type="date" name="DateOfBirth" value={staffInfo.DateOfBirth} onChange={handleInputChange} />
                                            ) : (
                                                <span>{staffInfo.DateOfBirth}</span>
                                            )}
                                        </div>

                                        <div className="detail-item">
                                            <strong>Gender:</strong>
                                            {isEditing ? (
                                                <select name="gender" value={staffInfo.gender} onChange={handleInputChange}>
                                                    <option value="Male">Male</option>
                                                    <option value="Female">Female</option>
                                                </select>
                                            ) : (
                                                <span>{staffInfo.gender}</span>
                                            )}
                                        </div>

                                        <div className="detail-item">
                                            <strong>Email:</strong>
                                            {isEditing ? (
                                                <input type="email" name="email" value={staffInfo.email} onChange={handleInputChange} />
                                            ) : (
                                                <span>{staffInfo.email}</span>
                                            )}
                                        </div>

                                        <div className="detail-item">
                                            <strong>Phone:</strong>
                                            {isEditing ? (
                                                <input type="tel" name="phone" value={staffInfo.phone} onChange={handleInputChange} />
                                            ) : (
                                                <span>{staffInfo.phone}</span>
                                            )}
                                        </div>
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