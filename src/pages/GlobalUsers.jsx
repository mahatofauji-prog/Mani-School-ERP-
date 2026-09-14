import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, { apiError } from "@/lib/api";
import { toast } from "sonner";
import { PageHeader, EmptyState, StatusBadge } from "@/components/ui-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { UsersRound, Search, MoreVertical, Loader2 } from "lucide-react";

const ROLES = ["all", "school_admin", "principal", "teacher", "student", "parent"];
const ROLE_LABEL = { school_admin: "School Admin", principal: "Principal", teacher: "Teacher", student: "Student", parent: "Parent", founder_admin: "Founder" };

export default function GlobalUsers() {
  const qc = useQueryClient();
  const [role, setRole] = useState("all");
  const [search, setSearch] = useState("");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["global-users", role],
    queryFn: async () => (await api.get(role === "all" ? "/users" : `/users?role=${role}`)).data,
  });

  const statusMut = useMutation({
    mutationFn: async ({ id, status }) => (await api.patch(`/users/${id}/status`, { status })).data,
    onSuccess: () => { toast.success("User updated"); qc.invalidateQueries({ queryKey: ["global-users"] }); },
    onError: (e) => toast.error(apiError(e)),
  });

  const view = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter((u) => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.school_name?.toLowerCase().includes(q));
  }, [users, search]);

  return (
    <div>
      <PageHeader title="Global Users" subtitle="Every user across all schools on the platform" />
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="w-44" data-testid="user-role-filter"><SelectValue /></SelectTrigger>
          <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r === "all" ? "All roles" : ROLE_LABEL[r]}</SelectItem>)}</SelectContent>
        </Select>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users…" className="pl-9" data-testid="user-search-input" />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>
      ) : view.length === 0 ? (
        <EmptyState icon={UsersRound} title="No users found" description="Users created by school admins will appear here." />
      ) : (
        <div className="bg-white border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/50">
                  <TableHead className="text-xs uppercase tracking-wider">Name</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Email</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Role</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">School</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Last Login</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider">Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody data-testid="global-users-table">
                {view.map((u) => (
                  <TableRow key={u.id} data-testid={`user-row-${u.email}`}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell><span className="text-xs font-medium bg-secondary px-2 py-1 rounded capitalize">{ROLE_LABEL[u.role] || u.role}</span></TableCell>
                    <TableCell className="text-muted-foreground">{u.school_name || "Platform"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{u.last_login ? new Date(u.last_login).toLocaleString() : "Never"}</TableCell>
                    <TableCell><StatusBadge status={u.status} /></TableCell>
                    <TableCell className="text-right">
                      {u.role !== "founder_admin" && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" data-testid={`user-actions-${u.email}`}><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => statusMut.mutate({ id: u.id, status: u.status === "active" ? "suspended" : "active" })}>{u.status === "active" ? "Disable" : "Enable"}</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
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
