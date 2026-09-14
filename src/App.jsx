import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import FounderLayout from "@/components/FounderLayout";
import Login from "@/pages/Login";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Dashboard from "@/pages/Dashboard";
import TeacherDashboard from "@/pages/TeacherDashboard";
import MyClasses from "@/pages/MyClasses";
import Homework from "@/pages/Homework";
import Materials from "@/pages/Materials";
import Videos from "@/pages/Videos";
import FounderDashboard from "@/pages/FounderDashboard";
import Schools from "@/pages/Schools";
import SchoolDetails from "@/pages/SchoolDetails";
import GlobalUsers from "@/pages/GlobalUsers";
import Plans from "@/pages/Plans";
import Subscriptions from "@/pages/Subscriptions";
import Modules from "@/pages/Modules";
import Announcements from "@/pages/Announcements";
import AnnouncementsFeed from "@/pages/AnnouncementsFeed";
import SystemHealth from "@/pages/SystemHealth";
import PlatformSettings from "@/pages/PlatformSettings";
import UsersPage from "@/pages/UsersPage";
import ClassesPage from "@/pages/ClassesPage";
import SectionsPage from "@/pages/SectionsPage";
import SubjectsPage from "@/pages/SubjectsPage";
import Attendance from "@/pages/Attendance";
import Biometric from "@/pages/Biometric";
import MyAttendance from "@/pages/MyAttendance";
import Children from "@/pages/Children";
import AuditLogs from "@/pages/AuditLogs";
import Profile from "@/pages/Profile";
import SchoolProfile from "@/pages/SchoolProfile";
import IdCard from "@/pages/IdCard";
function RootRedirect() {
  const { user } = useAuth();
  if (user === null) return null;
  return <Navigate to={user ? "/app" : "/login"} replace />;
}

function AppShell() {
  const { user } = useAuth();
  if (user === null || !user) return null;
  return user.role === "founder_admin" ? <FounderLayout /> : <DashboardLayout />;
}

function HomeDashboard() {
  const { user } = useAuth();
  if (user?.role === "founder_admin") return <FounderDashboard />;
  if (user?.role === "teacher") return <TeacherDashboard />;
  return <Dashboard />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/app" element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
            <Route index element={<HomeDashboard />} />
            {/* Founder */}
            <Route path="schools" element={<Schools />} />
            <Route path="schools/:id" element={<SchoolDetails />} />
            <Route path="users" element={<GlobalUsers />} />
            <Route path="plans" element={<Plans />} />
            <Route path="subscriptions" element={<Subscriptions />} />
            <Route path="modules" element={<Modules />} />
            <Route path="announcements" element={<Announcements />} />
            <Route path="health" element={<SystemHealth />} />
            <Route path="settings" element={<PlatformSettings />} />
            {/* School-scoped */}
            <Route path="teachers" element={<UsersPage role="teacher" />} />
            <Route path="students" element={<UsersPage role="student" />} />
            <Route path="parents" element={<UsersPage role="parent" />} />
            <Route path="principals" element={<UsersPage role="principal" />} />
            <Route path="classes" element={<ClassesPage />} />
            <Route path="sections" element={<SectionsPage />} />
            <Route path="subjects" element={<SubjectsPage />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="biometric" element={<Biometric />} />
            <Route path="my-attendance" element={<MyAttendance />} />
            <Route path="children" element={<Children />} />
            <Route path="my-classes" element={<MyClasses />} />
            <Route path="homework" element={<Homework />} />
            <Route path="materials" element={<Materials />} />
            <Route path="videos" element={<Videos />} />
            <Route path="announcements-feed" element={<AnnouncementsFeed />} />
            {/* Shared */}
            <Route path="audit" element={<AuditLogs />} />
            <Route path="school-profile" element={<SchoolProfile />} />
            <Route path="id-card" element={<IdCard />} />
            <Route path="profile" element={<Profile />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="bottom-right" richColors />
    </AuthProvider>
  );
}

export default App;
