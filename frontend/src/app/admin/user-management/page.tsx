"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  ChevronUp,
  ChevronDown,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";
import type { UserResponse } from "@/lib/api-client";
import Modal from "@/components/Modal";
import { useToast } from "@/context/ToastContext";
import { useAuthContext } from "@/context/AuthContext";
import { useUsers, useUserMutations } from "@/hooks";
import { SkeletonRow } from "@/components/ui/skeleton";

type SortKey = "name" | "email" | "role" | "status" | "lastLogin" | "created";
type SortDir = "asc" | "desc";

const ROLE_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  superadmin: { bg: "#EDE9FE", text: "#5B21B6" },
  admin: { bg: "#DBEAFE", text: "#1E40AF" },
  customer: { bg: "#D1FAE5", text: "#065F46" },
};

const STATUS_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: "#D1FAE5", text: "#065F46" },
  inactive: { bg: "#FEE2E2", text: "#991B1B" },
};

function RoleBadge({ role }: { role: string }) {
  const colors = ROLE_BADGE_COLORS[role] ?? { bg: "#F3F4F6", text: "#374151" };
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {role === "superadmin" ? "Super Admin" : role}
    </span>
  );
}

function StatusBadgeInline({ isActive }: { isActive: boolean }) {
  const status = isActive ? "active" : "inactive";
  const colors = STATUS_BADGE_COLORS[status];
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {status}
    </span>
  );
}

export default function UserManagementPage() {
  const router = useRouter();
  const { isSuperAdmin, isLoading: authLoading } = useAuthContext();

  // Redirect non-superadmins
  if (!authLoading && !isSuperAdmin) {
    router.replace("/admin");
    return null;
  }

  return <UserManagementContent />;
}

