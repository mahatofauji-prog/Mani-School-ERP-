import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, { apiError } from "@/lib/api";
import { toast } from "sonner";
import { PageHeader, EmptyState } from "@/components/ui-helpers";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BookOpen, Plus, Trash2, Loader2 } from "lucide-react";

export default function SubjectsPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [confirmTarget, setConfirmTarget] = useState(null);

  const { data: subjects = [], isLoading } = useQuery({ queryKey: ["subjects"], queryFn: async () => (await api.get("/subjects")).data });
  const createMut = useMutation({
    mutationFn: async () => (await api.post("/subjects", { name, code })).data,
    onSuccess: () => { toast.success("Subject added"); setName(""); setCode(""); qc.invalidateQueries({ queryKey: ["subjects"] }); },
    onError: (e) => toast.error(apiError(e)),
  });
  const delMut = useMutation({
    mutationFn: async (id) => (await api.delete(`/subjects/${id}`)).data,
    onSuccess: () => { toast.success("Subject deleted"); qc.invalidateQueries({ queryKey: ["subjects"] }); setConfirmTarget(null); },
    onError: (e) => { toast.error(apiError(e)); setConfirmTarget(null); },
  });

  return (
    <div>
      <PageHeader title="Subjects" subtitle="Manage the subjects taught at your school" />
      <form onSubmit={(e) => { e.preventDefault(); if (name.trim()) createMut.mutate(); }} className="flex flex-col sm:flex-row gap-2 mb-6 max-w-2xl">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mathematics" data-testid="subject-name-input" />
        <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code (optional)" className="sm:w-40" />
        <Button type="submit" disabled={createMut.isPending || !name.trim()} data-testid="add-subject-button" className="bg-primary hover:bg-primary/90 gap-2 shrink-0">
          {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add
        </Button>
      </form>
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : subjects.length === 0 ? (
        <EmptyState icon={BookOpen} title="No subjects yet" description="Add subjects offered by your school." />
      ) : (
        <div className="bg-white border border-border rounded-lg overflow-hidden max-w-2xl">
          <Table>
            <TableHeader><TableRow className="bg-secondary/50"><TableHead className="text-xs uppercase tracking-wider">Subject</TableHead><TableHead className="text-xs uppercase tracking-wider">Code</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody data-testid="subjects-table">
              {subjects.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">{s.code || "—"}</TableCell>
                  <TableCell className="text-right"><Button variant="ghost" size="icon" className="text-destructive" onClick={() => setConfirmTarget(s)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <ConfirmDialog open={!!confirmTarget} onOpenChange={(o) => !o && setConfirmTarget(null)}
        title={`Delete ${confirmTarget?.name}?`} description="This removes the subject." confirmLabel="Delete"
        loading={delMut.isPending} onConfirm={() => delMut.mutate(confirmTarget.id)} />
    </div>
  );
}
