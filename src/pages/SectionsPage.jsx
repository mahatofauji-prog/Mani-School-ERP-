import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, { apiError } from "@/lib/api";
import { toast } from "sonner";
import { PageHeader, EmptyState } from "@/components/ui-helpers";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Grid3x3, Plus, Trash2, Loader2 } from "lucide-react";

export default function SectionsPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [classId, setClassId] = useState("");
  const [confirmTarget, setConfirmTarget] = useState(null);

  const { data: classes = [] } = useQuery({ queryKey: ["classes"], queryFn: async () => (await api.get("/classes")).data });
  const { data: sections = [], isLoading } = useQuery({ queryKey: ["sections"], queryFn: async () => (await api.get("/sections")).data });

  const createMut = useMutation({
    mutationFn: async () => (await api.post("/sections", { name, class_id: classId })).data,
    onSuccess: () => { toast.success("Section added"); setName(""); qc.invalidateQueries({ queryKey: ["sections"] }); },
    onError: (e) => toast.error(apiError(e)),
  });
  const delMut = useMutation({
    mutationFn: async (id) => (await api.delete(`/sections/${id}`)).data,
    onSuccess: () => { toast.success("Section deleted"); qc.invalidateQueries({ queryKey: ["sections"] }); setConfirmTarget(null); },
    onError: (e) => { toast.error(apiError(e)); setConfirmTarget(null); },
  });

  const className = (id) => classes.find((c) => c.id === id)?.name || "—";

  return (
    <div>
      <PageHeader title="Sections" subtitle="Add sections within each class" />
      {classes.length === 0 ? (
        <EmptyState icon={Grid3x3} title="Add a class first" description="Sections belong to a class. Create classes before adding sections." />
      ) : (
        <>
          <form onSubmit={(e) => { e.preventDefault(); if (name.trim() && classId) createMut.mutate(); }}
            className="flex flex-col sm:flex-row gap-2 mb-6 max-w-2xl">
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger className="sm:w-56" data-testid="section-class-select"><SelectValue placeholder="Select class" /></SelectTrigger>
              <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Section A" data-testid="section-name-input" />
            <Button type="submit" disabled={createMut.isPending || !name.trim() || !classId} data-testid="add-section-button" className="bg-primary hover:bg-primary/90 gap-2 shrink-0">
              {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add
            </Button>
          </form>

          {isLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : sections.length === 0 ? (
            <EmptyState icon={Grid3x3} title="No sections yet" description="Select a class and add its sections." />
          ) : (
            <div className="bg-white border border-border rounded-lg overflow-hidden max-w-2xl">
              <Table>
                <TableHeader><TableRow className="bg-secondary/50"><TableHead className="text-xs uppercase tracking-wider">Section</TableHead><TableHead className="text-xs uppercase tracking-wider">Class</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody data-testid="sections-table">
                  {sections.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-muted-foreground">{className(s.class_id)}</TableCell>
                      <TableCell className="text-right"><Button variant="ghost" size="icon" className="text-destructive" onClick={() => setConfirmTarget(s)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}
      <ConfirmDialog open={!!confirmTarget} onOpenChange={(o) => !o && setConfirmTarget(null)}
        title={`Delete section ${confirmTarget?.name}?`} description="This removes the section." confirmLabel="Delete"
        loading={delMut.isPending} onConfirm={() => delMut.mutate(confirmTarget.id)} />
    </div>
  );
}
