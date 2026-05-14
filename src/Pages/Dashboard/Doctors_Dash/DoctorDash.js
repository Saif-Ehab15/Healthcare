import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function DoctorDash() {
    const location = useLocation();

    return (
        <div style={{ display: "flex", minHeight: "100vh" }}>
            <Sidebar />
            <main style={{ flex: 1 }}>
                <Outlet />
            </main>
        </div>
    );
}
