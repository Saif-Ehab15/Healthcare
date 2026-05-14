import { Link, useNavigate } from "react-router-dom";
import { FaUserNurse, FaHeartbeat, FaSignOutAlt } from "react-icons/fa"; 
import './Nurse.css';
import { ClipboardCheck } from "lucide-react";

export default function Nursesidebar(){

    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem("user");
        navigate('/Login');
    };
    
    return(
        <div className="Nursesidebar">
            <div className="sidebar-header">
               <h3>Nurse Panel</h3>
            </div>

            <ul className="Nursesidebar-menu">
                <li>
                    <Link to="/dashboard/nurse" className="menu-item">
                        <span className="menu-icon"><FaUserNurse /></span>
                        <span className="menu-text">Nurse profile</span>
                    </Link>
                </li>
                <li>
                    <Link to="/dashboard/nurse/ICUmonitor" className="menu-item">
                        <span className="menu-icon"><FaHeartbeat /></span>
                        <span className="menu-text">ICU monitoring</span>
                    </Link>
                </li>
                <li>
                    <Link to="/dashboard/nurse/Nurse_reports" className="menu-item">
                        <span className="menu-icon"><ClipboardCheck /></span>
                        <span className="menu-text">Reports</span>
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