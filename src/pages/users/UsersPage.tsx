import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  EllipsisHorizontalIcon,
  NoSymbolIcon,
  ShieldCheckIcon,
  UserCircleIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { PageHeader } from "@/components/shared/PageHeader";
import { Pagination } from "@/components/shared/Pagination";
import { FiltersBar } from "@/components/shared/FiltersBar";
import { ExportButton, type ExportColumn } from "@/components/shared/ExportButton";
import { EmptyState } from "@/components/shared/EmptyState";
import { TableSkeleton } from "@/components/shared/TableSkeleton";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminService } from "@/services/admin.service";
import { apiErrorMessage } from "@/services/api-client";
import { useAuthStore } from "@/store/auth.store";
import { formatDate } from "@/utils/format";
import type { Role, User } from "@/types/user";

const PAGE_SIZE = 10;
type RoleFilter = Role | "ALL";

const roleBadge: Record<Role, "secondary" | "info" | "default"> = {
  USER: "secondary",
  ADMIN: "info",
  SUPER_ADMIN: "default",
};

const exportColumns: ExportColumn[] = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "role", label: "Role" },
  { key: "isActive", label: "Status", format: (v) => (v ? "Active" : "Deactivated") },
  { key: "createdAt", label: "Joined", format: (v) => formatDate(v as string) },
];

export const UsersPage = (): JSX.Element => {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<RoleFilter>("ALL");
  const [statusTarget, setStatusTarget] = useState<User | null>(null);

  // FiltersBar debounces the search input; `search` already holds the settled value.
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users", { page, search, role }],
    queryFn: () =>
      adminService.listUsers({
        page,
        limit: PAGE_SIZE,
        search: search.trim() || undefined,
        role: role === "ALL" ? undefined : role,
      }),
  });

  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
  };

  const roleMutation = useMutation({
    mutationFn: ({ id, next }: { id: string; next: Role }) =>
      adminService.updateUserRole(id, next),
    onSuccess: (user) => {
      invalidate();
      toast.success(`${user.email} is now ${user.role}`);
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      adminService.updateUserStatus(id, isActive),
    onSuccess: (user) => {
      invalidate();
      toast.success(user.isActive ? `${user.email} reactivated` : `${user.email} deactivated`);
      setStatusTarget(null);
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";

  return (
    <div>
      <PageHeader title="Users" description="Manage accounts, roles, and access." />

      <FiltersBar
        search={{
          value: search,
          onChange: (value) => {
            setSearch(value);
            setPage(1);
          },
          placeholder: "Search name or email…",
          className: "sm:w-72",
        }}
        selects={[
          {
            key: "role",
            value: role,
            onChange: (value) => {
              setRole(value as RoleFilter);
              setPage(1);
            },
            placeholder: "Role",
            options: [
              { value: "ALL", label: "All roles" },
              { value: "USER", label: "User" },
              { value: "ADMIN", label: "Admin" },
              { value: "SUPER_ADMIN", label: "Super admin" },
            ],
          },
        ]}
        onClearAll={() => {
          setSearch("");
          setRole("ALL");
          setPage(1);
        }}
      >
        <ExportButton
          className="ml-auto"
          rows={(data?.items ?? []) as unknown as Record<string, unknown>[]}
          columns={exportColumns}
          fileName="users"
          title="Users"
          page={page}
          filterSummary={
            [search.trim() && `Search: ${search.trim()}`, role !== "ALL" && `Role: ${role}`]
              .filter(Boolean)
              .join(" · ") || undefined
          }
        />
      </FiltersBar>

      <Card>
        {isLoading ? (
          <TableSkeleton />
        ) : !data || data.items.length === 0 ? (
          <EmptyState title="No users found" description="Try a different search or filter." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Joined</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((user) => {
                const isSelf = user.id === currentUser?.id;
                const canManage =
                  !isSelf && (isSuperAdmin || user.role !== "SUPER_ADMIN");
                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {user.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt=""
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <UserCircleIcon className="h-8 w-8 text-muted-foreground" />
                        )}
                        <div className="min-w-0">
                          <p className="max-w-48 truncate font-medium">
                            {user.name}
                            {isSelf && (
                              <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>
                            )}
                          </p>
                          <p className="max-w-48 truncate text-xs text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={roleBadge[user.role]}>{user.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? "success" : "destructive"}>
                        {user.isActive ? "Active" : "Deactivated"}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden whitespace-nowrap text-xs text-muted-foreground md:table-cell">
                      {formatDate(user.createdAt)}
                    </TableCell>
                    <TableCell>
                      {canManage && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <EllipsisHorizontalIcon className="h-5 w-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Change role</DropdownMenuLabel>
                            {user.role !== "USER" && (
                              <DropdownMenuItem
                                onSelect={() => roleMutation.mutate({ id: user.id, next: "USER" })}
                              >
                                <UserIcon /> Make user
                              </DropdownMenuItem>
                            )}
                            {user.role !== "ADMIN" && (
                              <DropdownMenuItem
                                onSelect={() => roleMutation.mutate({ id: user.id, next: "ADMIN" })}
                              >
                                <ShieldCheckIcon /> Make admin
                              </DropdownMenuItem>
                            )}
                            {isSuperAdmin && user.role !== "SUPER_ADMIN" && (
                              <DropdownMenuItem
                                onSelect={() =>
                                  roleMutation.mutate({ id: user.id, next: "SUPER_ADMIN" })
                                }
                              >
                                <ShieldCheckIcon /> Make super admin
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className={
                                user.isActive ? "text-red-600 dark:text-red-400" : undefined
                              }
                              onSelect={() => setStatusTarget(user)}
                            >
                              <NoSymbolIcon /> {user.isActive ? "Deactivate" : "Reactivate"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        {data && <Pagination meta={data.meta} onPageChange={setPage} />}
      </Card>

      <ConfirmDialog
        open={statusTarget !== null}
        onOpenChange={(open) => !open && setStatusTarget(null)}
        title={statusTarget?.isActive ? "Deactivate user?" : "Reactivate user?"}
        description={
          statusTarget?.isActive
            ? `${statusTarget.email} will be signed out everywhere and blocked from signing in.`
            : `${statusTarget?.email} will be able to sign in again.`
        }
        confirmLabel={statusTarget?.isActive ? "Deactivate" : "Reactivate"}
        destructive={statusTarget?.isActive}
        loading={statusMutation.isPending}
        onConfirm={() =>
          statusTarget &&
          statusMutation.mutate({ id: statusTarget.id, isActive: !statusTarget.isActive })
        }
      />
    </div>
  );
};
