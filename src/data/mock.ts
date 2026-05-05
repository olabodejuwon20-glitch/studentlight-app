export const adminStats = [
  { label: "Total Students", value: "1,245", trend: "+12.5%", icon: "users", color: "info" },
  { label: "Total Teachers", value: "85",    trend: "+8.4%",  icon: "graduationCap", color: "success" },
  { label: "Active Classes", value: "63",    trend: "+6.2%",  icon: "bookOpen", color: "student" },
  { label: "Total Revenue",  value: "₦12.4M",trend: "+15.3%", icon: "dollarSign", color: "warning" },
];

export const enrollmentTrend = [
  { month: "Jan", thisTerm: 600, lastTerm: 500 },
  { month: "Feb", thisTerm: 700, lastTerm: 580 },
  { month: "Mar", thisTerm: 850, lastTerm: 700 },
  { month: "Apr", thisTerm: 900, lastTerm: 820 },
  { month: "May", thisTerm: 1000, lastTerm: 880 },
  { month: "Jun", thisTerm: 1080, lastTerm: 920 },
  { month: "Jul", thisTerm: 1150, lastTerm: 980 },
  { month: "Aug", thisTerm: 1180, lastTerm: 1020 },
  { month: "Sep", thisTerm: 1220, lastTerm: 1080 },
  { month: "Oct", thisTerm: 1300, lastTerm: 1100 },
  { month: "Nov", thisTerm: 1380, lastTerm: 1150 },
  { month: "Dec", thisTerm: 1450, lastTerm: 1200 },
];

export const recentActivities = [
  { icon: "userPlus",   color: "info",    title: "New student registered", desc: "John Doe was added", time: "10 mins ago" },
  { icon: "userCheck",  color: "success", title: "Teacher assigned to class", desc: "Sarah Johnson assigned to SS2 A", time: "1 hour ago" },
  { icon: "fileText",   color: "warning", title: "Exam created", desc: "Mid Term Exam for JSS 1", time: "2 hours ago" },
  { icon: "wallet",     color: "student", title: "Fee payment received", desc: "₦25,000 payment received", time: "3 hours ago" },
  { icon: "bookOpen",   color: "parent",  title: "New class created", desc: "SS3 Science Class created", time: "5 hours ago" },
];

export const students = [
  { id: 1, name: "John Doe",       class: "SS2 A",  admission: "ADM2024001", status: "Active"   },
  { id: 2, name: "Jane Smith",     class: "SS1 B",  admission: "ADM2024002", status: "Active"   },
  { id: 3, name: "Michael Brown",  class: "JSS 3 A",admission: "ADM2024003", status: "Active"   },
  { id: 4, name: "Emily Davis",    class: "SS3 A",  admission: "ADM2024004", status: "Inactive" },
  { id: 5, name: "Daniel Wilson",  class: "JSS 2 B",admission: "ADM2024005", status: "Active"   },
  { id: 6, name: "Sarah Johnson",  class: "SS1 A",  admission: "ADM2024006", status: "Active"   },
  { id: 7, name: "David Miller",   class: "SS2 B",  admission: "ADM2024007", status: "Active"   },
  { id: 8, name: "Olivia Garcia",  class: "JSS 1 A",admission: "ADM2024008", status: "Active"   },
];

export const teachers = [
  { id: 1, name: "Mrs. John Smith",  subject: "Mathematics", classes: 4, email: "j.smith@edusmart.io",  status: "Active" },
  { id: 2, name: "Mr. Williams",     subject: "Physics",     classes: 3, email: "williams@edusmart.io", status: "Active" },
  { id: 3, name: "Mrs. Brown",       subject: "Chemistry",   classes: 3, email: "brown@edusmart.io",    status: "Active" },
  { id: 4, name: "Mrs. Johnson",     subject: "English",     classes: 5, email: "johnson@edusmart.io",  status: "Active" },
  { id: 5, name: "Mr. Adeyemi",      subject: "Biology",     classes: 2, email: "adeyemi@edusmart.io",  status: "Active" },
  { id: 6, name: "Mrs. Okafor",      subject: "Civic Edu.",  classes: 4, email: "okafor@edusmart.io",   status: "On leave" },
];

