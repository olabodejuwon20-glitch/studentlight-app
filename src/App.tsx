import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SchoolProvider, useSchool } from "@/contexts/SchoolContext";
import { RequireAuth, RequireSchool, RoleGate } from "@/components/Guards";
import AppLayout from "./layouts/AppLayout";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Landing from "./pages/Landing";
import Register from "./pages/Register";
import Join from "./pages/Join";
import ChangePin from "./pages/ChangePin";
import Bio from "./pages/Bio";

import AdminDashboard from "./pages/admin/Dashboard";
import AdminStudents from "./pages/admin/Students";
import AdminTeachers from "./pages/admin/Teachers";
import AdminClasses from "./pages/admin/Classes";
import AdminReports from "./pages/admin/Reports";
import AdminSettings from "./pages/admin/Settings";
import AdminInvites from "./pages/admin/Invites";
import AdminBulkUpload from "./pages/admin/BulkUpload";

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

function AppRoot() {
  const { activeRole } = useSchool();
  return <Navigate to={`/app/${activeRole}`} replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-right" />
      <SchoolProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/register" element={<Register />} />
            <Route path="/join" element={<Join />} />
            <Route path="/change-pin" element={<RequireAuth><ChangePin /></RequireAuth>} />
            <Route path="/bio" element={<RequireAuth><Bio /></RequireAuth>} />
            <Route path="/app" element={<RequireSchool><AppLayout /></RequireSchool>}>
              <Route index element={<AppRoot />} />

              <Route path="admin" element={<RoleGate allow="admin"><AdminDashboard /></RoleGate>} />
              <Route path="admin/students" element={<RoleGate allow="admin"><AdminStudents /></RoleGate>} />
              <Route path="admin/teachers" element={<RoleGate allow="admin"><AdminTeachers /></RoleGate>} />
              <Route path="admin/classes" element={<RoleGate allow="admin"><AdminClasses /></RoleGate>} />
              <Route path="admin/reports" element={<RoleGate allow="admin"><AdminReports /></RoleGate>} />
              <Route path="admin/invites" element={<RoleGate allow="admin"><AdminInvites /></RoleGate>} />
              <Route path="admin/bulk" element={<RoleGate allow="admin"><AdminBulkUpload /></RoleGate>} />
              <Route path="admin/settings" element={<RoleGate allow="admin"><AdminSettings /></RoleGate>} />

              <Route path="teacher" element={<RoleGate allow="teacher"><TeacherDashboard /></RoleGate>} />
              <Route path="teacher/classes" element={<RoleGate allow="teacher"><TeacherClasses /></RoleGate>} />
              <Route path="teacher/attendance" element={<RoleGate allow="teacher"><TeacherAttendance /></RoleGate>} />
              <Route path="teacher/tests" element={<RoleGate allow="teacher"><TestBuilder /></RoleGate>} />
              <Route path="teacher/grading" element={<RoleGate allow="teacher"><Grading /></RoleGate>} />
              <Route path="teacher/students" element={<RoleGate allow="teacher"><TeacherStudents /></RoleGate>} />

              <Route path="student" element={<RoleGate allow="student"><StudentDashboard /></RoleGate>} />
              <Route path="student/classes" element={<RoleGate allow="student"><StudentClasses /></RoleGate>} />
              <Route path="student/exams" element={<RoleGate allow="student"><ExamInterface /></RoleGate>} />
              <Route path="student/results" element={<RoleGate allow="student"><StudentResults /></RoleGate>} />
              <Route path="student/library" element={<RoleGate allow="student"><Library /></RoleGate>} />
              <Route path="student/ai-tutor" element={<RoleGate allow="student"><AITutor /></RoleGate>} />
              <Route path="student/calendar" element={<RoleGate allow="student"><StudentCalendar /></RoleGate>} />

              <Route path="parent" element={<RoleGate allow="parent"><ParentDashboard /></RoleGate>} />
              <Route path="parent/children" element={<RoleGate allow="parent"><ParentChildren /></RoleGate>} />
              <Route path="parent/results" element={<RoleGate allow="parent"><ParentResults /></RoleGate>} />
              <Route path="parent/attendance" element={<RoleGate allow="parent"><ParentAttendance /></RoleGate>} />
              <Route path="parent/activity" element={<RoleGate allow="parent"><ParentActivity /></RoleGate>} />
              <Route path="parent/fees" element={<RoleGate allow="parent"><ParentFees /></RoleGate>} />
              <Route path="parent/messages" element={<RoleGate allow="parent"><ParentMessages /></RoleGate>} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </SchoolProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
