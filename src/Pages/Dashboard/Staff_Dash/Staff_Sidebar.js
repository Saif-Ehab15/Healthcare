import { Link, useNavigate } from "react-router-dom";
import { FaUserNurse, FaSignOutAlt } from "react-icons/fa"; // Importing icons
import '../Nurse_Dash/Nurse.css';

export default function Staffsidebar(){

    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem("user");
        navigate('/Login');
    };
    
    return(
        <div className="Nursesidebar">
            <div className="sidebar-header">
               <h3>Staff Panel</h3>
            </div>

            <ul className="Nursesidebar-menu">
                <li>
                    <Link to="/dashboard/staff" className="menu-item">
                        <span className="menu-icon"><FaUserNurse /></span>
                        <span className="menu-text">Staff profile</span>
                    </Link>
                </li>
                <li>
                    <Link to="/dashboard/staff/attendance" className="menu-item">
                        <span className="menu-icon">📋</span>
                        <span className="menu-text">Attendance</span>
                    </Link>
                </li>
                <li>
                   
                    <button type="button" className="menu-item" onClick={handleLogout}>
                        <span className="menu-icon"><FaSignOutAlt /></span>  
                        <span className="menu-text">Logout</span>
                    </button>
                </li>
            </ul>
        </div>
    )
}  