import React, { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import "./admin.css";

export default function AdminLayout() {
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (!raw) {
        navigate("/login", { replace: true });
        return;
      }
      const u = JSON.parse(raw);
      const role = u?.role;
      if (role !== "Admin" && role !== "SubAdmin") {
        if (role === "Staff") navigate("/dashboard/staff", { replace: true });
        else if (role === "Nurse") navigate("/dashboard/nurse", { replace: true });
        else if (role === "Doctor") navigate("/dashboard/doctor", { replace: true });
        else if (role === "Patient") navigate("/Home", { replace: true });
        else navigate("/", { replace: true });
      }
    } catch {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  return (
    <div className="admin-scope">
      <Navbar />
      {/* padding-top هنا ضروري عشان المحتوى ميبدأش من تحت النافبار */}
      <main style={{ paddingTop: "100px", paddingBottom: "40px", minHeight: "100vh" }}>
        <Outlet />
      </main>
    </div>
  );
}