export const performanceByClass = [
  { class: "JSS 1", score: 72 },
  { class: "JSS 2", score: 78 },
  { class: "JSS 3", score: 81 },
  { class: "SS1",   score: 76 },
  { class: "SS2",   score: 88 },
  { class: "SS3",   score: 84 },
];

export const attendanceOverview = [
  { name: "Present", value: 92, color: "hsl(var(--success))" },
  { name: "Absent",  value: 6,  color: "hsl(var(--destructive))" },
  { name: "Late",    value: 2,  color: "hsl(var(--warning))" },
];

export const topStudents = [
  { rank: 1, name: "John Doe",      class: "SS2 A", score: 92 },
  { rank: 2, name: "Emily Davis",   class: "SS3 A", score: 89 },
  { rank: 3, name: "Michael Brown", class: "SS1 B", score: 87 },
  { rank: 4, name: "Jane Smith",    class: "SS2 A", score: 85 },
  { rank: 5, name: "Daniel Wilson", class: "JSS 3 A", score: 84 },
];

// Teacher
export const teacherClasses = [
  { code: "SS2 A",   subject: "Mathematics", students: 28, attendance: 90 },
  { code: "SS1 B",   subject: "Mathematics", students: 26, attendance: 88 },
  { code: "SS3 A",   subject: "Mathematics", students: 30, attendance: 92 },
  { code: "JSS 3 A", subject: "Mathematics", students: 25, attendance: 85 },
];

export const todaySchedule = [
  { time: "8:00 AM",  klass: "SS2 A - Mathematics", room: "Room 12", status: "Ongoing"  },
  { time: "10:00 AM", klass: "SS1 B - Mathematics", room: "Room 10", status: "Ongoing"  },
  { time: "12:00 PM", klass: "SS3 A - Mathematics", room: "Room 15", status: "Upcoming" },
  { time: "2:00 PM",  klass: "JSS 3 A - Mathematics", room: "Room 8", status: "Upcoming" },
];

export const pendingGrading = [
  { student: "John Doe",      class: "SS2 A", assessment: "Algebra Test",  due: "May 21, 2025" },
  { student: "Jane Smith",    class: "SS2 A", assessment: "Algebra Test",  due: "May 21, 2025" },
  { student: "Michael Brown", class: "SS1 B", assessment: "Quiz 1",        due: "May 22, 2025" },
  { student: "Emily Davis",   class: "SS3 A", assessment: "Trigonometry", due: "May 22, 2025" },
  { student: "Daniel Wilson", class: "JSS 3 A", assessment: "Quiz 1",      due: "May 23, 2025" },
];

export const recentSubmissions = [
  { title: "Algebra Homework",       class: "SS2 A", count: "15/28 Submitted", time: "20 mins ago" },
  { title: "Quiz 1",                 class: "SS1 B", count: "20/26 Submitted", time: "1 hour ago"   },
  { title: "Trigonometry Assignment",class: "SS3 A", count: "18/30 Submitted", time: "2 hours ago"  },
  { title: "Word Problems",          class: "JSS 3 A", count: "16/25 Submitted", time: "3 hours ago" },
];

// Student
export const studentStats = [
  { label: "Upcoming Exams",  value: "3",    sub: "View all",                color: "student" },
  { label: "Attendance",      value: "92%",  sub: "View details",            color: "success" },
  { label: "Recent Score",    value: "85%",  sub: "In Mathematics",          color: "warning" },
  { label: "Assigned Tasks",  value: "4",    sub: "View all",                color: "info"    },
];

export const upcomingExams = [
  { subject: "Mathematics Test", date: "May 22, 2025", left: "2 days left" },
  { subject: "English Language", date: "May 25, 2025", left: "5 days left" },
  { subject: "Physics Test",     date: "May 28, 2025", left: "8 days left" },
];

