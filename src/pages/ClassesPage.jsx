import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, { apiError } from "@/lib/api";
import { toast } from "sonner";
import { PageHeader, EmptyState } from "@/components/ui-helpers";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Layers, Plus, Trash2, Loader2 } from "lucide-react";

export default function ClassesPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [confirmTarget, setConfirmTarget] = useState(null);

  const { data: classes = [], isLoading } = useQuery({
    queryKey: ["classes"], queryFn: async () => (await api.get("/classes")).data,
  });
  const createMut = useMutation({
    mutationFn: async () => (await api.post("/classes", { name })).data,
    onSuccess: () => { toast.success("Class added"); setName(""); qc.invalidateQueries({ queryKey: ["classes"] }); },
    onError: (e) => toast.error(apiError(e)),
  });
  const delMut = useMutation({
    mutationFn: async (id) => (await api.delete(`/classes/${id}`)).data,
    onSuccess: () => { toast.success("Class deleted"); qc.invalidateQueries({ queryKey: ["classes"] }); setConfirmTarget(null); },
    onError: (e) => { toast.error(apiError(e)); setConfirmTarget(null); },
  });

  return (
    <div>
      <PageHeader title="Classes" subtitle="Define the classes offered by your school" />
      <form onSubmit={(e) => { e.preventDefault(); if (name.trim()) createMut.mutate(); }}
        className="flex gap-2 mb-6 max-w-md">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Class 6" data-testid="class-name-input" />
        <Button type="submit" disabled={createMut.isPending || !name.trim()} data-testid="add-class-button" className="bg-primary hover:bg-primary/90 gap-2 shrink-0">
          {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add
        </Button>
      </form>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : classes.length === 0 ? (
        <EmptyState icon={Layers} title="No classes yet" description="Add classes specific to your school." />
      ) : (
        <div className="bg-white border border-border rounded-lg overflow-hidden max-w-2xl">
          <Table>
            <TableHeader><TableRow className="bg-secondary/50"><TableHead className="text-xs uppercase tracking-wider">Class</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody data-testid="classes-table">
              {classes.map((c) => (
                <TableRow key={c.id} data-testid={`class-row-${c.name}`}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setConfirmTarget(c)} data-testid={`delete-class-${c.name}`}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <ConfirmDialog open={!!confirmTarget} onOpenChange={(o) => !o && setConfirmTarget(null)}
        title={`Delete ${confirmTarget?.name}?`} description="This also removes its sections. Students in this class keep their record but lose the class link."
        confirmLabel="Delete" loading={delMut.isPending} onConfirm={() => delMut.mutate(confirmTarget.id)} />
    </div>
  );
}
