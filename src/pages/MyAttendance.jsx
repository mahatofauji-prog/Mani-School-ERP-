import React from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { PageHeader, EmptyState, StatCard } from "@/components/ui-helpers";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClipboardList, Loader2, CheckCircle2 } from "lucide-react";

export default function MyAttendance() {
  const { data: records = [], isLoading } = useQuery({
    queryKey: ["my-attendance"], queryFn: async () => (await api.get("/attendance")).data,
  });
  const present = records.filter((r) => r.status === "present").length;
  const pct = records.length ? Math.round((present / records.length) * 100) : 0;

  return (
    <div>
      <PageHeader title="My Attendance" subtitle="Your attendance history" />
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : records.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No attendance records" description="Your attendance will appear here once marked by your teacher." />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <StatCard label="Attendance %" value={`${pct}%`} icon={CheckCircle2} accent="text-emerald-600" />
            <StatCard label="Present" value={present} icon={ClipboardList} />
            <StatCard label="Total Days" value={records.length} icon={ClipboardList} />
          </div>
          <div className="bg-white border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader><TableRow className="bg-secondary/50"><TableHead className="text-xs uppercase tracking-wider">Date</TableHead><TableHead className="text-xs uppercase tracking-wider">Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.date}</TableCell>
                    <TableCell className="capitalize font-medium">{r.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
