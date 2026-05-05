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
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/students" element={<AdminStudents />} />
              <Route path="/admin/teachers" element={<AdminTeachers />} />
              <Route path="/admin/classes"  element={<AdminClasses />} />
              <Route path="/admin/reports"  element={<AdminReports />} />
              <Route path="/admin/settings" element={<AdminSettings />} />

              <Route path="/teacher"            element={<TeacherDashboard />} />
              <Route path="/teacher/classes"    element={<TeacherClasses />} />
              <Route path="/teacher/attendance" element={<TeacherAttendance />} />
              <Route path="/teacher/tests"      element={<TestBuilder />} />
              <Route path="/teacher/grading"    element={<Grading />} />
              <Route path="/teacher/students"   element={<TeacherStudents />} />

              <Route path="/student"          element={<StudentDashboard />} />
              <Route path="/student/classes"  element={<StudentClasses />} />
              <Route path="/student/exams"    element={<ExamInterface />} />
              <Route path="/student/results"  element={<StudentResults />} />
              <Route path="/student/library"  element={<Library />} />
              <Route path="/student/ai-tutor" element={<AITutor />} />
              <Route path="/student/calendar" element={<StudentCalendar />} />

              <Route path="/parent"            element={<ParentDashboard />} />
              <Route path="/parent/children"   element={<ParentChildren />} />
              <Route path="/parent/results"    element={<ParentResults />} />
              <Route path="/parent/attendance" element={<ParentAttendance />} />
              <Route path="/parent/activity"   element={<ParentActivity />} />
              <Route path="/parent/fees"       element={<ParentFees />} />
              <Route path="/parent/messages"   element={<ParentMessages />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </RoleProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
