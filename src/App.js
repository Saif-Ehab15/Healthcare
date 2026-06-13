import { Route, Routes } from 'react-router-dom';
import Signup from './Pages/Website/Registration/Signup';
import Login from './Pages/Website/Registration/Login';
import Homepage from './Pages/Website/Homepage/Home';
import Profile from './Pages/Website/Profile/Profile';
import Nursedash from './Pages/Dashboard/Nurse_Dash/NurseDash';
import ChatbotWidget from './Pages/Website/Chatbot/Chatbot';
import ICU from './Pages/Dashboard/Nurse_Dash/ICU';
import AllDoctors from './Pages/Website/Doctors/doctors';
import DoctorDetails from './Pages/Website/Doctors/doctorDetails';
import DoctorReservation from './Pages/Website/Doctors/doctorReservation';
import DoctorProfile from './Pages/Dashboard/Doctors_Dash/DoctorProfile';
import SessionReports from './Pages/Dashboard/Doctors_Dash/SessionReports';
import AdminLayout from './Pages/Dashboard/Admin_Dash/AdminLayout';
import AdminHome from './Pages/Dashboard/Admin_Dash/AdminHome';
import SubAdmin from './Pages/Dashboard/Admin_Dash/SubAdmin';
import StaffCRUD from './Pages/Dashboard/Admin_Dash/StaffCRUD';
import ManageDoctors from './Pages/Dashboard/Admin_Dash/ManageDoctors';
import Departments from './Pages/Dashboard/Admin_Dash/Departments';
import Dashboard from './Pages/Dashboard/Admin_Dash/Dashboard';
import ChatPage from './Pages/Website/Doctors/Patientchat';
import Doctorchat from './Pages/Dashboard/Doctors_Dash/Doctorchat';
import DoctorDash from './Pages/Dashboard/Doctors_Dash/DoctorDash';
import AllRooms from './Pages/Website/Rooms/AllRooms';
import ICUpatient from './Pages/Website/Rooms/ICU_Patient';
import RoomsPatient from './Pages/Website/Rooms/Rooms_Patient';
import AdminAllRooms from './Pages/Dashboard/Admin_Dash/AdminAllRooms';
import ICUadmin from './Pages/Dashboard/Admin_Dash/ICU_Admin';
import RoomsAdmin from './Pages/Dashboard/Admin_Dash/Rooms_Admin';
import EmergencyAdmin from './Pages/Dashboard/Admin_Dash/Emergency_Admin';
import AppointmentPage from './Pages/Dashboard/Doctors_Dash/Appointments';
import ForgotPassword from './Pages/Website/Registration/ForgotPassword';
import ResetPassword from './Pages/Website/Registration/ResetPassword';
import Staffdash from './Pages/Dashboard/Staff_Dash/StaffDash';
import Attendance from './Pages/Dashboard/Staff_Dash/Attendance';
import NurseReports from './Pages/Dashboard/Nurse_Dash/Reports';
import PatientBills from './Pages/Website/Patient_Bills/Patient_Bills';
import ManageBills from './Pages/Dashboard/Admin_Dash/ManageBills';
import ManagePrices from './Pages/Dashboard/Admin_Dash/ManagePrices';
import StaffManageBills from './Pages/Dashboard/Staff_Dash/StaffManageBills';
import ManageShifts from './Pages/Dashboard/Admin_Dash/ManageShifts';


function App() {
  return (
    <div className="App">
      <Routes>
        <Route path='/Signup' element={<Signup />}></Route>
        <Route path='/' element={<Login />}></Route>
        <Route path='/Login' element={<Login />}></Route>
        <Route path='/ForgotPassword' element={<ForgotPassword />}></Route>
        <Route path='/ResetPassword' element={<ResetPassword />}></Route>
        <Route path='/Home' element={<Homepage />}></Route>
        <Route path='/Profile' element={<Profile />}></Route>
        <Route path='/chatbot' element={<ChatbotWidget />}></Route>
        <Route path='/doctors' element={<AllDoctors />}></Route>
        <Route path='/doctor-details/:id' element={<DoctorDetails />}></Route>
        <Route path='/doctors/:id/reservation' element={<DoctorReservation />}></Route>
        <Route path='/patient_chat' element={<ChatPage />}></Route>
        <Route path='/AllRooms' element={<AllRooms />}></Route>
        <Route path='/ICUpatient' element={<ICUpatient />}></Route>
        <Route path='/RoomsPatient' element={<RoomsPatient />}></Route>
        <Route path='/patient_bills' element={<PatientBills />}></Route>



        {/* Nurse Dashboard with nested Outlet routes */}
        <Route path='/dashboard/nurse' element={<Nursedash />}>
          <Route path='ICUmonitor' element={<ICU />} />
          <Route path='Nurse_reports' element={<NurseReports />} />
        </Route>

        {/* Doctor Dashboard with nested Outlet routes */}
        <Route path='/dashboard/doctor' element={<DoctorDash />}>
          <Route index element={<DoctorProfile />} />
          <Route path='profile' element={<DoctorProfile />} />
          <Route path='reports' element={<SessionReports />} />
          <Route path='appointments' element={<AppointmentPage />} />
          <Route path='chat' element={<Doctorchat />} />
        </Route>

        {/* Admin Dashboard with nested Outlet routes */}
        <Route path='/dashboard/admin' element={<AdminLayout />}>
          <Route index element={<AdminHome />} />
          <Route path='dashboard' element={<Dashboard />} />
          <Route path='manage-departments' element={<Departments />} />
          <Route path='manage-doctors' element={<ManageDoctors />} />
          <Route path='sub-admin' element={<SubAdmin />} />
          <Route path='manage-staff' element={<StaffCRUD />} />
          <Route path='admin-all-rooms' element={<AdminAllRooms />} />
          <Route path='patients_bills' element={<ManageBills />} />
          <Route path='manage_prices' element={<ManagePrices />} />
          <Route path='manage-shifts' element={<ManageShifts />} />
          <Route path='admin-all-rooms/ICUadmin' element={<ICUadmin />} />
          <Route path='admin-all-rooms/RoomsAdmin' element={<RoomsAdmin />} />
          <Route path='admin-all-rooms/EmergencyAdmin' element={<EmergencyAdmin />} />
        </Route>

        {/* Staff Dashboard with nested Outlet routes */}
        <Route path='/dashboard/staff' element={<Staffdash />}>
          <Route path='attendance' element={<Attendance />} />
          <Route path='staff_manage_bills' element={<StaffManageBills />} />
        </Route>

      </Routes>
    </div>
  );
}

export default App;