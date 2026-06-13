import { useState } from "react";
import { Link, useNavigate, } from "react-router-dom";
import axiosInstance from "../../../Config/axios";
import { ToastContainer, toast } from "react-toastify";
import './Register.css'

export default function Login() {
    const [form, setForm] = useState({
        email: "",
        password: "",
    });

    const navigate = useNavigate()

    function handleChange(e) {
        setForm({ ...form, [e.target.name]: e.target.value });
    }

    async function handleSubmit(e) {

        e.preventDefault();

        try {
            const res = await axiosInstance.post("/api/Accounts/Login", form);

            if (res.status === 200 && res.data.token && res.data.role) {
                const token = res.data.token;
                const user = {
                    id: res.data.id,
                    email: res.data.email,
                    userName: res.data.userName,
                    role: res.data.role
                };
                localStorage.setItem("token", token);
                localStorage.setItem("user", JSON.stringify(user));

                toast.success("Login successful!");

                setTimeout(() => {
                    if (user.role === "Patient") {
                        navigate("/Home");
                    } else if (user.role === "Staff") {
                        navigate("/dashboard/staff")
                    } else if (user.role === "Nurse") {
                        navigate("/dashboard/nurse")
                    } else if (user.role === "Doctor") {
                        navigate("/dashboard/doctor")
                    } else if (user.role === "SubAdmin") {
                        navigate("/dashboard/admin")
                    } else if (user.role === "Admin") {
                        navigate("/dashboard/admin")
                    } else {
                        navigate("/");
                    }
                }, 2000);

            } else {
                toast.error("Login failed");
            }

        } catch (err) {
            console.error("Login Error:", err);
            toast.error(err.response?.data?.message || "An error occurred during login.");
        }
    }

    return (
        <div className="split-layout-wrapper">
            <div className="layout-image-side"></div>

            <div className="register-container">
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

                <form className="register-form" onSubmit={handleSubmit}>
                    <h2 className="register-form-title">Login to Your Account</h2>

                    <label>Email</label>
                    <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="Enter Your Email"
                    />

                    <label>Password</label>
                    <input
                        type="password"
                        name="password"
                        value={form.password}
                        onChange={handleChange}
                        placeholder="Enter Your Password"
                    />

                    <button className="button" type="submit">Login</button>

                    <Link to="/ForgotPassword" className="form-link">
                        Forgot Password?
                    </Link>
                    
                    <Link to="/Signup" className="form-link">
                        don't have an account?
                    </Link>
                </form>
            </div>
        </div>
    );
}