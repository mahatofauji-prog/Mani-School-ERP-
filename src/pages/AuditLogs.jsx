import React from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { PageHeader, EmptyState } from "@/components/ui-helpers";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollText, Loader2 } from "lucide-react";

export default function AuditLogs() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit"], queryFn: async () => (await api.get("/audit?limit=200")).data,
  });

  return (
    <div>
      <PageHeader title="Audit Logs" subtitle="A trail of important actions across the platform" />
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : logs.length === 0 ? (
        <EmptyState icon={ScrollText} title="No activity yet" description="Actions like creating schools, users and marking attendance will be logged here." />
      ) : (
        <div className="bg-white border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/50">
                  <TableHead className="text-xs uppercase tracking-wider">Time</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Actor</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Action</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Entity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody data-testid="audit-table">
                {logs.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(l.timestamp).toLocaleString()}</TableCell>
                    <TableCell><div className="font-medium">{l.actor_name}</div><div className="text-xs text-muted-foreground capitalize">{l.actor_role?.replace("_", " ")}</div></TableCell>
                    <TableCell><span className="font-mono text-xs bg-secondary px-2 py-1 rounded">{l.action}</span></TableCell>
                    <TableCell className="text-muted-foreground capitalize">{l.entity_type}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
