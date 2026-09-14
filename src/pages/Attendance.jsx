import React, { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, { apiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { PageHeader, EmptyState } from "@/components/ui-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarCheck, Loader2, Check, X, Clock, Hand, Fingerprint, QrCode } from "lucide-react";
import { QrAttendancePanel } from "@/components/QrAttendancePanel";

const STATUSES = [
  { value: "present", label: "Present", icon: Check, cls: "bg-emerald-600 text-white border-emerald-600" },
  { value: "absent", label: "Absent", icon: X, cls: "bg-destructive text-white border-destructive" },
  { value: "late", label: "Late", icon: Clock, cls: "bg-amber-500 text-white border-amber-500" },
];

export default function Attendance() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const biometricEnabled = !!user?.biometric_attendance;
  const qrEnabled = !!user?.qr_attendance;
  const today = new Date().toISOString().slice(0, 10);
  const [method, setMethod] = useState("manual");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [date, setDate] = useState(today);
  const [marks, setMarks] = useState({});

  const { data: classes = [] } = useQuery({ queryKey: ["classes"], queryFn: async () => (await api.get("/classes")).data });
  const { data: sections = [] } = useQuery({ queryKey: ["sections"], queryFn: async () => (await api.get("/sections")).data });
  const { data: students = [], isLoading } = useQuery({
    queryKey: ["users", "student"], queryFn: async () => (await api.get("/users?role=student")).data,
  });

  const { data: attendanceData = [] } = useQuery({
    queryKey: ["attendance-records", classId, sectionId, date],
    queryFn: async () => {
      if (!classId) return [];
      let url = `/attendance?date=${date}&class_id=${classId}`;
      if (sectionId) url += `&section_id=${sectionId}`;
      const res = await api.get(url);
      return res.data;
    },
    enabled: !!classId && !!date,
  });

  useEffect(() => {
    if (attendanceData && attendanceData.length > 0) {
      const recordMap = {};
      attendanceData.forEach((att) => {
        if (Array.isArray(att.records)) {
          att.records.forEach((r) => {
            if (r.student_id) recordMap[r.student_id] = r.status || "present";
          });
        }
      });
      setMarks(recordMap);
    }
  }, [attendanceData]);

  const filteredSections = sections.filter((s) => s.class_id === classId);
  const classStudents = useMemo(
    () => students.filter((s) => s.class_id === classId && (!sectionId || s.section_id === sectionId)),
    [students, classId, sectionId]
  );

  const saveMut = useMutation({
    mutationFn: async () => {
      const records = classStudents.map((s) => ({ student_id: s.id, status: marks[s.id] || "present" }));
      return (await api.post("/attendance", { class_id: classId, section_id: sectionId, date, records })).data;
    },
    onSuccess: () => {
      toast.success("Attendance saved successfully");
      qc.invalidateQueries({ queryKey: ["attendance-records"] });
    },
    onError: (e) => toast.error(apiError(e)),
  });

  return (
    <div>
      <PageHeader title="Attendance" subtitle="Mark daily attendance for a class" />

      {(qrEnabled || biometricEnabled) && (
        <div className="flex gap-2 mb-6" data-testid="attendance-method-selector">
          <button onClick={() => setMethod("manual")} data-testid="method-manual"
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium border transition-colors ${method === "manual" ? "bg-primary text-white border-primary" : "bg-white text-slate-600 border-border hover:border-slate-400"}`}>
            <Hand className="h-4 w-4" /> Manual
          </button>
          {qrEnabled && (
            <button onClick={() => setMethod("qr")} data-testid="method-qr"
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium border transition-colors ${method === "qr" ? "bg-primary text-white border-primary" : "bg-white text-slate-600 border-border hover:border-slate-400"}`}>
              <QrCode className="h-4 w-4" /> QR Code
            </button>
          )}
          {biometricEnabled && (
            <button onClick={() => setMethod("biometric")} data-testid="method-biometric"
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium border transition-colors ${method === "biometric" ? "bg-primary text-white border-primary" : "bg-white text-slate-600 border-border hover:border-slate-400"}`}>
              <Fingerprint className="h-4 w-4" /> Biometric
            </button>
          )}
        </div>
      )}

      {biometricEnabled && method === "biometric" ? (
        <div className="bg-white border border-border rounded-lg p-8 text-center" data-testid="biometric-attendance-panel">
          <Fingerprint className="h-10 w-10 text-primary mx-auto mb-3" />
          <h3 className="font-display font-semibold text-slate-900">Biometric Attendance</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">Attendance is captured and synced automatically from enrolled biometric devices. Manage devices and student enrolment on the Biometric page.</p>
          <Button asChild className="mt-4 bg-primary hover:bg-primary/90"><a href="/app/biometric" data-testid="go-to-biometric">Open Biometric Devices</a></Button>
        </div>
      ) : (
      <>
      <div className="bg-white border border-border rounded-lg p-5 mb-6 grid sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label className="text-sm">Class</Label>
          <Select value={classId} onValueChange={(v) => { setClassId(v); setSectionId(""); setMarks({}); }}>
            <SelectTrigger data-testid="attendance-class-select"><SelectValue placeholder="Select class" /></SelectTrigger>
            <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">Section</Label>
          <Select value={sectionId} onValueChange={setSectionId} disabled={!classId}>
            <SelectTrigger data-testid="attendance-section-select"><SelectValue placeholder="All sections" /></SelectTrigger>
            <SelectContent>{filteredSections.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} data-testid="attendance-date-input" />
        </div>
      </div>

      {method === "qr" && qrEnabled ? (
        !classId ? (
          <EmptyState icon={QrCode} title="Select a class to begin" description="Choose the class and section above, then start scanning student ID-card QR codes." />
        ) : (
          <QrAttendancePanel classId={classId} sectionId={sectionId} date={date} />
        )
      ) : !classId ? (
        <EmptyState icon={CalendarCheck} title="Select a class" description="Choose a class to load its students and mark attendance." />
      ) : isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : classStudents.length === 0 ? (
        <EmptyState icon={CalendarCheck} title="No students in this class" description="Add students to this class first." />
      ) : (
        <div className="bg-white border border-border rounded-lg overflow-hidden">
          <div className="divide-y divide-border" data-testid="attendance-list">
            {classStudents.map((s) => {
              const current = marks[s.id] || "present";
              return (
                <div key={s.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4">
                  <div>
                    <div className="font-medium text-slate-900">{s.name}</div>
                    <div className="text-xs text-muted-foreground">Roll {s.roll_number || "—"}</div>
                  </div>
                  <div className="flex gap-2">
                    {STATUSES.map((st) => {
                      const Icon = st.icon;
                      const active = current === st.value;
                      return (
                        <button key={st.value} onClick={() => setMarks((m) => ({ ...m, [s.id]: st.value }))}
                          data-testid={`mark-${st.value}-${s.email}`}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${active ? st.cls : "bg-white text-slate-600 border-border hover:border-slate-400"}`}>
                          <Icon className="h-3.5 w-3.5" /> {st.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="p-4 border-t border-border flex justify-end">
            <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending} data-testid="save-attendance-button" className="bg-primary hover:bg-primary/90">
              {saveMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Attendance
            </Button>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}
