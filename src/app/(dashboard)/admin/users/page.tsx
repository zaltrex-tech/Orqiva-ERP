"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  Shield,
  UserCheck,
  UserX,
  Plus,
  KeyRound,
  Building2,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  RefreshCw,
  Mail,
  User,
  ShieldAlert,
  X,
  Lock,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { useI18n } from "@/lib/i18n/context";
import { toast } from "sonner";

interface UserRecord {
  id: string;
  fullName: string;
  email: string;
  role: "SUPER_ADMIN" | "ACCOUNTANT" | "INVENTORY_MANAGER" | "CASHIER" | "HR_MANAGER" | "AUDITOR";
  status: "ACTIVE" | "SUSPENDED" | "INVITED" | "DEACTIVATED";
  createdAt: string;
  lastLoginAt?: string | null;
  tenant?: {
    id: string;
    name: string;
    code: string;
  };
}

interface BranchRecord {
  id: string;
  name: string;
  code: string;
  address?: string | null;
}

interface StatsData {
  totalUsers: number;
  superAdmins: number;
  cashiers: number;
  branchesCount: number;
}

export default function AdminUsersPage() {
  const { t, locale } = useI18n();

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [stats, setStats] = useState<StatsData>({
    totalUsers: 0,
    superAdmins: 0,
    cashiers: 0,
    branchesCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "CASHIER",
    branchId: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/admin/users");
      const json = await res.json();
      if (json.success) {
        setUsers(json.data.users || []);
        setBranches(json.data.branches || []);
        setStats(json.data.stats || { totalUsers: 0, superAdmins: 0, cashiers: 0, branchesCount: 0 });
      } else {
        toast.error(json.error || "Failed to load user records");
      }
    } catch {
      toast.error("Network error while connecting to user directory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
      const matchesStatus = statusFilter === "ALL" || u.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email || !formData.password) {
      toast.error(t("users.errorRequired", "Please fill in all required fields"));
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/v1/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(t("users.userCreatedSuccess", "User created successfully"));
        setShowCreateModal(false);
        setFormData({
          fullName: "",
          email: "",
          password: "",
          role: "CASHIER",
          branchId: "",
        });
        fetchUsers();
      } else {
        toast.error(data.error || "Failed to create user account");
      }
    } catch {
      toast.error("Failed to create user account due to network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: UserRecord) => {
    const nextStatus = user.status === "ACTIVE" ? "DEACTIVATED" : "ACTIVE";
    try {
      const res = await fetch("/api/v1/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          action: "TOGGLE_STATUS",
          status: nextStatus,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`${user.fullName}: status updated to ${nextStatus}`);
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, status: nextStatus } : u))
        );
      } else {
        toast.error(data.error || "Failed to update status");
      }
    } catch {
      toast.error("Network error updating user status");
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/v1/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.id,
          action: "RESET_PASSWORD",
          newPassword,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(t("users.passwordResetSuccess", "Password reset successfully"));
        setShowPasswordModal(false);
        setNewPassword("");
        setSelectedUser(null);
      } else {
        toast.error(data.error || "Failed to reset password");
      }
    } catch {
      toast.error("Network error while resetting password");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "amber";
      case "HR_MANAGER":
        return "indigo";
      case "ACCOUNTANT":
        return "blue";
      case "CASHIER":
        return "emerald";
      default:
        return "slate";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return t("users.roleSuperAdmin", "Super Admin");
      case "HR_MANAGER":
        return t("users.roleHr", "HR Manager");
      case "ACCOUNTANT":
        return t("users.roleAccountant", "Accountant");
      case "CASHIER":
        return t("users.roleCashier", "Senior Cashier");
      case "INVENTORY_MANAGER":
        return t("users.roleInventory", "Inventory Manager");
      case "AUDITOR":
        return t("users.roleAuditor", "Auditor");
      default:
        return role;
    }
  };

  return (
    <ErrorBoundary fallbackMessage="User Management module encountering protected access state.">
      <div className="space-y-8 animate-fadeIn">
        {/* Top Header Banner */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-amber-950/20 border border-slate-800 shadow-luxury-md">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-white font-heading">
                {t("users.title", "User Management & RBAC")}
              </h1>
              <Badge variant="amber" className="font-mono text-[10px]">
                {t("nav.soc2Enforced", "SOC2 ENFORCED")}
              </Badge>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              {t("users.subtitle", "Enterprise access control, roles, branch assignments, and audit compliance.")}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="md"
              onClick={fetchUsers}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button
              id="add-user-btn"
              variant="primary"
              size="md"
              onClick={() => setShowCreateModal(true)}
              className="gap-2 shadow-glow-amber"
            >
              <Plus className="w-4 h-4" />
              {t("users.newUser", "New User")}
            </Button>
          </div>
        </div>

        {/* Bento Stats Counters */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-slate-900/50 border-slate-800 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">
                {t("users.totalUsers", "Total Users")}
              </span>
              <Users className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-slate-100 mt-2">
              {stats.totalUsers}
            </div>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">
                {t("users.activeSuperAdmins", "Super Admins")}
              </span>
              <Shield className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-indigo-400 mt-2">
              {stats.superAdmins}
            </div>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">
                {t("users.cashierStaff", "Cashier Staff")}
              </span>
              <UserCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-2">
              {stats.cashiers}
            </div>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">
                {t("users.branchCoverage", "Branches Managed")}
              </span>
              <Building2 className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold font-mono text-amber-500 mt-2">
              {stats.branchesCount}
            </div>
          </Card>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/40 border border-slate-800">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("users.searchPlaceholder", "Search by full name or email...")}
              className="w-full ps-9 pe-4 py-2 bg-slate-950/70 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500/50"
            >
              <option value="ALL">{t("users.allRoles", "All Roles")}</option>
              <option value="SUPER_ADMIN">{t("users.roleSuperAdmin", "Super Admin")}</option>
              <option value="ACCOUNTANT">{t("users.roleAccountant", "Accountant")}</option>
              <option value="HR_MANAGER">{t("users.roleHr", "HR Manager")}</option>
              <option value="CASHIER">{t("users.roleCashier", "Cashier")}</option>
              <option value="INVENTORY_MANAGER">{t("users.roleInventory", "Inventory Manager")}</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500/50"
            >
              <option value="ALL">{t("users.allStatuses", "All Statuses")}</option>
              <option value="ACTIVE">{t("users.statusActive", "Active")}</option>
              <option value="DEACTIVATED">{t("users.statusDeactivated", "Deactivated")}</option>
            </select>
          </div>
        </div>

        {/* Datatable */}
        <Card className="bg-slate-900/40 border-slate-800 p-0 overflow-hidden shadow-luxury-md">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-5 text-start">{t("users.tableUser", "User")}</th>
                  <th className="py-3.5 px-4 text-start">{t("users.tableRole", "Role")}</th>
                  <th className="py-3.5 px-4 text-start">{t("users.tableBranch", "Branch / Tenant")}</th>
                  <th className="py-3.5 px-4 text-start">{t("users.tableStatus", "Status")}</th>
                  <th className="py-3.5 px-4 text-start">{t("users.tableCreated", "Created")}</th>
                  <th className="py-3.5 px-5 text-end">{t("users.tableActions", "Actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-400" />
                      {t("common.loading", "Loading directory...")}
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400">
                      No users found matching current filters.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-slate-800/20 transition-colors group"
                    >
                      {/* User Info */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700/60 flex items-center justify-center font-bold text-slate-200 text-xs">
                            {user.fullName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-100">{user.fullName}</div>
                            <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-500" /> {user.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={getRoleBadgeVariant(user.role) as any}
                          className="font-mono text-[10px] tracking-wider"
                        >
                          {getRoleLabel(user.role)}
                        </Badge>
                      </td>

                      {/* Branch / Tenant */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>{branches[0]?.name || "Central HQ (ORQ-MAIN)"}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {user.status === "ACTIVE" ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            {t("users.statusActive", "Active")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                            {t("users.statusDeactivated", "Deactivated")}
                          </span>
                        )}
                      </td>

                      {/* Created Date */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                        {new Date(user.createdAt).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US")}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 px-5 text-end">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowPasswordModal(true);
                            }}
                            className="text-[11px] py-1 px-2.5 h-7"
                            title={t("users.resetPassword", "Reset Password")}
                          >
                            <KeyRound className="w-3 h-3 me-1" />
                            <span className="hidden md:inline">{t("users.resetPassword", "Reset")}</span>
                          </Button>

                          <Button
                            variant={user.status === "ACTIVE" ? "danger" : "secondary"}
                            size="sm"
                            onClick={() => handleToggleStatus(user)}
                            className="text-[11px] py-1 px-2.5 h-7"
                          >
                            {user.status === "ACTIVE" ? (
                              <>
                                <UserX className="w-3 h-3 me-1" />
                                <span className="hidden md:inline">{t("users.deactivate", "Deactivate")}</span>
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-3 h-3 me-1" />
                                <span className="hidden md:inline">{t("users.activate", "Activate")}</span>
                              </>
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Create User Dialog Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-luxury-lg overflow-hidden">
              <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white font-heading">
                    {t("users.createTitle", "Create New Enterprise User")}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {t("users.createDesc", "Provision credentials and assign granular RBAC roles.")}
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {t("users.fullName", "Full Name")} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="e.g. Tariq Al-Mansoor"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {t("users.email", "Email Address")} *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="user@orqiva.io"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {t("users.password", "Password")} *
                  </label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Min. 6 characters"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {t("users.role", "System Role")} *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="SUPER_ADMIN">{t("users.roleSuperAdmin", "Super Admin")}</option>
                    <option value="HR_MANAGER">{t("users.roleHr", "HR Manager")}</option>
                    <option value="ACCOUNTANT">{t("users.roleAccountant", "Accountant")}</option>
                    <option value="CASHIER">{t("users.roleCashier", "Senior Cashier")}</option>
                    <option value="INVENTORY_MANAGER">{t("users.roleInventory", "Inventory Manager")}</option>
                    <option value="AUDITOR">{t("users.roleAuditor", "Auditor")}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {t("users.branch", "Branch / Location")}
                  </label>
                  <select
                    value={formData.branchId}
                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="">Default Flagship Branch</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    onClick={() => setShowCreateModal(false)}
                  >
                    {t("common.cancel", "Cancel")}
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? t("users.creating", "Creating...") : t("common.create", "Create User")}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Reset Password Dialog Modal */}
        {showPasswordModal && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-luxury-lg overflow-hidden">
              <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white font-heading">
                    {t("users.resetTitle", "Reset User Password")}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {selectedUser.fullName} ({selectedUser.email})
                  </p>
                </div>
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleResetPassword} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {t("users.newPassword", "New Password")} *
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new secure password (min. 6 chars)"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    onClick={() => setShowPasswordModal(false)}
                  >
                    {t("common.cancel", "Cancel")}
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? t("users.updating", "Updating...") : t("users.resetPassword", "Update Password")}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
