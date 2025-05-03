import { Suspense } from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import Dashboard from "./pages/dashboard";
import Home from "./pages/home";
import ProtectedRoute from "./components/wrappers/ProtectedRoute";
import DoctorDashboard from "./pages/doctor/dashboard";
import DoctorRevenue from "./pages/doctor/revenue";
import DoctorMeeting from "./pages/doctor/meeting";
import DoctorHome from "./pages/doctor/home";
import PatientDashboard from "./pages/patient/dashboard";
import PatientMeeting from "./pages/patient/meeting";
import PatientHome from "./pages/patient/home";
import Success from "./pages/success";
import DashboardPaid from "./pages/dashboard-paid";
import NotSubscribed from "./pages/not-subscribed";
import ProfileSetup from "./pages/profile-setup";
import { Toaster } from "./components/ui/toaster";

function App() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard-paid" element={<DashboardPaid />} />
          <Route path="/not-subscribed" element={<NotSubscribed />} />
          <Route path="/success" element={<Success />} />
          <Route path="/profile-setup" element={<ProfileSetup />} />
          
          {/* Doctor Routes */}
          <Route
            path="/doctor/home"
            element={
              <ProtectedRoute>
                <DoctorHome />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/dashboard"
            element={
              <ProtectedRoute>
                <DoctorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/revenue"
            element={
              <ProtectedRoute>
                <DoctorRevenue />
              </ProtectedRoute>
            }
          />
          {/* Redirect from /doctor/meeting to /doctor/meetings with a default ID */}
          <Route
            path="/doctor/meeting"
            element={<Navigate to="/doctor/meetings/new" replace />}
          />
          <Route
            path="/doctor/meetings/:meetingId"
            element={
              <ProtectedRoute>
                <DoctorMeeting />
              </ProtectedRoute>
            }
          />
          
          {/* Patient Routes */}
          <Route
            path="/patient/home"
            element={
              <ProtectedRoute>
                <PatientHome />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/dashboard"
            element={
              <ProtectedRoute>
                <PatientDashboard />
              </ProtectedRoute>
            }
          />
          {/* Redirect from /patient/meeting to /patient/meetings with a default ID */}
          <Route
            path="/patient/meeting"
            element={<Navigate to="/patient/meetings/new" replace />}
          />
          <Route
            path="/patient/meetings/:meetingId"
            element={
              <ProtectedRoute>
                <PatientMeeting />
              </ProtectedRoute>
            }
          />
        </Routes>
        <Toaster />
      </>
    </Suspense>
  );
}

export default App;