export const performanceTrend = [
  { subject: "Maths",     score: 60 },
  { subject: "English",   score: 70 },
  { subject: "Physics",   score: 65 },
  { subject: "Chemistry", score: 75 },
  { subject: "Biology",   score: 78 },
  { subject: "Civic",     score: 88 },
];

export const announcements = [
  { title: "Science Fair 2025", desc: "All students are invited to participate in the annual fair.", time: "2 hours ago" },
  { title: "School Holiday",    desc: "School will be closed on May 30th for public holiday.",       time: "1 day ago"   },
  { title: "New Library Resources", desc: "New assignment books are now available in the library.", time: "2 days ago" },
];

export const studentResults = [
  { subject: "Mathematics",      score: 85, grade: "A", remark: "Excellent" },
  { subject: "English Language", score: 78, grade: "B", remark: "Good"      },
  { subject: "Physics",          score: 82, grade: "A", remark: "Excellent" },
  { subject: "Chemistry",        score: 74, grade: "B", remark: "Good"      },
  { subject: "Biology",          score: 88, grade: "A", remark: "Excellent" },
  { subject: "Civic Education",  score: 65, grade: "C", remark: "Average"   },
];

export const examQuestions = [
  { q: "What is the derivative of 5x³ + 3x?", options: ["15x² + 3", "5x² + 3", "15x²", "3x² + 5"], correct: 0 },
  { q: "Solve: 2x + 4 = 10",                 options: ["x = 2", "x = 3", "x = 4", "x = 5"],     correct: 1 },
  { q: "What is √144?",                       options: ["10", "11", "12", "13"],                 correct: 2 },
  { q: "Integral of 2x dx is",                options: ["x² + C", "2x² + C", "x + C", "2 + C"],  correct: 0 },
  { q: "Sin(90°) equals",                     options: ["0", "1", "-1", "0.5"],                  correct: 1 },
];

export const libraryFiles = [
  { name: "Physics Notes.pdf",            category: "Physics",     date: "May 18, 2025" },
  { name: "English Essay Guide.pdf",      category: "English",     date: "May 17, 2025" },
  { name: "Chemistry Practical.docx",     category: "Chemistry",   date: "May 15, 2025" },
  { name: "SS2 Mathematics Past Questions.pdf", category: "Mathematics", date: "May 10, 2025" },
];

// Parent
export const childOverview = {
  name: "John Doe", class: "SS2 A", performance: 85, attendance: 92, lastResult: "B", subjects: 8,
};

export const attendanceLog = [
  { date: "May 20, 2025", day: "Tue", status: "Present", class: "Mathematics" },
  { date: "May 19, 2025", day: "Mon", status: "Present", class: "English Language" },
  { date: "May 16, 2025", day: "Fri", status: "Absent",  class: "Physics" },
  { date: "May 15, 2025", day: "Thu", status: "Present", class: "Chemistry" },
  { date: "May 14, 2025", day: "Wed", status: "Present", class: "Biology" },
  { date: "May 13, 2025", day: "Tue", status: "Late",    class: "Civic Education" },
];

export const activityFeed = [
  { icon: "fileCheck", title: "Test Completed",      desc: "John completed Mathematics Test",   time: "2 hours ago" },
  { icon: "upload",    title: "Assignment Submitted",desc: "John submitted Physics Assignment", time: "1 day ago"   },
  { icon: "userX",     title: "Absent from Class",   desc: "John was absent in Physics class",  time: "May 16, 2025" },
  { icon: "award",     title: "New Result Published",desc: "Mathematics result has been published", time: "May 15, 2025" },
];

export const fees = [
  { desc: "School Fees (Term 3)", amount: "₦50,000", status: "Paid",    due: "May 5, 2025"  },
  { desc: "Development Levy",     amount: "₦15,000", status: "Paid",    due: "May 5, 2025"  },
  { desc: "Exam Fee",             amount: "₦10,000", status: "Pending", due: "May 30, 2025" },
];
