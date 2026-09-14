import {
  LayoutDashboard, School, Users, GraduationCap, UserCog, BookOpen,
  Layers, Grid3x3, CalendarCheck, ScrollText, User, Baby, ClipboardList,
  CreditCard, ToggleRight, Megaphone, Activity, Settings, Building2, UsersRound, Video, Fingerprint,
} from "lucide-react";

// Founder portal — grouped "master console" navigation
export const FOUNDER_NAV = [
  { title: null, items: [{ to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true }] },
  { title: "Management", items: [
    { to: "/app/schools", label: "All Schools", icon: Building2 },
    { to: "/app/users", label: "Global Users", icon: UsersRound },
  ]},
  { title: "Billing", items: [
    { to: "/app/plans", label: "Plans", icon: CreditCard },
    { to: "/app/subscriptions", label: "Subscriptions", icon: School },
  ]},
  { title: "Platform", items: [
    { to: "/app/modules", label: "Feature Modules", icon: ToggleRight },
    { to: "/app/announcements", label: "Announcements", icon: Megaphone },
    { to: "/app/audit", label: "Audit Logs", icon: ScrollText },
    { to: "/app/health", label: "System Health", icon: Activity },
    { to: "/app/settings", label: "Platform Settings", icon: Settings },
  ]},
  { title: "Account", items: [{ to: "/app/profile", label: "Founder Profile", icon: User }] },
];

// School-scoped roles — flat nav; `module` gates visibility by school's enabled_modules
export const NAV = {
  school_admin: [
    { to: "/app", label: "Dashboard", icon: LayoutDashboard },
    { to: "/app/school-profile", label: "School Profile", icon: Building2 },
    { to: "/app/teachers", label: "Teachers", icon: GraduationCap, module: "teachers" },
    { to: "/app/students", label: "Students", icon: Users, module: "students" },
    { to: "/app/parents", label: "Parents", icon: Baby, module: "parents" },
    { to: "/app/principals", label: "Principal", icon: UserCog, module: "principal" },
    { to: "/app/classes", label: "Classes", icon: Layers, module: "classes" },
    { to: "/app/sections", label: "Sections", icon: Grid3x3, module: "sections" },
    { to: "/app/subjects", label: "Subjects", icon: BookOpen, module: "subjects" },
    { to: "/app/attendance", label: "Attendance", icon: CalendarCheck, module: "attendance" },
    { to: "/app/biometric", label: "Biometric", icon: Fingerprint, flag: "biometric_attendance" },
    { to: "/app/id-card", label: "ID Cards", icon: UserCog },
    { to: "/app/announcements-feed", label: "Announcements", icon: Megaphone },
    { to: "/app/audit", label: "Audit Logs", icon: ScrollText },
    { to: "/app/profile", label: "Profile", icon: User },
  ],
  principal: [
    { to: "/app", label: "Dashboard", icon: LayoutDashboard },
    { to: "/app/teachers", label: "Teachers", icon: GraduationCap, module: "teachers" },
    { to: "/app/students", label: "Students", icon: Users, module: "students" },
    { to: "/app/classes", label: "Classes", icon: Layers, module: "classes" },
    { to: "/app/attendance", label: "Attendance", icon: CalendarCheck, module: "attendance" },
    { to: "/app/biometric", label: "Biometric", icon: Fingerprint, flag: "biometric_attendance" },
    { to: "/app/announcements-feed", label: "Announcements", icon: Megaphone },
    { to: "/app/audit", label: "Audit Logs", icon: ScrollText },
    { to: "/app/profile", label: "Profile", icon: User },
  ],
  teacher: [
    { to: "/app", label: "Dashboard", icon: LayoutDashboard },
    { to: "/app/my-classes", label: "My Classes", icon: Layers },
    { to: "/app/students", label: "My Students", icon: Users, module: "students" },
    { to: "/app/attendance", label: "Attendance", icon: CalendarCheck, module: "attendance" },
    { to: "/app/homework", label: "Homework", icon: ClipboardList },
    { to: "/app/materials", label: "Notes & Material", icon: BookOpen },
    { to: "/app/videos", label: "Class Videos", icon: Video },
    { to: "/app/id-card", label: "My ID Card", icon: User },
    { to: "/app/announcements-feed", label: "Announcements", icon: Megaphone },
    { to: "/app/profile", label: "Profile", icon: User },
  ],
  student: [
    { to: "/app", label: "Dashboard", icon: LayoutDashboard },
    { to: "/app/my-attendance", label: "Attendance", icon: ClipboardList, module: "attendance" },
    { to: "/app/homework", label: "Homework", icon: ClipboardList },
    { to: "/app/materials", label: "Study Material", icon: BookOpen },
    { to: "/app/videos", label: "Class Videos", icon: Video },
    { to: "/app/id-card", label: "My ID Card", icon: User },
    { to: "/app/announcements-feed", label: "Announcements", icon: Megaphone },
    { to: "/app/profile", label: "Profile", icon: User },
  ],
  parent: [
    { to: "/app", label: "Dashboard", icon: LayoutDashboard },
    { to: "/app/children", label: "Children", icon: Baby },
    { to: "/app/homework", label: "Homework", icon: ClipboardList },
    { to: "/app/materials", label: "Study Material", icon: BookOpen },
    { to: "/app/videos", label: "Class Videos", icon: Video },
    { to: "/app/announcements-feed", label: "Announcements", icon: Megaphone },
    { to: "/app/profile", label: "Profile", icon: User },
  ],
};

export const ROLE_LABELS = {
  founder_admin: "Founder Admin",
  school_admin: "School Admin",
  principal: "Principal",
  teacher: "Teacher",
  student: "Student",
  parent: "Parent",
};

export const MODULE_LABELS = {
  students: "Students", teachers: "Teachers", parents: "Parents", principal: "Principal",
  classes: "Classes", sections: "Sections", subjects: "Subjects", attendance: "Attendance",
  timetable: "Timetable", homework: "Homework", assignments: "Assignments", exams: "Exams",
  results: "Results", fees: "Fees", notices: "Notices", library: "Library", transport: "Transport",
  reports: "Reports", certificates: "Certificates", documents: "Documents", communication: "Communication",
};

export const ALL_MODULES = Object.keys(MODULE_LABELS);
