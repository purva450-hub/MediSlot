import { Route, Routes } from "react-router-dom";
import { DashboardLayout } from "./components/DashboardLayout";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Login, Register } from "./pages/Auth";
import FindDoctors from "./pages/FindDoctors";
import AppointmentDetail from "./pages/AppointmentDetail";
import Book from "./pages/Book";
import DoctorProfile from "./pages/DoctorProfile";
import Home from "./pages/Home";
import { ForgotPassword, ResetPassword } from "./pages/Password";
import Reschedule from "./pages/Reschedule";
import Availability from "./pages/doctor/Availability";
import DoctorDashboard from "./pages/doctor/Dashboard";
import DoctorProfileEdit from "./pages/doctor/Profile";
import DoctorSchedule from "./pages/doctor/Schedule";
import DoctorDashboard from "./pages/doctor/Dashboard";
import DoctorAppointments from "./pages/doctor/Appointments";
import Availability from "./pages/doctor/Availability";
import DoctorProfileEdit from "./pages/doctor/ProfileEdit";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminDoctors from "./pages/admin/Doctors";
import DoctorForm from "./pages/admin/DoctorForm";
import { AdminPatients, AdminUsers } from "./pages/admin/Users";
import AdminAppointments from "./pages/admin/Appointments";
import AdminSpecialties from "./pages/admin/Specialties";
import MyAppointments from "./pages/patient/MyAppointments";
import Notifications from "./pages/patient/Notifications";
import PatientDashboard from "./pages/patient/Dashboard";
import { PatientSettings, Profile } from "./pages/patient/ProfileSettings";
import { NotFound } from "./pages/Misc";
import { About, Contact, HowItWorks, Privacy, Terms } from "./pages/Static";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="doctors" element={<FindDoctors />} />
        <Route path="about" element={<About />} />
        <Route path="how-it-works" element={<HowItWorks />} />
        <Route path="contact" element={<Contact />} />
        <Route path="privacy" element={<Privacy />} />
        <Route path="terms" element={<Terms />} />
        <Route path="doctors/:id" element={<DoctorProfile />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password" element={<ResetPassword />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route element={<ProtectedRoute roles={["patient"]} />}>
          <Route path="book/:id" element={<Book />} />
          <Route path="appointments/:id/reschedule" element={<Reschedule />} />
        </Route>
        <Route element={<ProtectedRoute />}><Route path="appointments/:id" element={<AppointmentDetail />} /></Route>
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route element={<ProtectedRoute roles={["patient"]} />}>
        <Route element={<DashboardLayout />}>
          <Route path="patient" element={<PatientDashboard />} />
          <Route path="patient/appointments" element={<MyAppointments />} />
          <Route path="patient/notifications" element={<Notifications />} />
          <Route path="patient/profile" element={<Profile />} />
          <Route path="patient/settings" element={<PatientSettings />} />
        </Route>
      </Route>
      <Route element={<ProtectedRoute roles={["doctor"]} />}>
        <Route element={<DashboardLayout />}>
          <Route path="doctor" element={<DoctorDashboard />} />
          <Route path="doctor/appointments" element={<DoctorSchedule />} />
          <Route path="doctor/availability" element={<Availability />} />
          <Route path="doctor/profile" element={<DoctorProfileEdit />} />
          <Route path="doctor/notifications" element={<Notifications />} />
          <Route path="doctor/settings" element={<PatientSettings />} />
        </Route>
      </Route>
      <Route element={<ProtectedRoute roles={["doctor"]} />}>
        <Route element={<DashboardLayout />}>
          <Route path="doctor" element={<DoctorDashboard />} />
          <Route path="doctor/appointments" element={<DoctorAppointments />} />
          <Route path="doctor/availability" element={<Availability />} />
          <Route path="doctor/profile" element={<DoctorProfileEdit />} />
          <Route path="doctor/notifications" element={<Notifications />} />
          <Route path="doctor/settings" element={<PatientSettings />} />
        </Route>
      </Route>
      <Route element={<ProtectedRoute roles={["admin"]} />}>
        <Route element={<DashboardLayout />}>
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="admin/doctors" element={<AdminDoctors />} />
          <Route path="admin/doctors/new" element={<DoctorForm />} />
          <Route path="admin/doctors/:id/edit" element={<DoctorForm />} />
          <Route path="admin/patients" element={<AdminPatients />} />
          <Route path="admin/appointments" element={<AdminAppointments />} />
          <Route path="admin/specialties" element={<AdminSpecialties />} />
          <Route path="admin/users" element={<AdminUsers />} />
          <Route path="admin/settings" element={<PatientSettings />} />
        </Route>
      </Route>
    </Routes>
  );
}
