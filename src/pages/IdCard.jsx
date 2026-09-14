import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, EmptyState } from "@/components/ui-helpers";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap, Printer, IdCard as IdIcon, Loader2 } from "lucide-react";

function Card({ person, role, school }) {
  const initials = (person?.name || "?").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  const qrValue = role === "student" && person?.qr_token
    ? `MANIQR:${person.qr_token}`
    : `MANI|${school?.code || ""}|${role}|${person?.id || ""}`;
  const rows = role === "student"
    ? [["Student ID", person?.id?.slice(-8)], ["Admission No.", person?.admission_number], ["Roll No.", person?.roll_number], ["Session", school?.academic_year || person?.session]]
    : [["Employee ID", person?.id?.slice(-8)], ["Designation", person?.designation || "Teacher"], ["Qualification", person?.qualification], ["Phone", person?.phone]];
  return (
    <div className="id-card mx-auto bg-white rounded-xl overflow-hidden shadow-lg border border-slate-200" style={{ width: 340 }}>
      <div className="bg-primary text-white px-4 py-3 flex items-center gap-3">
        {school?.logo_path
          ? <img src={`${api.defaults.baseURL}/files/${school.logo_path}`} alt="logo" className="h-9 w-9 rounded bg-white object-contain" />
          : <div className="h-9 w-9 rounded bg-white/20 flex items-center justify-center"><GraduationCap className="h-5 w-5" /></div>}
        <div className="leading-tight min-w-0">
          <div className="font-display font-bold text-sm truncate">{school?.name || "School"}</div>
          <div className="text-[10px] text-white/80 truncate">{[school?.city, school?.state].filter(Boolean).join(", ")}</div>
        </div>
      </div>
      <div className="px-4 pt-4 pb-2 flex gap-4">
        <div className="h-24 w-20 rounded-md bg-primary/10 flex items-center justify-center shrink-0 text-2xl font-display font-bold text-primary">{initials}</div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{role} ID Card</div>
          <div className="font-display font-bold text-lg text-slate-900 leading-tight">{person?.name}</div>
          {role === "student" && <div className="text-sm text-slate-600">Class {person?.class_name || person?.class_id ? (person?.class_name || "") : ""} {person?.section_name || ""}</div>}
          <div className="mt-1 space-y-0.5">
            {rows.filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="text-xs text-slate-600"><span className="text-muted-foreground">{k}:</span> <b className="text-slate-800">{v}</b></div>
            ))}
          </div>
        </div>
      </div>
      <div className="px-4 pb-4 flex items-end justify-between">
        <div className="bg-white p-1 rounded" data-testid="idcard-qr"><QRCodeSVG value={qrValue} size={64} level="M" /></div>
        <div className="text-right">
          <div className="h-8 border-b border-slate-300 w-24" />
          <div className="text-[10px] text-muted-foreground mt-0.5">Authorised Signatory</div>
        </div>
      </div>
      <div className="bg-slate-900 text-white/80 text-[10px] text-center py-1">MANI SCHOOL ERP</div>
    </div>
  );
}

export default function IdCard() {
  const { user } = useAuth();
  const isSelf = ["student", "teacher"].includes(user?.role);
  const isAdmin = ["school_admin", "principal"].includes(user?.role);
  const [role, setRole] = useState("student");
  const [pickId, setPickId] = useState("");

  const { data: school } = useQuery({
    queryKey: ["my-school-card"],
    queryFn: async () => (await api.get("/my-school")).data,
    enabled: isAdmin,
  });
  const { data: people = [], isLoading } = useQuery({
    queryKey: ["idcard-people", role],
    queryFn: async () => (await api.get(`/users?role=${role}`)).data,
    enabled: isAdmin,
  });
  const { data: self } = useQuery({
    queryKey: ["idcard-self"],
    queryFn: async () => (await api.get(`/users/${user.id}`)).data,
    enabled: isSelf,
  });

  useEffect(() => { if (isAdmin && people.length && !pickId) setPickId(people[0].id); }, [people, isAdmin, pickId]);

  const person = isSelf ? self : people.find((p) => p.id === pickId);
  const cardRole = isSelf ? user.role : role;
  const selfSchool = { name: user?.school_name };

  return (
    <div>
      <PageHeader title={isSelf ? "My ID Card" : "ID Cards"} subtitle="Preview and print identity cards">
        <Button onClick={() => window.print()} className="bg-primary hover:bg-primary/90 gap-2" data-testid="print-idcard"><Printer className="h-4 w-4" /> Print / Save PDF</Button>
      </PageHeader>

      {isAdmin && (
        <div className="flex flex-col sm:flex-row gap-3 mb-6 no-print">
          <Select value={role} onValueChange={(v) => { setRole(v); setPickId(""); }}>
            <SelectTrigger className="w-40" data-testid="idcard-role-select"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="student">Students</SelectItem><SelectItem value="teacher">Teachers</SelectItem></SelectContent>
          </Select>
          <Select value={pickId} onValueChange={setPickId}>
            <SelectTrigger className="w-64" data-testid="idcard-person-select"><SelectValue placeholder="Select a person" /></SelectTrigger>
            <SelectContent>{people.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} · {p.email}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}

      {(isSelf ? !self : isLoading) ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : !person ? (
        <EmptyState icon={IdIcon} title="No record to show" description={isAdmin ? "Add a student or teacher first." : "Your profile is not available yet."} />
      ) : (
        <div className="py-4" data-testid="idcard-preview">
          <Card person={person} role={cardRole} school={isSelf ? selfSchool : school} />
        </div>
      )}

      <style>{`@media print { .no-print{display:none!important} body *{visibility:hidden} .id-card, .id-card *{visibility:visible} .id-card{position:absolute;left:20px;top:20px} }`}</style>
    </div>
  );
}
