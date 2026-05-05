import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RoleProvider, useRole } from "@/contexts/RoleContext";
import AppLayout from "./layouts/AppLayout";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleGuard from "./components/RoleGuard";

import AdminDashboard from "./pages/admin/Dashboard";
import AdminStudents from "./pages/admin/Students";
import AdminTeachers from "./pages/admin/Teachers";
import AdminClasses from "./pages/admin/Classes";
import AdminReports from "./pages/admin/Reports";
import AdminSettings from "./pages/admin/Settings";

import TeacherDashboard from "./pages/teacher/Dashboard";
import TeacherClasses from "./pages/teacher/Classes";
import TeacherAttendance from "./pages/teacher/Attendance";
import TestBuilder from "./pages/teacher/TestBuilder";
import Grading from "./pages/teacher/Grading";
import TeacherStudents from "./pages/teacher/Students";

import StudentDashboard from "./pages/student/Dashboard";
import StudentClasses from "./pages/student/Classes";
import ExamInterface from "./pages/student/ExamInterface";
import StudentResults from "./pages/student/Results";
import Library from "./pages/student/Library";
import AITutor from "./pages/student/AITutor";
import StudentCalendar from "./pages/student/Calendar";

import ParentDashboard from "./pages/parent/Dashboard";
import ParentChildren from "./pages/parent/Children";
import ParentResults from "./pages/parent/Results";
import ParentAttendance from "./pages/parent/Attendance";
import ParentActivity from "./pages/parent/Activity";
import ParentFees from "./pages/parent/Fees";
import ParentMessages from "./pages/parent/Messages";

const queryClient = new QueryClient();

function RoleRedirect() {
  const { role } = useRole();
  return <Navigate to={`/${role}`} replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-right" />
      <RoleProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<RoleRedirect />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/admin" element={<RoleGuard allow="admin"><AdminDashboard /></RoleGuard>} />
              <Route path="/admin/students" element={<RoleGuard allow="admin"><AdminStudents /></RoleGuard>} />
              <Route path="/admin/teachers" element={<RoleGuard allow="admin"><AdminTeachers /></RoleGuard>} />
              <Route path="/admin/classes"  element={<RoleGuard allow="admin"><AdminClasses /></RoleGuard>} />
              <Route path="/admin/reports"  element={<RoleGuard allow="admin"><AdminReports /></RoleGuard>} />
              <Route path="/admin/settings" element={<RoleGuard allow="admin"><AdminSettings /></RoleGuard>} />

              <Route path="/teacher"            element={<RoleGuard allow="teacher"><TeacherDashboard /></RoleGuard>} />
              <Route path="/teacher/classes"    element={<RoleGuard allow="teacher"><TeacherClasses /></RoleGuard>} />
              <Route path="/teacher/attendance" element={<RoleGuard allow="teacher"><TeacherAttendance /></RoleGuard>} />
              <Route path="/teacher/tests"      element={<RoleGuard allow="teacher"><TestBuilder /></RoleGuard>} />
              <Route path="/teacher/grading"    element={<RoleGuard allow="teacher"><Grading /></RoleGuard>} />
              <Route path="/teacher/students"   element={<RoleGuard allow="teacher"><TeacherStudents /></RoleGuard>} />

              <Route path="/student"          element={<RoleGuard allow="student"><StudentDashboard /></RoleGuard>} />
              <Route path="/student/classes"  element={<RoleGuard allow="student"><StudentClasses /></RoleGuard>} />
              <Route path="/student/exams"    element={<RoleGuard allow="student"><ExamInterface /></RoleGuard>} />
              <Route path="/student/results"  element={<RoleGuard allow="student"><StudentResults /></RoleGuard>} />
              <Route path="/student/library"  element={<RoleGuard allow="student"><Library /></RoleGuard>} />
              <Route path="/student/ai-tutor" element={<RoleGuard allow="student"><AITutor /></RoleGuard>} />
              <Route path="/student/calendar" element={<RoleGuard allow="student"><StudentCalendar /></RoleGuard>} />

              <Route path="/parent"            element={<RoleGuard allow="parent"><ParentDashboard /></RoleGuard>} />
              <Route path="/parent/children"   element={<RoleGuard allow="parent"><ParentChildren /></RoleGuard>} />
              <Route path="/parent/results"    element={<RoleGuard allow="parent"><ParentResults /></RoleGuard>} />
              <Route path="/parent/attendance" element={<RoleGuard allow="parent"><ParentAttendance /></RoleGuard>} />
              <Route path="/parent/activity"   element={<RoleGuard allow="parent"><ParentActivity /></RoleGuard>} />
              <Route path="/parent/fees"       element={<RoleGuard allow="parent"><ParentFees /></RoleGuard>} />
              <Route path="/parent/messages"   element={<RoleGuard allow="parent"><ParentMessages /></RoleGuard>} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </RoleProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