function UserManagementContent() {
  const { showToast } = useToast();
  const usersQuery = useUsers();
  const {
    createUser,
    updateUser,
    activateUser,
    deactivateUser,
    deleteUser,
    isCreating,
    isUpdating,
    isDeleting,
  } = useUserMutations();

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(
    null,
  );
  const [editingRole, setEditingRole] = useState<{
    id: string;
    role: string;
  } | null>(null);

  // Create form state
  const [createForm, setCreateForm] = useState({
    email: "",
    first_name: "",
    last_name: "",
    phone: "",
    password: "",
    role: "admin",
  });

  // Filter to admin/superadmin users only
  const adminUsers: UserResponse[] = useMemo(() => {
    const items = usersQuery.data?.items ?? [];
    return items.filter(
      (u: UserResponse) => u.role === "admin" || u.role === "superadmin",
    );
  }, [usersQuery.data]);

  // Search filter
  const filtered = useMemo(() => {
    if (!search.trim()) return adminUsers;
    const q = search.toLowerCase();
    return adminUsers.filter(
      (u) =>
        u.first_name.toLowerCase().includes(q) ||
        u.last_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
    );
  }, [adminUsers, search]);

  // Sort
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = `${a.first_name} ${a.last_name}`.localeCompare(
            `${b.first_name} ${b.last_name}`,
          );
          break;
        case "email":
          cmp = a.email.localeCompare(b.email);
          break;
        case "role":
          cmp = a.role.localeCompare(b.role);
          break;
        case "status":
          cmp = Number(b.is_active) - Number(a.is_active);
          break;
        case "lastLogin":
          cmp =
            (a.last_login_at ?? "").localeCompare(b.last_login_at ?? "") || 0;
          break;
        case "created":
          cmp = a.created_at.localeCompare(b.created_at);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return null;
    return sortDir === "asc" ? (
      <ChevronUp size={14} />
    ) : (
      <ChevronDown size={14} />
    );
  }

  async function handleCreate() {
    try {
      await createUser({
        email: createForm.email,
        first_name: createForm.first_name,
        last_name: createForm.last_name,
        phone: createForm.phone || undefined,
        password: createForm.password,
        role: createForm.role,
      });
      showToast("User created successfully", "success");
      setShowCreateModal(false);
      setCreateForm({
        email: "",
        first_name: "",
        last_name: "",
        phone: "",
        password: "",
        role: "admin",
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create user";
      showToast(message, "error");
    }
  }

  async function handleToggleActive(user: UserResponse) {
    try {
      if (user.is_active) {
        await deactivateUser(user.id);
        showToast(`${user.first_name} deactivated`, "success");
      } else {
        await activateUser(user.id);
        showToast(`${user.first_name} activated`, "success");
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update user";
      showToast(message, "error");
    }
  }

  async function handleDelete(userId: string) {
    try {
      await deleteUser(userId);
      showToast("User permanently deleted", "success");
      setShowDeleteConfirm(null);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to delete user";
      showToast(message, "error");
    }
  }

  async function handleRoleUpdate(userId: string, newRole: string) {
    try {
      await updateUser({ id: userId, data: { role: newRole } });
      showToast("Role updated successfully", "success");
      setEditingRole(null);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to update role";
      showToast(message, "error");
    }
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  const deleteTargetUser = showDeleteConfirm
    ? adminUsers.find((u) => u.id === showDeleteConfirm)
    : null;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{
              color: "#1A1A2E",
              fontFamily: "'DM Serif Display', serif",
            }}
          >
            User Management
          </h1>
          <p className="mt-1 text-sm" style={{ color: "#6B7280" }}>
            Manage admin and super admin accounts
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors"
          style={{ backgroundColor: "#1B4332" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "#40916C")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "#1B4332")
          }
        >
          <Plus size={16} />
          Create User
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: "#9CA3AF" }}
        />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border py-2.5 pl-10 pr-4 text-sm transition-colors focus:outline-none"
          style={{
            borderColor: "#E5E7EB",
            color: "#1A1A2E",
          }}
        />
      </div>

      {/* Table */}
      <div
        className="overflow-hidden rounded-xl border"
        style={{
          borderColor: "#E5E7EB",
          backgroundColor: "#FFFFFF",
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: "#F9FAFB" }}>
                {(
                  [
                    ["name", "Name"],
                    ["email", "Email"],
                    ["role", "Role"],
                    ["status", "Status"],
                    ["lastLogin", "Last Login"],
                    ["created", "Created"],
                  ] as [SortKey, string][]
                ).map(([key, label]) => (
                  <th
                    key={key}
                    onClick={() => toggleSort(key)}
                    className="cursor-pointer select-none px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: "#6B7280" }}
                  >
                    <div className="flex items-center gap-1">
                      {label}
                      <SortIcon col={key} />
                    </div>
                  </th>
                ))}
                <th
                  className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "#6B7280" }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "#F3F4F6" }}>
              {usersQuery.isLoading ? (
                <>
                  <SkeletonRow cols={7} />
                  <SkeletonRow cols={7} />
                  <SkeletonRow cols={7} />
                </>
              ) : sorted.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-sm"
                    style={{ color: "#6B7280" }}
                  >
                    {search
                      ? "No users match your search."
                      : "No admin users found."}
                  </td>
                </tr>
              ) : (
                sorted.map((user) => (
                  <tr
                    key={user.id}
                    className="transition-colors hover:bg-gray-50"
                  >
                    <td
                      className="px-4 py-3 font-medium"
                      style={{ color: "#1A1A2E" }}
                    >
                      {user.first_name} {user.last_name}
                    </td>
                    <td className="px-4 py-3" style={{ color: "#6B7280" }}>
                      {user.email}
                    </td>
                    <td className="px-4 py-3">
                      {editingRole?.id === user.id ? (
                        <select
                          value={editingRole.role}
                          onChange={(e) =>
                            setEditingRole({
                              id: user.id,
                              role: e.target.value,
                            })
                          }
                          onBlur={() => {
                            if (editingRole.role !== user.role) {
                              handleRoleUpdate(user.id, editingRole.role);
                            } else {
                              setEditingRole(null);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleRoleUpdate(user.id, editingRole.role);
                            } else if (e.key === "Escape") {
                              setEditingRole(null);
                            }
                          }}
                          autoFocus
                          className="rounded border px-2 py-1 text-xs focus:outline-none"
                          style={{ borderColor: "#E5E7EB" }}
                        >
                          <option value="admin">Admin</option>
                          <option value="superadmin">Super Admin</option>
                        </select>
                      ) : (
                        <button
                          onClick={() =>
                            setEditingRole({ id: user.id, role: user.role })
                          }
                          title="Click to change role"
                        >
                          <RoleBadge role={user.role} />
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadgeInline isActive={user.is_active} />
                    </td>
                    <td className="px-4 py-3" style={{ color: "#6B7280" }}>
                      {formatDate(user.last_login_at)}
                    </td>
                    <td className="px-4 py-3" style={{ color: "#6B7280" }}>
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleToggleActive(user)}
                          disabled={isUpdating}
                          className="rounded-lg p-1.5 transition-colors hover:bg-gray-100"
                          title={
                            user.is_active ? "Deactivate user" : "Activate user"
                          }
                        >
                          {user.is_active ? (
                            <EyeOff size={16} style={{ color: "#F59E0B" }} />
                          ) : (
                            <Eye size={16} style={{ color: "#10B981" }} />
                          )}
                        </button>
                        {!user.is_active && (
                          <button
                            onClick={() => setShowDeleteConfirm(user.id)}
                            disabled={isDeleting}
                            className="rounded-lg p-1.5 transition-colors hover:bg-red-50"
                            title="Permanently delete user"
                          >
                            <Trash2 size={16} style={{ color: "#EF4444" }} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New User"
        size="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCreate();
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className="mb-1 block text-sm font-medium"
                style={{ color: "#374151" }}
              >
                First Name
              </label>
              <input
                type="text"
                required
                value={createForm.first_name}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, first_name: e.target.value }))
                }
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
                style={{ borderColor: "#E5E7EB" }}
              />
            </div>
            <div>
              <label
                className="mb-1 block text-sm font-medium"
                style={{ color: "#374151" }}
              >
                Last Name
              </label>
              <input
                type="text"
                required
                value={createForm.last_name}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, last_name: e.target.value }))
                }
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
                style={{ borderColor: "#E5E7EB" }}
              />
            </div>
          </div>

          <div>
            <label
              className="mb-1 block text-sm font-medium"
              style={{ color: "#374151" }}
            >
              Email
            </label>
            <input
              type="email"
              required
              value={createForm.email}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, email: e.target.value }))
              }
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
              style={{ borderColor: "#E5E7EB" }}
            />
          </div>

          <div>
            <label
              className="mb-1 block text-sm font-medium"
              style={{ color: "#374151" }}
            >
              Phone (optional)
            </label>
            <input
              type="tel"
              value={createForm.phone}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, phone: e.target.value }))
              }
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
              style={{ borderColor: "#E5E7EB" }}
            />
          </div>

          <div>
            <label
              className="mb-1 block text-sm font-medium"
              style={{ color: "#374151" }}
            >
              Temporary Password
            </label>
            <input
              type="text"
              required
              value={createForm.password}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, password: e.target.value }))
              }
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
              style={{ borderColor: "#E5E7EB" }}
              placeholder="Set a temporary password"
            />
          </div>

          <div>
            <label
              className="mb-1 block text-sm font-medium"
              style={{ color: "#374151" }}
            >
              Role
            </label>
            <select
              value={createForm.role}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, role: e.target.value }))
              }
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
              style={{ borderColor: "#E5E7EB" }}
            >
              <option value="admin">Admin</option>
              <option value="superadmin">Super Admin</option>
            </select>
          </div>

          <div
            className="flex justify-end gap-3 pt-2"
            style={{ borderTop: "1px solid #E5E7EB", paddingTop: "16px" }}
          >
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-50"
              style={{ borderColor: "#E5E7EB", color: "#374151" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
              style={{ backgroundColor: "#1B4332" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "#40916C")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "#1B4332")
              }
            >
              {isCreating ? "Creating..." : "Create User"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        title="Confirm Permanent Deletion"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm" style={{ color: "#374151" }}>
            Are you sure you want to permanently delete{" "}
            <strong>
              {deleteTargetUser?.first_name} {deleteTargetUser?.last_name}
            </strong>
            ? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowDeleteConfirm(null)}
              className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-50"
              style={{ borderColor: "#E5E7EB", color: "#374151" }}
            >
              Cancel
            </button>
            <button
              onClick={() =>
                showDeleteConfirm && handleDelete(showDeleteConfirm)
              }
              disabled={isDeleting}
              className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
              style={{ backgroundColor: "#EF4444" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "#DC2626")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "#EF4444")
              }
            >
              {isDeleting ? "Deleting..." : "Delete Permanently"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
