'use client';

import { create } from 'zustand';
import React, { useEffect, useState,useRef, useCallback, useMemo } from 'react';
import { useAuthStore, useNavStore, } from '@/lib/store';
import api, { apiCall } from '@/lib/axios';
import { cn } from "@/lib/utils";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Check, ChevronsUpDown, XCircle, Fingerprint, FileSpreadsheet, MessageSquareText,  PackageCheck, PackageSearch } from "lucide-react";
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  LayoutDashboard, Users, Calendar, Scissors, Building2, Package, BarChart3,
  LogOut, Menu, X, Search, Plus, Edit, Trash2, ChevronDown, Clock, UserCheck,
  CreditCard, Star, TrendingUp, Phone, Mail, Receipt, IndianRupee, Minus,
  FileText, Download, Printer, MessageCircle, Eye, DollarSign, LogIn, LogOutIcon,
  AlertCircle, CheckCircle2, Moon, Sun, UserX, Banknote, Smartphone, Wallet, UserPlus,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { toast } from 'sonner';
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationNext, PaginationPrevious, PaginationEllipsis
} from "@/components/ui/pagination";
import { ChevronLeft, ChevronRight, User ,Lock as LockIcon, Users as UsersIcon, User as UserIcon, Send } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from 'xlsx';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';
import { useVirtualizer } from '@tanstack/react-virtual';

async function loadImageAsBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

const PERMISSION_MODULES = [
  'staff',
  'attendance',
  'clients',
  'appointments',
  'transactions',
  'billing'
];


function RegisterPage({ onClose }: { onClose: () => void }) {
  const [admins, setAdmins] = useState<any[]>([]);
  const [tableLoading, setTableLoading] = useState(true);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [viewPerm, setViewPerm] = useState<any>(null); 

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('admin');
  const [branchId, setBranchId] = useState('');
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState<Record<string, string[]>>({});

  const [editingAdmin, setEditingAdmin] = useState<any>(null); // ✅ State for Edit Mode
  const [currentUser, setCurrentUser] = useState<any>(null);

  const login = useAuthStore((s) => s.login);

  const fetchAdmins = async () => {
    try {
      const adminRes = await apiCall('get', '/auth/me').catch(() => null);
      const adminList = adminRes?.Admin ?? adminRes?.admins ?? (Array.isArray(adminRes) ? adminRes : []);
      setAdmins(adminList);
      if (adminRes?.user) setCurrentUser(adminRes.user);
    } catch { /* silent */ }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [branchRes, adminRes] = await Promise.all([
          apiCall('get', '/branches'),
          apiCall('get', '/auth/me').catch(() => null),
        ]);
        
        const branchList = branchRes?.branches ?? branchRes?.data ?? (Array.isArray(branchRes) ? branchRes : []);
        setBranches(branchList);

        const adminList = adminRes?.Admin ?? (Array.isArray(adminRes) ? adminRes : []);
        setAdmins(adminList);
        if (adminRes?.user) setCurrentUser(adminRes.user);

      } catch (err: any) {
        const msg = err?.response?.data?.error ?? err?.response?.data?.message ?? err?.message ?? "Failed to load data";
        toast.error(msg);
      } finally {
        setTableLoading(false);
      }
    };
    fetchData();
  }, []);

  const isMe = (admin: any) => {
    if (!currentUser) return false;
    const myId = currentUser._id || currentUser.id;
    return myId && (admin._id || admin.id) === myId;
  };

  const getBranchName = (bId: any) => {
    if (!bId) return '—';
    if (typeof bId === 'object') return bId.name || '—';
    return branches.find((b: any) => (b._id || b.id) === bId)?.name || '—';
  };

  const handlePermissionChange = (module: string, type: 'read' | 'write') => {
    setPermissions((prev) => {
      const currentPerms = prev[module] || [];
      const newPerms = currentPerms.includes(type)
        ? currentPerms.filter((p) => p !== type)
        : [...currentPerms, type];
      return { ...prev, [module]: newPerms };
    });
  };

  const toggleAllRead = () => {
    const allHaveRead = PERMISSION_MODULES.every((m) => (permissions[m] || []).includes('read'));
    if (allHaveRead) {
      setPermissions((prev) => {
        const next: Record<string, string[]> = {};
        PERMISSION_MODULES.forEach((m) => { next[m] = (prev[m] || []).filter((p) => p !== 'read'); });
        return next;
      });
    } else {
      setPermissions((prev) => {
        const next = { ...prev };
        PERMISSION_MODULES.forEach((m) => { const curr = next[m] || []; if (!curr.includes('read')) next[m] = [...curr, 'read']; });
        return next;
      });
    }
  };

  const toggleAllWrite = () => {
    const allHaveWrite = PERMISSION_MODULES.every((m) => (permissions[m] || []).includes('write'));
    if (allHaveWrite) {
      setPermissions((prev) => {
        const next: Record<string, string[]> = {};
        PERMISSION_MODULES.forEach((m) => { next[m] = (prev[m] || []).filter((p) => p !== 'write'); });
        return next;
      });
    } else {
      setPermissions((prev) => {
        const next = { ...prev };
        PERMISSION_MODULES.forEach((m) => { const curr = next[m] || []; if (!curr.includes('write')) next[m] = [...curr, 'write']; });
        return next;
      });
    }
  };

  const buildCleanPermissions = (): Record<string, string[]> => {
    const clean: Record<string, string[]> = {};
    Object.entries(permissions).forEach(([module, perms]) => {
      if (perms.length > 0) clean[module] = perms;
    });
    return clean;
  };

  const getPermSummary = (perms: Record<string, string[]>) => {
    if (!perms) return { total: 0, read: 0, write: 0 };
    const entries = Object.values(perms).flat();
    return {
      total: entries.length,
      read: entries.filter((p) => p === 'read').length,
      write: entries.filter((p) => p === 'write').length
    };
  };

  const resetForm = () => {
    setName(''); setEmail(''); setPassword(''); setRole('admin'); setBranchId(''); setPermissions({});
    setEditingAdmin(null);
  };

  // ✅ Open New Dialog
  const openNew = () => {
    resetForm();
    setRegisterOpen(true);
  };

  // ✅ Open Edit Dialog
  const openEdit = (admin: any) => {
    setEditingAdmin(admin);
    setName(admin.name || '');
    setEmail(admin.email || '');
    setPassword(''); // Don't populate password for security
    setRole(admin.role || 'admin');
    setBranchId(admin.branchId?._id || admin.branchId || '');
    setPermissions(admin.permission || {});
    setRegisterOpen(true);
  };

  // ✅ Unified Submit Handler (Create & Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Name is required'); return; }
    if (!email.trim()) { toast.error('Email is required'); return; }
    
    // Only require password on create
    if (!editingAdmin && (!password || password.length < 6)) { 
      toast.error('Password must be at least 6 characters'); return; 
    }
    if (password && password.length < 6) { toast.error('Password must be at least 6 characters'); return; }

    if (!branchId) { toast.error('Please select a branch'); return; }

    const cleanPermissions = buildCleanPermissions();
    if (Object.keys(cleanPermissions).length === 0) { toast.error('Please assign at least one permission'); return; }

    setLoading(true);
    try {
      const payload: any = {
        name: name.trim(),
        email: email.trim(),
        role: role,
        permission: cleanPermissions,
        branchId: branchId
      };

      if (password) {
        payload.password = password;
      }

      if (editingAdmin) {
        await apiCall('put', `/auth/update/${editingAdmin._id || editingAdmin.id}`, payload);
        toast.success('Admin updated successfully!');
      } else {
        const data = await apiCall('post', '/auth/register', payload);
        toast.success('Account created successfully!');
        if (data?.token && data?.user) {
          login(data.token, data.user);
        }
      }

      setRegisterOpen(false);
      resetForm();
      fetchAdmins(); // Refresh list
    } catch (err: unknown) {
      let msg = 'Registration failed';
      if (err instanceof Error) msg = err.message;
      else if (typeof err === 'string') msg = err;
      else if ((err as any)?.response?.data?.error) msg = (err as any).response.data.error;
      else if ((err as any)?.response?.data?.message) msg = (err as any).response.data.message;
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Delete Handler
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this admin?')) return;
    try {
      await apiCall('delete', `/auth/delete/${id}`);
      toast.success('Admin deleted successfully');
      fetchAdmins();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to delete admin');
    }
  };

  const readCount = PERMISSION_MODULES.filter((m) => (permissions[m] || []).includes('read')).length;
  const writeCount = PERMISSION_MODULES.filter((m) => (permissions[m] || []).includes('write')).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-rose-50/30 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <div>
              <h1 className="text-2xl font-bold">Admin Management</h1>
              <p className="text-sm text-muted-foreground">View admins and register new accounts</p>
            </div>
          </div>

          <Button onClick={openNew} className="bg-rose-500 hover:bg-rose-600 text-white">
            <UserPlus className="w-4 h-4 mr-2" />Register New Admin
          </Button>
        </div>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                    <TableHead className="font-semibold">Name</TableHead>
                    <TableHead className="font-semibold">Email</TableHead>
                    <TableHead className="font-semibold">Branch</TableHead>
                    <TableHead className="font-semibold">Role</TableHead>
                    <TableHead className="font-semibold">Permissions</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                          Loading admins...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : admins.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-16 text-muted-foreground">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center">
                            <UsersIcon className="w-7 h-7 text-gray-400" />
                          </div>
                          <div>
                            <p className="font-medium">No admins found</p>
                            <p className="text-sm mt-1">Click "Register New Admin" to add one.</p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    admins.map((admin) => {
                      const ps = getPermSummary(admin.permission);
                      const isActive = admin.isActive !== false;
                      const me = isMe(admin);

                      return (
                        <TableRow
                          key={admin._id || admin.id}
                          className={cn(
                            !isActive && "opacity-50",
                            me && "bg-rose-50/60 hover:bg-rose-50/80"
                          )}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm",
                                me
                                  ? "bg-gradient-to-br from-rose-500 to-amber-500 ring-2 ring-rose-300"
                                  : "bg-gradient-to-br from-gray-400 to-gray-500"
                              )}>
                                <span className="text-xs font-bold text-white">
                                  {admin.name?.charAt(0)?.toUpperCase()}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{admin.name}</span>
                                {me && (
                                  <span className="text-[10px] font-semibold bg-rose-500 text-white px-1.5 py-0.5 rounded-full leading-none">
                                    You
                                  </span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{admin.email}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {getBranchName(admin.branchId)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize text-xs font-medium">
                              {admin.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                                {ps.read}R
                              </span>
                              <span className="text-[11px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-medium">
                                {ps.write}W
                              </span>
                              <span className="text-[10px] text-muted-foreground">({ps.total})</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <span className={cn(
                                "w-2.5 h-2.5 rounded-full",
                                isActive ? "bg-green-500" : "bg-red-400"
                              )} />
                              <span className={cn(
                                "text-xs font-medium",
                                isActive ? "text-green-700" : "text-red-600"
                              )}>
                                {isActive ? "Active" : "Inactive"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                                onClick={() => setViewPerm(admin)}
                                title="View Permissions"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-gray-500 hover:text-amber-600 hover:bg-amber-50"
                                onClick={() => openEdit(admin)}
                                title="Edit Admin"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              {!me && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-gray-500 hover:text-red-600 hover:bg-red-50"
                                  onClick={() => handleDelete(admin._id || admin.id)}
                                  title="Delete Admin"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* ─── Create/Edit Admin Dialog ─── */}
        <Dialog open={registerOpen} onOpenChange={(open) => { setRegisterOpen(open); if (!open) resetForm(); }}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-rose-500 to-amber-500 rounded-lg flex items-center justify-center shadow-sm">
                  <UserPlus className="w-4 h-4 text-white" />
                </div>
                {editingAdmin ? 'Edit Admin' : 'Register New Admin'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-5 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Full Name *</Label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" className="pl-9 h-10" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="demo@salon.com" className="pl-9 h-10" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  {/* ✅ Made password optional for edit */}
                  <Label className="text-sm font-medium">Password {editingAdmin ? '(Leave blank to keep)' : '*'}</Label>
                  <div className="relative">
                    <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                    <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" className="pl-9 h-10" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Role *</Label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 z-10 pointer-events-none" />
                    <Select value={role} onValueChange={setRole}>
                      <SelectTrigger className="pl-9 h-10">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Branch *</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 z-10 pointer-events-none" />
                  <Select value={branchId} onValueChange={setBranchId}>
                    <SelectTrigger className="pl-9 h-10 w-full">
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.length === 0 ? (
                        <SelectItem value="__none" disabled>No branches found</SelectItem>
                      ) : (
                        branches.map((b: any) => (
                          <SelectItem key={b._id || b.id} value={b._id || b.id}>{b.name}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Permissions *</Label>
                  <span className="text-[11px] text-muted-foreground">
                    {Object.keys(buildCleanPermissions()).length} of {PERMISSION_MODULES.length} modules
                  </span>
                </div>

                <div className="border rounded-xl overflow-hidden">
                  <div className="grid grid-cols-[1fr_80px_80px] gap-0 bg-gray-50 border-b px-4 py-2.5 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                    <span>Module</span>
                    <div className="flex items-center justify-center">
                      <button type="button" onClick={toggleAllRead}
                        className={cn('px-2.5 py-0.5 rounded text-[10px] font-medium transition-colors',
                          readCount === PERMISSION_MODULES.length ? 'bg-rose-500 text-white' : 'bg-white border text-muted-foreground hover:bg-gray-100'
                        )}>
                        Read ({readCount})
                      </button>
                    </div>
                    <div className="flex items-center justify-center">
                      <button type="button" onClick={toggleAllWrite}
                        className={cn('px-2.5 py-0.5 rounded text-[10px] font-medium transition-colors',
                          writeCount === PERMISSION_MODULES.length ? 'bg-rose-500 text-white' : 'bg-white border text-muted-foreground hover:bg-gray-100'
                        )}>
                        Write ({writeCount})
                      </button>
                    </div>
                  </div>

                  <div className="divide-y">
                    {PERMISSION_MODULES.map((module) => {
                      const perms = permissions[module] || [];
                      const hasRead = perms.includes('read');
                      const hasWrite = perms.includes('write');
                      return (
                        <div key={module}
                          className={cn('grid grid-cols-[1fr_80px_80px] gap-0 px-4 py-2.5 items-center transition-colors',
                            (hasRead || hasWrite) ? 'bg-rose-50/40' : 'hover:bg-gray-50/50'
                          )}>
                          <span className="text-sm font-medium capitalize">{module}</span>
                          <div className="flex justify-center">
                            <button type="button" onClick={() => handlePermissionChange(module, 'read')}
                              className={cn('w-9 h-5 rounded-full transition-all duration-200 relative',
                                hasRead ? 'bg-rose-500 shadow-sm shadow-rose-200' : 'bg-gray-200'
                              )}>
                              <span className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200',
                                hasRead ? 'left-[18px]' : 'left-0.5'
                              )} />
                            </button>
                          </div>
                          <div className="flex justify-center">
                            <button type="button" onClick={() => handlePermissionChange(module, 'write')}
                              className={cn('w-9 h-5 rounded-full transition-all duration-200 relative',
                                hasWrite ? 'bg-rose-500 shadow-sm shadow-rose-200' : 'bg-gray-200'
                              )}>
                              <span className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200',
                                hasWrite ? 'left-[18px]' : 'left-0.5'
                              )} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <Button type="submit" disabled={loading}
                className="w-full h-11 bg-rose-500 hover:bg-rose-600 text-white font-medium text-sm">
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {editingAdmin ? 'Updating...' : 'Creating account…'}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4" /> {editingAdmin ? 'Update Account' : 'Create Account'}
                  </div>
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* ─── ✅ View Permissions Dialog ─── */}
        <Dialog open={!!viewPerm} onOpenChange={(open) => !open && setViewPerm(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Permissions for {viewPerm?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto py-2">
              {PERMISSION_MODULES.map((m) => {
                const perms = viewPerm?.permission?.[m] || [];
                const hasRead = perms.includes('read');
                const hasWrite = perms.includes('write');
                
                return (
                  <div key={m} className="flex items-center justify-between p-2.5 border-b border-gray-100 last:border-0">
                    <span className="text-sm font-medium capitalize">{m}</span>
                    <div className="flex gap-2">
                      <span className={cn(
                        "text-[11px] px-2 py-0.5 rounded font-medium flex items-center gap-1",
                        hasRead ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-400"
                      )}>
                        {hasRead ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        Read
                      </span>
                      <span className={cn(
                        "text-[11px] px-2 py-0.5 rounded font-medium flex items-center gap-1",
                        hasWrite ? "bg-amber-50 text-amber-700" : "bg-gray-100 text-gray-400"
                      )}>
                        {hasWrite ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        Write
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}


function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); 
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await apiCall('post', '/auth/login', { email, password   });
      login(data.token, data.user);
      toast.success('Welcome back!');
    } catch (err: unknown) {
      const msg = err instanceof Error 
        ? err.message 
        : (err as any)?.response?.data?.error 
          || (err as any)?.response?.data?.message 
          || 'Login failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-white to-amber-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center pb-2">
      <div className="mx-auto w-16 h-16 bg-gradient-to-br from-rose-500 to-amber-500 rounded-2xl flex items-center justify-center mb-4"> 
           
           <img 
            src="https://res.cloudinary.com/e3jbzpxf/image/upload/v1788588085/Unikaa_Logo.png" 
            alt="Salon Logo" 
            className="w-16 h-16 object-contain" 
          />
           
            {/* <Scissors className="w-8 h-8 text-white" /> */}
          </div>
          <CardTitle className="text-2xl font-bold">Salon CRM</CardTitle>
          <CardDescription>Sign in to manage your salon</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="demo@salon.com"
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="Enter password"
                required 
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white" 
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </div>
              ) : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function NavHeader({ onRegisterOpen }: { onRegisterOpen: () => void }) {
  const { user, logout } = useAuthStore();
  const { activePage, setActivePage } = useNavStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ─── User Permissions ─────────────────────────────────
  const perms: Record<string, string[]> = user?.permission || {};
  const isActive = user?.isActive !== false;

  const hasPermissions = Object.keys(perms).length > 0;

  const canAccess = (module: string): boolean => {
    if (!hasPermissions) return true;
    const p = perms[module];
    return Array.isArray(p) && p.length > 0;
  };

  const permTag = (module: string): string => {
    if (!hasPermissions) return 'all';
    const p = perms[module];
    if (!p) return '';
    return p.join(', ');
  };

  const permColor = (module: string): string => {
    if (!hasPermissions) return 'bg-green-50 text-green-700 border-green-200';
    const p = perms[module];
    if (!p || p.length === 0) return 'bg-gray-100 text-gray-400 border-gray-200';
    return p.includes('write')
      ? 'bg-green-50 text-green-700 border-green-200'
      : 'bg-amber-50 text-amber-700 border-amber-200';
  };

  // ─── Branch helpers (inline) ──────────────────────────
  const userBranchId = (() => {
    const b = user?.branchId;
    if (!b || b === 'undefined' || b === 'null' || b === 'false' || b === '') return null;
    return b;
  })();

  const formatBranch = (branch: any): string => {
    if (!branch) return '—';
    if (typeof branch === 'string') return branch;
    return branch.name || '—';
  };

  const allNavItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard, key: null },
    { id: 'staff-list' as const, label: 'Staff List', icon: UserCheck, key: 'staff' },
    { id: 'attendance' as const, label: 'Attendance', icon: Clock, key: 'attendance' },
    { id: 'payroll' as const, label: 'Payroll', icon: DollarSign, key: 'payroll' },
    // { id: 'staff-fingerprint' as const, label: 'Staff-Fingerprint', icon: Fingerprint, key: 'staff-fingerprint' },
    { id: 'clients' as const, label: 'Clients', icon: Users, key: 'clients' },
   { id: 'clients_message' as const, label: 'ClientsMessage', icon: Package, key: 'clients_message' },
    { id: 'billing' as const, label: 'Billing', icon: Receipt, key: 'billing' },
    { id: 'appointments' as const, label: 'Appointments', icon: Calendar, key: 'appointments' },
    { id: 'services' as const, label: 'Services', icon: Scissors, key: 'services' },
    { id: 'transactions' as const, label: 'Transactions', icon: CreditCard, key: 'transactions' },
    { id: 'branches' as const, label: 'Branch', icon: Building2, key: null },
    { id: 'products' as const, label: 'Product', icon: Package, key: 'products' },
    { id: 'tproducts' as const, label: 'TProduct', icon: Package, key: 'tproducts' },
    { id: 'reports' as const, label: 'Report', icon: BarChart3, key: 'reports' },
  ];

  const visibleItems = allNavItems.filter(
    (item) => item.key === null || canAccess(item.key)
  );

  // --- Staff Group ---
  const staffGroupVisible = canAccess('staff') || canAccess('attendance') || canAccess('payroll') || canAccess('staff-fingerprint');
  const isStaffActive = ['staff-list', 'attendance', 'payroll', 'staff-view', 'staff-fingerprint'].includes(activePage);

  // --- Products Group ---
  const productGroupVisible = canAccess('products') || canAccess('tproducts');
  const isProductActive = ['products', 'tproducts'].includes(activePage);

    // --- client Group ---
  const clientsGroupVisible = canAccess('clients') || canAccess('clients_message');
  const isClientsActive = ['clients', 'clients_message'].includes(activePage);

  // --- Regular Items (Exclude grouped items) ---
  const regularItems = visibleItems.filter(
    (i) => i.id !== 'dashboard' && 
    !['staff', 'attendance', 'payroll', 'staff-fingerprint'].includes(i.key || '') &&
    !['products', 'tproducts'].includes(i.key || '') &&
    !['clients', 'clients_message'].includes(i.key || '') 
  );

  const NavBtn = ({ id, label, icon: Icon }: { id: string; label: string; icon: any }) => (
    <Button
      variant={activePage === id ? 'default' : 'ghost'}
      size="sm"
      onClick={() => setActivePage(id as any)}
      className={activePage === id ? 'bg-rose-500 hover:bg-rose-600 text-white' : ''}
    >
      <Icon className="w-4 h-4 mr-1" />{label}
    </Button>
  );

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b shadow-sm">
      <div className="max-w-[1600px] mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-rose-500 to-amber-500 rounded-xl flex items-center justify-center overflow-hidden">
            <img 
              src="https://res.cloudinary.com/e3jbzpxf/image/upload/v1788588395/16x25.5_Unikaa_Logo_Colour.png" 
              alt="Salon Logo" 
              className="w-full h-full object-contain" 
            />
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-rose-600 to-amber-600 bg-clip-text text-transparent hidden sm:inline">U</span>
        </div>

        {/* ─── Desktop Nav ─────────────────────────────── */}
        <nav className="hidden lg:flex items-center gap-1">
          <NavBtn id="dashboard" label="Dashboard" icon={LayoutDashboard} />

          {staffGroupVisible && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={isStaffActive ? 'default' : 'ghost'}
                  size="sm"
                  className={isStaffActive ? 'bg-rose-500 hover:bg-rose-600 text-white' : ''}
                >
                  <Users className="w-4 h-4 mr-1" />Staff<ChevronDown className="w-3 h-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {canAccess('staff') && (
                  <DropdownMenuItem onClick={() => setActivePage('staff-list')}>
                    <UserCheck className="w-4 h-4 mr-2" />Staff List
                    <span className="ml-auto text-[10px] text-muted-foreground font-mono">{permTag('staff')}</span>
                  </DropdownMenuItem>
                )}
                {canAccess('attendance') && (
                  <DropdownMenuItem onClick={() => setActivePage('attendance')}>
                    <Clock className="w-4 h-4 mr-2" />Attendance
                    <span className="ml-auto text-[10px] text-muted-foreground font-mono">{permTag('attendance')}</span>
                  </DropdownMenuItem>
                )}
                {canAccess('payroll') && (
                  <DropdownMenuItem onClick={() => setActivePage('payroll')}>
                    <DollarSign className="w-4 h-4 mr-2" />Payroll
                    <span className="ml-auto text-[10px] text-muted-foreground font-mono">{permTag('payroll')}</span>
                  </DropdownMenuItem>
                )}
                {/* {canAccess('staff-fingerprint') && (
                  <DropdownMenuItem onClick={() => setActivePage('staff-fingerprint')}>
                    <Fingerprint className="w-4 h-4 mr-2" />Staff Fingerprint
                    <span className="ml-auto text-[10px] text-muted-foreground font-mono">{permTag('staff-fingerprint')}</span>
                  </DropdownMenuItem>
                )} */}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* import { Package, ChevronDown, PackageCheck, PackageSearch } from "lucide-react"; */}

            {productGroupVisible && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={isProductActive ? 'default' : 'ghost'}
                    size="sm"
                    className={isProductActive ? 'bg-rose-500 hover:bg-rose-600 text-white' : ''}
                  >
                    <Package className="w-4 h-4 mr-1" />Products<ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {canAccess('products') && (
                    <DropdownMenuItem onClick={() => setActivePage('products')}>
                      <PackageCheck className="w-4 h-4 mr-2" />Product
                      <span className="ml-auto text-[10px] text-muted-foreground font-mono">{permTag('products')}</span>
                    </DropdownMenuItem>
                  )}
                  {canAccess('tproducts') && (
                    <DropdownMenuItem onClick={() => setActivePage('tproducts')}>
                      <PackageSearch className="w-4 h-4 mr-2" />TProduct
                      <span className="ml-auto text-[10px] text-muted-foreground font-mono">{permTag('tproducts')}</span>
                    </DropdownMenuItem>
                  )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}


            {clientsGroupVisible && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={isClientsActive ? 'default' : 'ghost'}
                    size="sm"
                    className={isClientsActive ? 'bg-rose-500 hover:bg-rose-600 text-white' : ''}
                  >
                    <Users className="w-4 h-4 mr-1" />Clients<ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {canAccess('clients') && (
                    <DropdownMenuItem onClick={() => setActivePage('clients')}>
                      <Users className="w-4 h-4 mr-2" />Client
                      <span className="ml-auto text-[10px] text-muted-foreground font-mono">{permTag('products')}</span>
                    </DropdownMenuItem>
                  )}
                  {canAccess('clients_message') && (
                    <DropdownMenuItem onClick={() => setActivePage('clients_message')}>
                      <MessageSquareText className="w-4 h-4 mr-2" />Client Message
                      <span className="ml-auto text-[10px] text-muted-foreground font-mono">{permTag('clients_message')}</span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

          {regularItems.map((item) => (
            <NavBtn key={item.id} id={item.id} label={item.label} icon={item.icon} />
          ))}
        </nav>

        {/* ─── Right Side ─────────────────────────────── */}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="hidden sm:flex">
                <Avatar className="w-7 h-7 mr-2">
                  <AvatarFallback className={cn(
                    'text-xs',
                    isActive ? 'bg-rose-100 text-rose-600' : 'bg-gray-100 text-gray-400'
                  )}>
                    {user?.name?.[0] || 'A'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start">
                  <span className={cn('text-sm leading-tight', !isActive && 'text-muted-foreground line-through')}>
                    {user?.name || 'Admin'}
                  </span>
                  <span className={cn(
                    'text-[9px] leading-tight flex items-center gap-1',
                    isActive ? 'text-green-600' : 'text-red-500'
                  )}>
                    <span className={cn(
                      'w-1.5 h-1.5 rounded-full',
                      isActive ? 'bg-green-500' : 'bg-red-500'
                    )} />
                    {isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <div className="px-2 py-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{user?.name || 'Admin'}</p>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] capitalize gap-1',
                      isActive
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-red-50 text-red-600 border-red-200'
                    )}
                  >
                    <span className={cn(
                      'w-1.5 h-1.5 rounded-full',
                      isActive ? 'bg-green-500' : 'bg-red-500'
                    )} />
                    {isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">{user?.email || ''}</p>            
              </div>
              <Separator />
              <DropdownMenuItem onClick={logout} className="text-red-600">
                <LogOut className="w-4 h-4 mr-2" />Logout
              </DropdownMenuItem>
              {!userBranchId && (
                <DropdownMenuItem onClick={onRegisterOpen} className="text-blue-600 p-0">
                  <Button variant="ghost" size="sm" className="w-full justify-start text-blue-600"
                    onClick={() => { onRegisterOpen(); setMobileMenuOpen(false); }}>
                    <UserPlus className="w-4 h-4 mr-2" />Register New Admin
                  </Button>
                </DropdownMenuItem>
              )}   
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* ─── Mobile Nav ───────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t bg-white p-4 space-y-2 max-h-[80vh] overflow-y-auto">
          {/* User status card */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Avatar className="w-10 h-10">
              <AvatarFallback className={cn(
                'text-sm',
                isActive ? 'bg-rose-100 text-rose-600' : 'bg-gray-100 text-gray-400'
              )}>
                {user?.name?.[0] || 'A'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className={cn('text-sm font-semibold truncate', !isActive && 'text-muted-foreground line-through')}>
                {user?.name || 'Admin'}
              </p>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {userBranchId
                  ? formatBranch(user?.branch)
                  : <span className="text-amber-600">All Branches</span>
                }
              </p>
            </div>
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] shrink-0 gap-1',
                isActive
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-red-50 text-red-600 border-red-200'
              )}
            >
              <span className={cn(
                'w-1.5 h-1.5 rounded-full',
                isActive ? 'bg-green-500' : 'bg-red-500'
              )} />
              {isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>

          <Separator />

          {/* ✅ Mobile Nav Items (Excluding grouped items) */}
          {visibleItems.map((item) => {
            if (['staff', 'attendance', 'payroll', 'staff-fingerprint', 'products', 'tproducts'].includes(item.key || '')) return null;
            return (
              <Button
                key={item.id}
                variant={activePage === item.id ? 'default' : 'ghost'}
                size="sm"
                className="w-full justify-between"
                onClick={() => { setActivePage(item.id as any); setMobileMenuOpen(false); }}
                style={activePage === item.id ? { backgroundColor: '#f43f5e', color: 'white' } : {}}
              >
                <span className="flex items-center">
                  <item.icon className="w-4 h-4 mr-2" />{item.label}
                </span>
                {item.key && (
                  <span className={cn(
                    'text-[9px] px-1.5 py-0.5 rounded font-mono',
                    activePage === item.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-muted-foreground'
                  )}>
                    {permTag(item.key!)}
                  </span>
                )}
              </Button>
            );
          })}

          {/* Mobile Staff Group */}
          {staffGroupVisible && (
            <div className="pl-4 space-y-1 border-l-2 border-rose-200 ml-3 mt-1">
              {/* ... (Existing Staff mobile buttons remain unchanged) ... */}
              {canAccess('staff') && (
                <Button
                  variant={activePage === 'staff-list' ? 'default' : 'ghost'}
                  size="sm"
                  className="w-full justify-between"
                  onClick={() => { setActivePage('staff-list'); setMobileMenuOpen(false); }}
                  style={activePage === 'staff-list' ? { backgroundColor: '#f43f5e', color: 'white' } : {}}
                >
                  <span className="flex items-center"><UserCheck className="w-4 h-4 mr-2" />Staff List</span>
                  <span className={cn('text-[9px] px-1.5 py-0.5 rounded font-mono',
                    activePage === 'staff-list' ? 'bg-white/20 text-white' : 'bg-gray-100 text-muted-foreground'
                  )}>{permTag('staff')}</span>
                </Button>
              )}
              {canAccess('attendance') && (
                <Button
                  variant={activePage === 'attendance' ? 'default' : 'ghost'}
                  size="sm"
                  className="w-full justify-between"
                  onClick={() => { setActivePage('attendance'); setMobileMenuOpen(false); }}
                  style={activePage === 'attendance' ? { backgroundColor: '#f43f5e', color: 'white' } : {}}
                >
                  <span className="flex items-center"><Clock className="w-4 h-4 mr-2" />Attendance</span>
                  <span className={cn('text-[9px] px-1.5 py-0.5 rounded font-mono',
                    activePage === 'attendance' ? 'bg-white/20 text-white' : 'bg-gray-100 text-muted-foreground'
                  )}>{permTag('attendance')}</span>
                </Button>
              )}
              {canAccess('payroll') && (
                <Button
                  variant={activePage === 'payroll' ? 'default' : 'ghost'}
                  size="sm"
                  className="w-full justify-between"
                  onClick={() => { setActivePage('payroll'); setMobileMenuOpen(false); }}
                  style={activePage === 'payroll' ? { backgroundColor: '#f43f5e', color: 'white' } : {}}
                >
                  <span className="flex items-center"><DollarSign className="w-4 h-4 mr-2" />Payroll</span>
                  <span className={cn('text-[9px] px-1.5 py-0.5 rounded font-mono',
                    activePage === 'payroll' ? 'bg-white/20 text-white' : 'bg-gray-100 text-muted-foreground'
                  )}>{permTag('payroll')}</span>
                </Button>
              )}
              {canAccess('staff-fingerprint') && (
                <Button
                  variant={activePage === 'staff-fingerprint' ? 'default' : 'ghost'}
                  size="sm"
                  className="w-full justify-between"
                  onClick={() => { setActivePage('staff-fingerprint'); setMobileMenuOpen(false); }}
                  style={activePage === 'staff-fingerprint' ? { backgroundColor: '#f43f5e', color: 'white' } : {}}
                >
                  <span className="flex items-center"><Fingerprint className="w-4 h-4 mr-2" />Staff Fingerprint</span>
                  <span className={cn('text-[9px] px-1.5 py-0.5 rounded font-mono',
                    activePage === 'staff-fingerprint' ? 'bg-white/20 text-white' : 'bg-gray-100 text-muted-foreground'
                  )}>{permTag('staff-fingerprint')}</span>
                </Button>
              )}
            </div>
          )}

          {/* ✅ Mobile Products Group */}
          {productGroupVisible && (
            <div className="pl-4 space-y-1 border-l-2 border-purple-200 ml-3 mt-1">
              {canAccess('products') && (
                <Button
                  variant={activePage === 'products' ? 'default' : 'ghost'}
                  size="sm"
                  className="w-full justify-between"
                  onClick={() => { setActivePage('products'); setMobileMenuOpen(false); }}
                  style={activePage === 'products' ? { backgroundColor: '#f43f5e', color: 'white' } : {}}
                >
                  <span className="flex items-center"><Package className="w-4 h-4 mr-2" />Product</span>
                  <span className={cn('text-[9px] px-1.5 py-0.5 rounded font-mono',
                    activePage === 'products' ? 'bg-white/20 text-white' : 'bg-gray-100 text-muted-foreground'
                  )}>{permTag('products')}</span>
                </Button>
              )}
              {canAccess('tproducts') && (
                <Button
                  variant={activePage === 'tproducts' ? 'default' : 'ghost'}
                  size="sm"
                  className="w-full justify-between"
                  onClick={() => { setActivePage('tproducts'); setMobileMenuOpen(false); }}
                  style={activePage === 'tproducts' ? { backgroundColor: '#f43f5e', color: 'white' } : {}}
                >
                  <span className="flex items-center"><Package className="w-4 h-4 mr-2" />TProduct</span>
                  <span className={cn('text-[9px] px-1.5 py-0.5 rounded font-mono',
                    activePage === 'tproducts' ? 'bg-white/20 text-white' : 'bg-gray-100 text-muted-foreground'
                  )}>{permTag('tproducts')}</span>
                </Button>
              )}
            </div>
          )}

          <Separator />

          {/* Mobile permission pills */}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
              {!hasPermissions ? 'Full Access (All Modules)' : 'Your Access'}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {allNavItems.filter((i) => i.key).map((item) => (
                <span
                  key={item.key}
                  className={cn('text-[10px] px-2.5 py-1 rounded-full font-medium border', permColor(item.key!))}
                >
                  {item.label}
                  {canAccess(item.key!) && (
                    <span className="ml-1 opacity-60">({permTag(item.key!)})</span>
                  )}
                </span>
              ))}
            </div>
          </div>

          <Separator />
          <Button variant="ghost" size="sm" className="w-full justify-start text-red-600" onClick={logout}>
            <LogOut className="w-4 h-4 mr-2" />Logout
          </Button>
          {!userBranchId && (
            <Button variant="ghost" size="sm" className="w-full justify-start text-blue-600"
              onClick={() => { onRegisterOpen(); setMobileMenuOpen(false); }}>
              <UserPlus className="w-4 h-4 mr-2" />Register New Admin
            </Button>
          )}
        </div>
      )}
    </header>
  );
}

function DashboardModule() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiCall('get', '/reports').then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full" /></div>;

  const m = data?.metrics || {};
  const chartData = data?.last7Days || [];
  const statusData = data?.appointmentStatuses || [];
  const COLORS = ['#f43f5e', '#f59e0b', '#10b981', '#6366f1'];
  const pieData = statusData.map((s: any) => ({ name: s.status, value: s._count?.status || 0 }));

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold">Dashboard</h1><p className="text-muted-foreground">Welcome back! Here is your salon overview.</p></div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Today's Appointments", value: m.todayAppointments || 0, icon: Calendar, color: 'from-rose-500 to-pink-500' },
          { label: 'Total Clients', value: m.totalClients || 0, icon: Users, color: 'from-amber-500 to-orange-500' },
          { label: 'Pending Transactions', value: m.pendingTransactions || 0, icon: CreditCard, color: 'from-emerald-500 to-teal-500' },
          { label: 'Total Revenue', value: `₹${(m.totalRevenue || 0).toLocaleString()}`, icon: TrendingUp, color: 'from-violet-500 to-purple-500' },
        ].map((item, i) => (
          <Card key={i} className="overflow-hidden border-0 shadow-md">
            <div className={`h-1 bg-gradient-to-r ${item.color}`} />
            <CardContent className="pt-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <p className="text-2xl font-bold mt-1">{item.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center`}>
                  <item.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Staff', value: m.totalStaff || 0, icon: Users },
          { label: 'Services', value: m.totalServices || 0, icon: Scissors },
          { label: 'Branches', value: m.totalBranches || 0, icon: Building2 },
        ].map((item, i) => (
          <Card key={i} className="border-0 shadow-sm">
            <CardContent className="pt-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center"><item.icon className="w-5 h-5 text-gray-600" /></div>
              <div><p className="text-sm text-muted-foreground">{item.label}</p><p className="text-xl font-bold">{item.value}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-md">
          <CardHeader><CardTitle className="text-lg">Appointments (Last 7 Days)</CardTitle></CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" fill="#f43f5e" radius={[4, 4, 0, 0]} /></BarChart>
              </ResponsiveContainer>
            ) : <p className="text-muted-foreground text-center py-10">No data yet</p>}
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardHeader><CardTitle className="text-lg">Appointment Status</CardTitle></CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart><Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>{pieData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart>
              </ResponsiveContainer>
            ) : <p className="text-muted-foreground text-center py-10">No data yet</p>}
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-md">
        <CardHeader><CardTitle className="text-lg">Recent Appointments</CardTitle></CardHeader>
        <CardContent>
          {(data?.recentAppointments || []).length === 0 ? (
            <p className="text-muted-foreground text-center py-6">No appointments yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Client</TableHead><TableHead>Service</TableHead><TableHead>Staff</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {(data?.recentAppointments || []).slice(0, 5).map((a: any) => (
                    <TableRow key={a._id || a.id}>
                      <TableCell className="font-medium">{a.client?.name || a.clientName}</TableCell>
                      <TableCell>{a.service?.name}</TableCell>
                      <TableCell>{a.staff?.name}</TableCell>
                      <TableCell>{a.date}</TableCell>
                      <TableCell><Badge variant={a.status === 'completed' ? 'default' : a.status === 'cancelled' ? 'destructive' : 'secondary'}>{a.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ClientSearchSelect({ clients, selectedClientId, setSelectedClientId }: { 
  clients: any[], 
  selectedClientId: string, 
  setSelectedClientId: (id: string) => void 
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Filter clients based on search input (name or phone)
  const filteredClients = clients.filter((client) => {
    const name = client.name?.toLowerCase() || "";
    const phone = client.phone?.toLowerCase() || "";
    return name.includes(search.toLowerCase()) || phone.includes(search.toLowerCase());
  });

  const selectedClient = clients.find((c) => (c._id || c.id) === selectedClientId);

  return (
    <div className="relative w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="justify-between pl-9 font-normal"
          >            
            {selectedClient ? (
              `${selectedClient.name} - ${selectedClient.phone}`
            ) : (
              <span className="text-gray-400">Search by name or phone...</span>
            )}
            
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput 
              placeholder="Type name or phone..." 
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>No client found.</CommandEmpty>
              <CommandGroup>
                {clients.length === 0 ? (
                  <div className="p-2 text-sm text-gray-500 text-center">
                    Loading clients...
                  </div>
                ) : (
                  filteredClients.map((c) => (
                    <CommandItem
                      key={c._id || c.id}
                      value={c._id || c.id}
                      onSelect={() => {
                        setSelectedClientId(c._id || c.id);
                        setOpen(false);
                        setSearch("");
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedClientId === (c._id || c.id) ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <span>{c.name} - {c.phone}</span>
                        <span className="text-xs text-gray-500 capitalize">
                          {c.gender} {c.membership_card && `| Card: ${c.membership_card}`}
                        </span>
                      </div>
                    </CommandItem>
                  ))
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}


function ClientsModule() {
  const [clients, setClients] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editClient, setEditClient] = useState<any>(null);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', membership_card: '', gender: 'male', dateOfBirth: '', insistService: false, branchId: ''
  });
  const [loading, setLoading] = useState(true);

  // Billing states
  const [billingOpen, setBillingOpen] = useState(false);
  const [billingClient, setBillingClient] = useState<any>(null);
  const [billServices, setBillServices] = useState<any[]>([]);
  const [billDiscount, setBillDiscount] = useState(0);
  const [billTaxPercent, setBillTaxPercent] = useState(5); // Default to 5%
  const [billPayments, setBillPayments] = useState<any[]>([{ cash: "0" }]); // Array format for multiple payments
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [editBill, setEditBill] = useState<any>(null);
  const [clientBills, setClientBills] = useState<any[]>([]);
  const [showBillHistory, setShowBillHistory] = useState(false);

  // Invoice preview state
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceBill, setInvoiceBill] = useState<any>(null);
  const [invoiceClient, setInvoiceClient] = useState<any>(null);

  // Data for dropdowns
  const [allServices, setAllServices] = useState<any[]>([]);
  const [allStaff, setAllStaff] = useState<any[]>([]);
  const [allServiceCombos, setAllServiceCombos] = useState<any[]>([]);

  // ✅ Safely get branchId AND branchName from localStorage
  let localBranchId = '';
  let localBranchName = '';
  try {
    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem("salon_user");
      if (userStr) {
        const user = JSON.parse(userStr);
        localBranchId = user?.branchId?.id || user?.branchId || '';
        localBranchName = user?.branchId?.name || '';
      }
      if (!localBranchId) {
        localBranchId = localStorage.getItem('branchId') || '';
      }
    }
  } catch (e) { /* silent */ }

  const fetchClients = useCallback(async () => {
    try {
      const branchQ = localBranchId ? `&branchId=${localBranchId}` : '';
      const data = await apiCall('get', `/clients?search=${search}${branchQ}`);
      setClients(data.clients || []);
    } catch {
      toast.error('Failed to fetch clients');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const fetchDropdownData = useCallback(async () => {
    try {
      const branchQ = localBranchId ? `?branchId=${localBranchId}` : '';
      const [svcData, staffData, comboData, branchesData] = await Promise.all([
        apiCall('get', `/services${branchQ}`),
        apiCall('get', `/staff${branchQ}`),
        apiCall('get', `/service-combos${branchQ}`),
        apiCall('get', '/branches')
      ]);
      setAllServices(svcData.services || []);
      setAllStaff(staffData.staff || []);
      setAllServiceCombos(comboData.serviceCombos || comboData.combos || []);
      setBranches(branchesData.branches || []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchDropdownData(); }, [fetchDropdownData]);

  const fetchClientBills = useCallback(async (clientId: string) => {
    try {
      const branchQ = localBranchId ? `&branchId=${localBranchId}` : '';
      const data = await apiCall('get', `/client-bills?clientId=${clientId}${branchQ}`);
      setClientBills(data.bills || []);
    } catch { /* silent */ }
  }, []);

  const filteredClients = useMemo(() => {
    if (!localBranchId) return clients || [];
    return (clients || []).filter((c) => {
      if (!c) return false;
      const cBranchId = c.branchId?._id || c.branchId || '';
      return cBranchId === localBranchId;
    });
  }, [clients, localBranchId]);

  const filteredStaffForBilling = useMemo(() => {
    if (!localBranchId) return allStaff || [];
    return (allStaff || []).filter((s) => {
      if (!s) return false;
      const sBranchId = s.branch?._id || s.branchId?._id || s.branchId || '';
      return sBranchId === localBranchId;
    });
  }, [allStaff, localBranchId]);

  const currentBranch = useMemo(() => {
    if (!localBranchId || !branches.length) return null;
    return branches.find((b: any) => (b._id || b.id) === localBranchId) || null;
  }, [branches, localBranchId]);

  // Calculate total amount for Bill History
  const totalBillAmount = useMemo(() => {
    return clientBills.reduce((sum, b) => sum + (parseFloat(String(b.totalAmount)) || 0), 0);
  }, [clientBills]);

  const openNew = () => {
    setEditClient(null);
    setForm({
      name: '', email: '', phone: '', gender: 'male', membership_card: '', dateOfBirth: '', insistService: false,
      branchId: localBranchId
    });
    setDialogOpen(true);
  };

  const openEdit = (c: any) => {
    setEditClient(c);
    setForm({
      name: c.name, email: c.email || '', phone: c.phone, gender: c.gender, membership_card: c.membership_card, dateOfBirth: c.dateOfBirth || '',
      insistService: c.insistService,
      branchId: c.branchId?._id || c.branchId || localBranchId || ''
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (editClient) {
        await apiCall('put', `/clients/${editClient._id || editClient.id}`, form);
        toast.success('Client updated');
      } else {
        await apiCall('post', '/clients', form);
        toast.success('Client added');
      }
      setDialogOpen(false);
      fetchClients();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this client?')) return;
    try {
      await apiCall('delete', `/clients/${id}`);
      toast.success('Deleted');
      fetchClients();
    } catch {
      toast.error('Failed to delete');
    }
  };

  // Format payment method array to readable string
  const formatPaymentMethod = (pm: any) => {
    if (Array.isArray(pm)) {
      return pm.map(p => Object.keys(p)[0]).join(', ').toUpperCase();
    }
    return String(pm || 'cash').toUpperCase();
  };

  // ---- Billing Functions ----
  const openBilling = (c: any, billToEdit?: any) => {
    setBillingClient(c);
    if (billToEdit) {
      setEditBill(billToEdit);
      setBillServices(
        (billToEdit.services || []).map((s: any) => {
          const isCombo = !!(s.serviceComboId?._id || s.serviceComboId);
          return {
            type: isCombo ? 'combo' : 'service',
            serviceId: isCombo ? '' : (s.serviceId?._id || s.serviceId || ''),
            serviceComboId: isCombo ? (s.serviceComboId?._id || s.serviceComboId || '') : '',
            serviceName: s.serviceName || (isCombo ? (s.serviceComboId?.name || '') : (s.serviceId?.name || '')),
            amount: parseFloat(String(s.amount)) || 0,
            quantity: parseInt(String(s.quantity)) || 1,
            serviceAmount: parseFloat(String(s.serviceAmount)) || 0,
            staffId: s.staffId?._id || s.staffId || '',
            staffName: s.staffName || s.staffId?.name || ''
          };
        })
      );
      setBillDiscount(parseFloat(String(billToEdit.discount)) || 0);
      setBillTaxPercent(parseFloat(String(billToEdit.taxPercent)) || 5);
      
      // Safely parse payment method array for edit form
      let existingPayments = [{ cash: "0" }];
      if (Array.isArray(billToEdit.payments) && billToEdit.payments.length > 0) {
        existingPayments = billToEdit.payments;
      } else if (Array.isArray(billToEdit.paymentMethod) && billToEdit.paymentMethod.length > 0) {
        existingPayments = billToEdit.paymentMethod;
      } else if (billToEdit.paymentMethod && typeof billToEdit.paymentMethod === 'string') {
        existingPayments = [{ [billToEdit.paymentMethod]: "0" }];
      }
      setBillPayments(existingPayments);
      
      setBillDate(billToEdit.date || new Date().toISOString().split('T')[0]);
    } else {
      setEditBill(null);
      setBillServices([]);
      setBillDiscount(0);
      setBillTaxPercent(5);
      setBillPayments([{ cash: "0" }]);
      setBillDate(new Date().toISOString().split('T')[0]);
    }
    setShowBillHistory(false);
    setBillingOpen(true);
  };

  const openBillHistory = (c: any) => {
    setBillingClient(c);
    setShowBillHistory(true);
    fetchClientBills(c._id || c.id);
    setBillingOpen(true);
  };

  const addServiceRow = (type: 'service' | 'combo' = 'service') => {
    setBillServices([...billServices, {
      type, serviceId: '', serviceComboId: '', serviceName: '',
      amount: 0, quantity: 1, serviceAmount: 0, staffId: '', staffName: ''
    }]);
  };

  const removeServiceRow = (index: number) => {
    setBillServices(billServices.filter((_, i) => i !== index));
  };

  const updateServiceRow = (index: number, field: string, value: any) => {
    const updated = [...billServices];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'serviceId') {
      const svc = allServices.find((s: any) => (s._id || s.id) === value);
      if (svc) {
        updated[index].serviceName = svc.name;
        updated[index].amount = svc.amount;
        const qty = parseInt(String(updated[index].quantity)) || 1;
        updated[index].serviceAmount = svc.amount * qty;
      }
    }
    if (field === 'serviceComboId') {
      const combo = allServiceCombos.find((c: any) => (c._id || c.id) === value);
      if (combo) {
        updated[index].serviceName = combo.name;
        updated[index].amount = combo.totalPrice || 0;
        const qty = parseInt(String(updated[index].quantity)) || 1;
        updated[index].serviceAmount = (combo.totalPrice || 0) * qty;
      }
    }
    if (field === 'quantity' || field === 'amount') {
      const amt = parseFloat(String(updated[index].amount)) || 0;
      const qty = parseInt(String(updated[index].quantity)) || 1;
      updated[index].serviceAmount = amt * qty;
    }
    if (field === 'staffId') {
      const stf = allStaff.find((s: any) => (s._id || s.id) === value);
      updated[index].staffName = stf ? stf.name : '';
    }
    setBillServices(updated);
  };

  const subtotal = billServices.reduce((sum, s) => sum + (parseFloat(String(s.serviceAmount)) || 0), 0);
  const discount = parseFloat(String(billDiscount)) || 0;
  const clientAmount = subtotal - discount;
  const taxPercent = parseFloat(String(billTaxPercent)) || 0;
  const taxAmount = (clientAmount * taxPercent) / 100;
  const totalAmount = clientAmount + taxAmount;

  const handleBillSubmit = async () => {
    if (!billingClient) return;
    if (billServices.length === 0) { toast.error('Add at least one service'); return; }
    const hasEmpty = billServices.some(s => s.type === 'service' && !s.serviceId);
    const hasEmptyCombo = billServices.some(s => s.type === 'combo' && !s.serviceComboId);
    if (hasEmpty || hasEmptyCombo) { toast.error('Select a service/combo for each row'); return; }

    const payload = {
      clientId: billingClient._id || billingClient.id,
      branchId: localBranchId || undefined,
      services: billServices.map(s => ({
        serviceId: s.type === 'combo' ? null : s.serviceId,
        serviceComboId: s.type === 'combo' ? s.serviceComboId : null,
        serviceName: s.serviceName,
        amount: parseFloat(String(s.amount)) || 0,
        quantity: parseInt(String(s.quantity)) || 1,
        serviceAmount: parseFloat(String(s.serviceAmount)) || 0,
        staffId: s.staffId || null,
        staffName: s.staffName || ''
      })),
      subtotal: parseFloat(subtotal.toFixed(2)),
      discount: parseFloat(discount.toFixed(2)),
      clientAmount: parseFloat(clientAmount.toFixed(2)),
      taxPercent: taxPercent,
      taxAmount: parseFloat(taxAmount.toFixed(2)),
      totalAmount: parseFloat(totalAmount.toFixed(2)),
      payments: billPayments, // Array format: [{ cash: "1059" }]
      paymentMethod: billPayments, 
      status: 'paid',
      date: billDate
    };

    try {
      if (editBill) {
        await apiCall('put', `/client-bills/${editBill._id || editBill.id}`, payload);
        toast.success('Bill updated successfully');
      } else {
        await apiCall('post', '/client-bills', payload);
        toast.success('Bill created successfully');
      }
      setBillingOpen(false);
      fetchClients();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save bill');
    }
  };

  const handleDeleteBill = async (billId: string) => {
    if (!confirm('Delete this bill?')) return;
    try {
      await apiCall('delete', `/client-bills/${billId}`);
      toast.success('Bill deleted');
      if (billingClient) fetchClientBills(billingClient._id || billingClient.id);
    } catch {
      toast.error('Failed to delete bill');
    }
  };

  const safeBill = (bill: any) => {
    const sub = parseFloat(String(bill.subtotal)) || (bill.services || []).reduce((s: number, sv: any) => s + (parseFloat(String(sv.serviceAmount)) || 0), 0);
    const disc = parseFloat(String(bill.discount)) || 0;
    const cAmt = parseFloat(String(bill.clientAmount)) || (sub - disc);
    const tPct = parseFloat(String(bill.taxPercent)) || 0;
    const tAmt = parseFloat(String(bill.taxAmount)) || ((cAmt * tPct) / 100);
    const tot = parseFloat(String(bill.totalAmount)) || (cAmt + tAmt);
    return { ...bill, subtotal: sub, discount: disc, clientAmount: cAmt, taxPercent: tPct, taxAmount: tAmt, totalAmount: tot };
  };

  const openInvoice = (bill: any) => {
    setInvoiceBill(safeBill(bill));
    setInvoiceClient(billingClient);
    setInvoiceOpen(true);
  };

  const handlePrintInvoice = () => { window.print(); };

  const generateInvoiceDoc = async (bill: any, client: any) => {
    const b = safeBill(bill);
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const centerX = pageWidth / 2;
    const marginLeft = 14;
    const marginRight = 14;
    try {
      const logoBase64 = await loadImageAsBase64("https://res.cloudinary.com/dspp2vqid/image/upload/w_200,h_64,c_limit,q_auto,f_auto/v1763190132/picknowcrm/ol37ycat5une3kzyttdo.png");
      doc.addImage(logoBase64, "PNG", centerX - 7, 10, 14, 14);
    } catch {}
    let y = 30;
    doc.setFontSize(22); doc.setFont("helvetica", "bold"); doc.setTextColor(225, 29, 72);
    doc.text("UNIKAA", centerX, y, { align: "center" }); doc.setTextColor(0, 0, 0);
    y += 7; doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(120, 120, 120);
    doc.text("INDIA'S NO.1 HAIR AND BEAUTY SALON", centerX, y, { align: "center" });
    y += 5; doc.text("TAMIL NADU 625016", centerX, y, { align: "center" });
    y += 5;

    // Resolve branch: prefer the branch on the client record, fall back to local branch
    const clientBranchIdStr = String(client?.branchId?._id || client?.branchId?.id || client?.branchId || '');
    const localBranchIdStr = String(localBranchId?._id || localBranchId?.id || localBranchId || '');
    const resolvedBranchIdStr = clientBranchIdStr || localBranchIdStr;

    const matchedBranch = branches.find((b2: any) => {
      const branchIdStr = String(b2._id || b2.id || '');
      return branchIdStr === resolvedBranchIdStr;
    });

    const pdfBranchName =
      matchedBranch?.name ||
      matchedBranch?.branchName ||
      currentBranch?.name ||
      localBranchName ||
      '—';

    doc.text(`Branch: ${pdfBranchName}`, centerX, y, { align: "center" });    y += 5; doc.text("GSTIN: 33AAIFU3741Q1ZO", centerX, y, { align: "center" });
    doc.setTextColor(0, 0, 0);
    y += 6; doc.setDrawColor(220, 220, 220); doc.line(marginLeft, y, pageWidth - marginRight, y);
    y += 10; doc.setFontSize(11); doc.setFont("helvetica", "bold");
    doc.text("Bill No:", marginLeft, y); doc.text("Date:", pageWidth - marginRight, y, { align: "right" });
    doc.setFont("helvetica", "normal"); doc.text(String(b.billId || ''), marginLeft, y + 6); doc.text(String(b.date || ''), pageWidth - marginRight, y + 6, { align: "right" });
    y += 16; doc.setFont("helvetica", "bold");
    doc.text("Client:", marginLeft, y); doc.text("Phone:", pageWidth - marginRight, y, { align: "right" });
    doc.setFont("helvetica", "normal"); doc.text(String(client?.name || ''), marginLeft, y + 6); doc.text(String(client?.phone || ''), pageWidth - marginRight, y + 6, { align: "right" });
    const rows = (b.services || []).map((s: any) => [String(s.serviceName || ''), String(s.quantity || 1), `Rs. ${parseFloat(String(s.serviceAmount)).toFixed(2)}`]);
    autoTable(doc, { startY: y + 14, margin: { left: marginLeft, right: marginRight }, head: [["Service", "Qty", "Amount"]], body: rows, theme: "plain", headStyles: { fontStyle: "bold", fontSize: 10, textColor: [0, 0, 0] }, styles: { fontSize: 10, cellPadding: { top: 3, bottom: 3 } }, columnStyles: { 0: { cellWidth: "auto" }, 1: { cellWidth: 25, halign: "center" }, 2: { cellWidth: 35, halign: "right" } } });
    const finalY = (doc as any).lastAutoTable.finalY + 8;
    const summaryLabelX = marginLeft; const summaryValueX = pageWidth - marginRight;
    const summaryLines: [string, string][] = [["Subtotal", `Rs. ${b.subtotal.toFixed(2)}`], ["Discount", `-Rs. ${b.discount.toFixed(2)}`], ["Client Amount", `Rs. ${b.clientAmount.toFixed(2)}`], [`Tax (${b.taxPercent}%)`, `Rs. ${b.taxAmount.toFixed(2)}`]];
    doc.setFontSize(10); doc.setFont("helvetica", "normal"); let sy = finalY;
    summaryLines.forEach(([label, value]) => { doc.text(label, summaryLabelX, sy); doc.text(value, summaryValueX, sy, { align: "right" }); sy += 6; });
    sy += 2; doc.setDrawColor(220, 220, 220); doc.line(summaryLabelX, sy, summaryValueX, sy); sy += 8;
    doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text("Total", summaryLabelX, sy); doc.setTextColor(225, 29, 72);
    doc.text(`Rs. ${b.totalAmount.toFixed(2)}`, summaryValueX, sy, { align: "right" }); doc.setTextColor(0, 0, 0);
    sy += 10; doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.text("Payment", summaryLabelX, sy); doc.setFont("helvetica", "bold");
    doc.text(formatPaymentMethod(b.paymentMethod), summaryValueX, sy, { align: "right" });
    sy += 6; doc.setFont("helvetica", "normal");
    doc.text("Status", summaryLabelX, sy); doc.setFont("helvetica", "bold");
    const isPaid = b.status === "paid";
    doc.setTextColor(isPaid ? 30 : 120, isPaid ? 30 : 120, 30);
    doc.text(String(b.status || 'unpaid').toUpperCase(), summaryValueX, sy, { align: "right" });
    doc.setTextColor(0, 0, 0);
    return doc;
  };

  const handleDownloadInvoice = async () => {
    if (!invoiceBill || !invoiceClient) return;
    const doc = await generateInvoiceDoc(invoiceBill, invoiceClient);
    doc.save(`invoice-${invoiceBill.billId}.pdf`);
  };

  const sendWhatsApp = async (client: any, bill: any) => {
    if (!client) return;
    if (!bill || !bill._id) {
      const cleanPhone = client.phone.replace(/\D/g, '');
      window.open(`https://wa.me/${cleanPhone}?text=Hello%20${client.name}`, '_blank');
      return;
    }
    try {
      toast.loading("Generating PDF...");
      const doc = await generateInvoiceDoc(bill, client);
      const pdfBlob = doc.output('blob');
      toast.loading("Sending WhatsApp message...");
      const formData = new FormData();
      formData.append("phone", client.phone);
      formData.append("billId", bill._id);
      formData.append("file", pdfBlob, `invoice-${bill.billId}.pdf`);
      const response = await fetch("http://localhost:5000/api/client-bills/whatsapp", { method: "POST", body: formData });
      const data = await response.json();
      toast.dismiss();
      if (data.success) { toast.success("WhatsApp message sent successfully."); }
      else { toast.error(data.message || "Failed to send WhatsApp message."); }
    } catch (error) {
      toast.dismiss(); console.error(error);
      toast.error("Something went wrong while sending WhatsApp.");
    }
  };

  const paymentMethods = [
    { value: "cash", label: "Cash", icon: Banknote },
    { value: "debit_card", label: "Debit", icon: CreditCard },
    { value: "credit_card", label: "Credit", icon: CreditCard },
    { value: "paytm", label: "Paytm", icon: Smartphone },
    { value: "gpay", label: "GPay", icon: Wallet }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Clients</h1>
          <p className="text-muted-foreground">Manage your salon clients</p>
          {localBranchName && (
            <p className="text-xs text-muted-foreground mt-1">
              Branch: <span className="font-semibold text-rose-600">{localBranchName}</span>
            </p>
          )}
        </div>
        <Button onClick={openNew} className="bg-rose-500 hover:bg-rose-600 text-white">
          <Plus className="w-4 h-4 mr-1" />Add Client
        </Button>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search clients..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <Card className="border-0 shadow-md">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>M_Card</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-10">Loading...</TableCell></TableRow>
                ) : filteredClients.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">No clients found for this branch</TableCell></TableRow>
                ) : (
                  filteredClients.map((c) => (
                    <TableRow key={c._id || c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{c.phone}</TableCell>
                      <TableCell className="capitalize">{c.gender}</TableCell>
                      <TableCell className="capitalize">{c.membership_card}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* <Button variant="ghost" size="icon" onClick={() => openBilling(c)} title="Create Bill"><Receipt className="w-4 h-4 text-amber-600" /></Button> */}
                          <Button variant="ghost" size="icon" onClick={() => openBillHistory(c)} title="Bill History"><FileText className="w-4 h-4 text-blue-600" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => sendWhatsApp(c, null)} title="WhatsApp"><MessageCircle className="w-4 h-4 text-green-600" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Edit className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(c._id || c.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Client Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editClient ? 'Edit Client' : 'Add Client'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Phone *</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>M_Card</Label><Input type="text" value={form.membership_card} onChange={(e) => setForm({ ...form, membership_card: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Gender</Label>
                <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Date of Birth</Label><Input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} /></div>
            </div>
            {localBranchId ? (
                <div>
                  <Label>Branch</Label>
                  <div className="h-10 px-3 flex items-center rounded-md border border-input bg-muted/50 text-sm font-medium">
                    {localBranchName || (branches.find((b: any) => (b._id || b.id) === localBranchId)?.name || localBranchId)}
                  </div>
                </div>
              ) : (
                // ✅ If localBranchId is null: Show Dropdown (Editable)
                <div>
                  <Label>Branch</Label>
                  <Select 
                    value={form.branchId || ''} 
                    onValueChange={(v) => setForm({ ...form, branchId: v })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((b: any) => (
                        <SelectItem key={b._id || b.id} value={b._id || b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            <Button onClick={handleSubmit} className="w-full bg-rose-500 hover:bg-rose-600 text-white">
              {editClient ? 'Update' : 'Add'} Client
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Billing / Bill History Dialog */}
      <Dialog open={billingOpen} onOpenChange={setBillingOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {showBillHistory ? 'Bill History' : editBill ? 'Edit Bill' : 'Create Bill'} - {billingClient?.name}
              {showBillHistory && (
                <span className="block text-sm font-normal text-muted-foreground mt-1">
                  Total Bills: {clientBills.length} | Total Amount: ₹{totalBillAmount.toLocaleString()}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          {showBillHistory ? (
            <div className="space-y-3">
              {clientBills.length === 0 ? (
                <p className="text-center py-6 text-muted-foreground">No bills found</p>
              ) : (
                clientBills.map((b: any) => (
                  <Card key={b._id || b.id} className="shadow-sm">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{b.billId}</p>
                          <p className="text-sm text-muted-foreground">{b.date} | {b.services?.length || 0} services</p>
                          <p className="text-lg font-bold mt-1">₹{parseFloat(String(b.totalAmount))?.toLocaleString() || '0'}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge variant={b.status === 'paid' ? 'default' : b.status === 'refunded' ? 'destructive' : 'secondary'}>{b.status}</Badge>
                          <Button variant="ghost" size="icon" onClick={() => openInvoice(b)} title="Invoice"><Receipt className="w-4 h-4 text-amber-600" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => sendWhatsApp(billingClient, b)} title="WhatsApp"><MessageCircle className="w-4 h-4 text-green-600" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => openBilling(billingClient, b)} title="Edit"><Edit className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteBill(b._id || b.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Services</h3>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => addServiceRow('service')} className="bg-rose-500 hover:bg-rose-600 text-white"><Plus className="w-3 h-3 mr-1" />Add Service</Button>
                  <Button size="sm" onClick={() => addServiceRow('combo')} className="bg-purple-500 hover:bg-purple-600 text-white"><Plus className="w-3 h-3 mr-1" />Add Combo</Button>
                </div>
              </div>
              {billServices.length === 0 ? <p className="text-center py-4 text-muted-foreground">No services added yet</p> :
                <div className="space-y-2">
                  {billServices.map((s, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-end p-2 bg-gray-50 rounded-lg">
                      <div className="col-span-12 md:col-span-4">
                        <Label className="text-xs">{s.type === 'combo' ? 'Service Combo' : 'Service'}</Label>
                        {s.type === 'combo' ? (
                          <Select value={s.serviceComboId} onValueChange={(v) => updateServiceRow(i, 'serviceComboId', v)}><SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select Combo" /></SelectTrigger><SelectContent>{allServiceCombos.map((c: any) => <SelectItem key={c._id || c.id} value={c._id || c.id}>{c.name} (₹{c.totalPrice})</SelectItem>)}</SelectContent></Select>
                        ) : (
                          <Select value={s.serviceId} onValueChange={(v) => updateServiceRow(i, 'serviceId', v)}><SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select Service" /></SelectTrigger><SelectContent>{allServices.map((svc: any) => <SelectItem key={svc._id || svc.id} value={svc._id || svc.id}>{svc.name}</SelectItem>)}</SelectContent></Select>
                        )}
                      </div>
                      <div className="col-span-3 md:col-span-2"><Label className="text-xs">Amount</Label><Input type="number" className="h-9 text-xs" value={s.amount} onChange={(e) => updateServiceRow(i, 'amount', e.target.value)} /></div>
                      <div className="col-span-3 md:col-span-1"><Label className="text-xs">Qty</Label><Input type="number" className="h-9 text-xs" min="1" value={s.quantity} onChange={(e) => updateServiceRow(i, 'quantity', e.target.value)} /></div>
                      <div className="col-span-3 md:col-span-2"><Label className="text-xs">Svc Amt</Label><Input type="number" className="h-9 text-xs bg-muted" value={s.serviceAmount} readOnly /></div>
                      <div className="col-span-9 md:col-span-2">
                        <Label className="text-xs">Staff</Label>
                        <Select value={s.staffId} onValueChange={(v) => updateServiceRow(i, 'staffId', v)}>
                          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Staff" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {filteredStaffForBilling.map((st: any) => <SelectItem key={st._id || st.id} value={st._id || st.id}>{st.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-3 md:col-span-1 flex justify-end">
                        <Button variant="ghost" size="icon" className="text-red-500 h-9 w-9" onClick={() => removeServiceRow(i)}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              }
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Date</Label><Input type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} /></div>
              </div>

              {/* Payment Method Checkboxes and Amount Inputs */}
              <div className="space-y-2">
                <Label>Payment Method(s)</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {paymentMethods.map((method) => {
                    const activePayment = billPayments.find(p => p[method.value] !== undefined);
                    return (
                      <div key={method.value} className="flex flex-col items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (activePayment) {
                              setBillPayments(billPayments.filter(p => p[method.value] === undefined));
                            } else {
                              setBillPayments([...billPayments, { [method.value]: "0" }]);
                            }
                          }}
                          className={cn(
                            "flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 p-3 transition-all duration-150 cursor-pointer w-full",
                            activePayment ? "border-rose-500 bg-rose-50 text-rose-600 shadow-sm" : "border-muted bg-white text-muted-foreground hover:border-rose-300"
                          )}
                        >
                          <method.icon className="w-5 h-5" />
                          <span className="text-[11px] font-medium leading-tight text-center">{method.label}</span>
                        </button>
                        {activePayment && (
                          <Input
                            type="number"
                            className="h-8 text-xs text-center"
                            placeholder="Amount"
                            value={activePayment[method.value]}
                            onChange={(e) => {
                              const val = e.target.value;
                              setBillPayments(billPayments.map(p => p[method.value] !== undefined ? { [method.value]: val } : p));
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm"><span>Subtotal</span><span>₹{subtotal.toLocaleString()}</span></div>
                <div className="flex justify-between items-center text-sm"><span>Discount</span><Input type="number" className="w-32 h-8 text-sm text-right" value={billDiscount} onChange={(e) => setBillDiscount(parseFloat(e.target.value) || 0)} /></div>
                <div className="flex justify-between text-sm"><span>Client Amount</span><span>₹{clientAmount.toLocaleString()}</span></div>
                <div className="flex justify-between items-center text-sm">
                  <span>Tax %</span>
                  <Input type="number" className="w-32 h-8 text-sm text-right" value={billTaxPercent} onChange={(e) => setBillTaxPercent(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="flex justify-between text-sm"><span>Tax Amount</span><span>₹{taxAmount.toLocaleString()}</span></div>
                <Separator />
                <div className="flex justify-between font-bold text-lg"><span>Total</span><span className="text-rose-600">₹{totalAmount.toLocaleString()}</span></div>
              </div>
              <Button onClick={handleBillSubmit} className="w-full bg-rose-500 hover:bg-rose-600 text-white">{editBill ? 'Update Bill' : 'Create Bill'}</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Invoice Preview Dialog */}
        <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="sr-only">Invoice Receipt</DialogTitle>
            </DialogHeader>
            
            {invoiceBill && invoiceClient && (
              <div className="space-y-4" id="invoice-content">
                
                {/* ✅ Top Logo & Header Section (Center Aligned) */}
           <div className="flex flex-col items-center text-center border-b pb-4">
            <img 
              src="https://res.cloudinary.com/dspp2vqid/image/upload/w_200,h_64,c_limit,q_auto,f_auto/v1763190132/picknowcrm/ol37ycat5une3kzyttdo.png" 
              alt="unikaa" 
              className="h-16 w-auto object-contain mb-2" 
            />
            <h2 className="text-xl font-bold text-rose-600">UNIKAA</h2>
 
            <div className="inline-flex flex-col items-start text-left text-sm mt-4">
              <div>
                <span className="text-gray-500">Bill No: </span>
                <span className="font-semibold text-gray-700">{invoiceBill.billId}</span>
              </div>
              <div>
                <span className="text-gray-500">Date: </span>
                <span className="font-semibold text-gray-700">{invoiceBill.date}</span>
              </div>
              <div>
                <span className="text-gray-500">Client: </span>
                <span className="font-semibold text-gray-700">{invoiceClient.name}</span>
              </div>
              <div>
                <span className="text-gray-500">Service by: </span>
                <span className="font-semibold text-gray-700">
                  {(invoiceBill.services || []).map((s: any) => s.staffName).filter(Boolean).join(', ') || 'N/A'}
                </span>
              </div>
            </div>
            </div>
                {/* ✅ Services Table */}
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="text-left">Service</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(invoiceBill.services || []).map((s: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium text-left">{s.serviceName}</TableCell>
                        <TableCell className="text-center">{s.quantity}</TableCell>
                        <TableCell className="text-right">₹{parseFloat(String(s.serviceAmount || 0)).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* ✅ Summary & Payment Section */}
                <div className="space-y-2 text-sm border-t pt-3">
                  <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>₹{Number(invoiceBill.subtotal || 0).toFixed(2)}</span></div>
                  <div className="flex justify-between text-gray-600"><span>Discount</span><span>-₹{Number(invoiceBill.discount || 0).toFixed(2)}</span></div>
                  <div className="flex justify-between text-gray-600"><span>Client Amount</span><span>₹{Number(invoiceBill.clientAmount || 0).toFixed(2)}</span></div>
                  <div className="flex justify-between text-gray-600"><span>Tax ({invoiceBill.taxPercent || 0}%)</span><span>₹{Number(invoiceBill.taxAmount || 0).toFixed(2)}</span></div>
                  
                  <Separator />
                  
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-rose-600">₹{Number(invoiceBill.totalAmount || 0).toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between mt-3 text-gray-700">
                    <span>Payment</span>
                    <span className="font-semibold uppercase">{formatPaymentMethod(invoiceBill.paymentMethod)}</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>Status</span>
                    <Badge variant={invoiceBill.status === 'paid' ? 'default' : 'secondary'}>{invoiceBill.status}</Badge>
                  </div>
                </div>
                 <div className="flex flex-col items-center text-center gap-1">
                    <img 
                      src="https://res.cloudinary.com/e3jbzpxf/image/upload/v1788950311/whatsapp_qr_code.png" 
                      alt="unikaa" 
                      className="h-16 w-auto object-contain mb-2" 
                    />
                    <p>GSTIN: 33AAIFU3741Q1ZO</p>
                  </div>
                <div className="text-center border-t pt-4 text-xs text-muted-foreground space-y-1">
                  {(() => {
                      const clientBranchIdStr = String(
                        invoiceClient?.branchId?._id || invoiceClient?.branchId?.id || invoiceClient?.branchId || ''
                      );
                      const currentBranchIdStr = String(currentBranch?._id || currentBranch?.id || '');
                      const resolvedBranchIdStr = clientBranchIdStr || currentBranchIdStr;

                      const matchedBranch = branches?.find((b2: any) => {
                        const branchIdStr = String(b2._id || b2.id || '');
                        return branchIdStr === resolvedBranchIdStr;
                      });

                      const displayBranch = matchedBranch || currentBranch;

                      return displayBranch ? (
                        <div>
                          {displayBranch.name && (
                            <p>
                              {displayBranch.name}
                              {displayBranch.phone ? ` | Ph: ${displayBranch.phone}` : ''}
                            </p>
                          )}
                        </div>
                      ) : null;
                    })()}
                   <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    INDIA'S NO.1 HAIR AND BEAUTY SALON
                  </p>
                  <p className="font-semibold text-gray-600 pt-1">Thank You</p>
                </div>

                {/* ✅ Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button onClick={handleDownloadInvoice} className="flex-1 bg-rose-500 hover:bg-rose-600 text-white">
                    <Download className="w-4 h-4 mr-1" />Download
                  </Button>
                  <Button onClick={handlePrintInvoice} variant="outline" className="flex-1">
                    <Printer className="w-4 h-4 mr-1" />Print
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
    </div>
  );
}


const ReactQuill = dynamic(() => import('react-quill-new'), { 
  ssr: false, 
  loading: () => <p>Loading editor...</p>, 
});

const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, 4, 5, 6, false] }],
    ['bold', 'italic', 'underline', 'strike', 'blockquote'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link', 'image'],
    ['clean']
  ]
};


function ClientsMessageModule() {
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingClients, setFetchingClients] = useState(true);
  const [phoneSearch, setPhoneSearch] = useState('');

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await apiCall('get', '/clients');
        setClients(res.clients || []);
      } catch (error) {
        toast.error('Failed to fetch clients');
      } finally {
        setFetchingClients(false);
      }
    };
    fetchClients();
  }, []);

  const filteredClients = clients.filter((c) => 
    c.phone?.toLowerCase().includes(phoneSearch.toLowerCase()) ||
    c.name?.toLowerCase().includes(phoneSearch.toLowerCase())
  );

  const handleSelectAll = (isChecked: boolean) => {
    if (isChecked) {
      setSelectedClientIds(filteredClients.map((c) => c._id || c.id));
    } else {
      setSelectedClientIds([]);
    }
  };

  const handleSelectClient = (clientId: string) => {
    setSelectedClientIds((prev) =>
      prev.includes(clientId)
        ? prev.filter((id) => id !== clientId)
        : [...prev, clientId]
    );
  };

  // Submit Message to API
  const handleSubmit = async () => {
    if (selectedClientIds.length === 0) {
      toast.error('Please select at least one client');
      return;
    }
    if (!title || !description) {
      toast.error('Title and Description are required');
      return;
    }

    setLoading(true);

    try {
      // ✅ 1. Get the phone numbers of the selected clients for WhatsApp
      const selectedPhoneNumbers = clients
        .filter(c => selectedClientIds.includes(c._id || c.id))
        .map(c => c.phone);

      // ✅ 2. Create FormData to send raw file + text to YOUR backend
      const formData = new FormData();
      formData.append('phoneNumbers', JSON.stringify(selectedPhoneNumbers));
      formData.append('clientIds', JSON.stringify(selectedClientIds));
      formData.append('title', title);
      formData.append('description', description);
      
      // ✅ 3. Append the raw image file (Your backend will upload it to Cloudinary)
      if (imageFile) {
        formData.append('image', imageFile);
      }

      // ✅ 4. Send to your backend API
      await apiCall('post', '/client-bills/multiple/customer', formData);
      
      toast.success(`Message sent successfully to ${selectedClientIds.length} clients!`);
      
      // Reset form
      setTitle('');
      setDescription('');
      setImageFile(null);
      setSelectedClientIds([]);
      setPhoneSearch('');
      
      const fileInput = document.getElementById('message-image') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (error: any) {
      console.error("Full Error Details:", error);
      const errMsg = error?.message || error?.response?.data?.message || 'Failed to send message';
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // ✅ 4. Virtualizer setup
  const parentRef = useRef(null);
  const rowVirtualizer = useVirtualizer({
    count: filteredClients.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 10,
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* LEFT COLUMN: Client Selection List */}
      <div className="lg:col-span-1">
        <Card className="border-0 shadow-md sticky top-6">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg flex items-center">
              <Users className="w-5 h-5 mr-2 text-rose-500" />
              Select Clients
            </CardTitle>
            <Badge className="bg-rose-100 text-rose-700">
              {selectedClientIds.length} Selected
            </Badge>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input 
                placeholder="Search by phone or name..." 
                value={phoneSearch} 
                onChange={(e) => setPhoneSearch(e.target.value)} 
                className="pl-9 h-10"
              />
            </div>

            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
              <Checkbox 
                id="select-all" 
                onCheckedChange={(checked) => handleSelectAll(checked === true)}
                checked={filteredClients.length > 0 && selectedClientIds.length === filteredClients.length}
              />
              <Label htmlFor="select-all" className="font-bold cursor-pointer">
                Select All ({filteredClients.length})
              </Label>
            </div>

            <div ref={parentRef} className="max-h-[500px] overflow-y-auto border rounded-lg">
              {fetchingClients ? (
                <p className="text-center text-sm text-muted-foreground py-4">Loading clients...</p>
              ) : filteredClients.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4">No clients found</p>
              ) : (
                <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const client = filteredClients[virtualRow.index];
                    const clientId = client._id || client.id;
                    const isSelected = selectedClientIds.includes(clientId);
                    
                    return (
                      <div
                        key={clientId}
                        className={`flex items-center space-x-3 p-2.5 border-b transition-colors cursor-pointer ${isSelected ? 'bg-rose-50' : 'hover:bg-gray-50'}`}
                        onClick={() => handleSelectClient(clientId)}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                      >
                        <Checkbox
                          id={`client-${clientId}`}
                          checked={isSelected}
                          onCheckedChange={() => handleSelectClient(clientId)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{client.name}</p>
                          <p className="text-xs text-muted-foreground">{client.phone}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* RIGHT COLUMN: Message Editor & Submit */}
      <div className="lg:col-span-2">
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Compose Message</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            
            <div className="space-y-2">
              <Label htmlFor="title">Message Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. unikaa"
                className="h-11"
              />
            </div>

            {/* ✅ 5. Fixed ReactQuill */}
            <div className="space-y-2">
              <Label>Description *</Label>
              <div className="border rounded-md overflow-hidden">
                <ReactQuill
                  theme="snow"
                  value={description}
                  onChange={setDescription}
                  modules={quillModules}
                  placeholder="unikaaBeauty big offer"
                  className="h-[200px] mb-10" 
                />
              </div>
            </div>

            {/* ✅ 6. Fixed Image Input (Removed broken ReactQuill props) */}
            <div className="space-y-2">
              <Label htmlFor="message-image">Attach Image (Optional)</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="message-image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  className="max-w-xs"
                />
                {imageFile && (
                  <Badge variant="outline" className="px-3 py-1 text-green-700 bg-green-50">
                    {imageFile.name.substring(0, 20)}...
                  </Badge>
                )}
              </div>
            </div>

            <div className="pt-4 border-t flex justify-end">
              <Button
                onClick={handleSubmit}
                disabled={loading || selectedClientIds.length === 0}
                className="bg-rose-500 hover:bg-rose-600 text-white min-w-[200px]"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </div>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send to {selectedClientIds.length} Clients
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}



function BillModule() {
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [allServices, setAllServices] = useState<any[]>([]);
  const [allStaff, setAllStaff] = useState<any[]>([]);
  const [allServiceCombos, setAllServiceCombos] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  
  // Billing Form States
  const [billServices, setBillServices] = useState<any[]>([]);
  
  // ✅ Changed to Discount Percent (e.g. 3 means 3%)
  const [discountPercent, setDiscountPercent] = useState(0); 
  const [billTaxPercent] = useState(5); // Fixed 5% Tax
  
  const [billPayments, setBillPayments] = useState<any[]>([{ cash: "0" }]); 
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);

  // Manual Client Form State
  const [isManualClient, setIsManualClient] = useState(false);
  const [manualClient, setManualClient] = useState({
    name: '', phone: '', gender: 'male', membership_card: '', branchId: ''
  });

  // Branch Context
  let localBranchId = '';
  let localBranchName = '';
  try {
    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem("salon_user");
      if (userStr) {
        const user = JSON.parse(userStr);
        localBranchId = user?.branchId?.id || user?.branchId || '';
        localBranchName = user?.branchId?.name || '';
      }
      if (!localBranchId) localBranchId = localStorage.getItem('branchId') || '';
    }
  } catch (e) { /* silent */ }

  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const branchQ = localBranchId ? `?branchId=${localBranchId}` : '';
        const [svcData, staffData, comboData, clientsData, branchesData] = await Promise.all([
          apiCall('get', `/services${branchQ}`),
          apiCall('get', `/staff${branchQ}`),
          apiCall('get', `/service-combos${branchQ}`),
          apiCall('get', `/clients${branchQ}`),
          apiCall('get', '/branches') 
        ]);
        setAllServices(svcData.services || []);
        setAllStaff(staffData.staff || []);
        setAllServiceCombos(comboData.serviceCombos || comboData.combos || []);
        setClients(clientsData.clients || []);
        setBranches(branchesData?.branches || branchesData || []);
      } catch (e) {
        toast.error('Failed to load billing data');
      }
    };
    fetchDropdownData();
  }, []);

  const selectedClient = useMemo(() => clients.find(c => c._id === selectedClientId), [clients, selectedClientId]);

  // ✅ Helper function to get Branch Name from ID
  const getBranchName = (branchRef: any) => {
    if (!branchRef) return 'N/A';
    if (typeof branchRef === 'object' && branchRef?.name) return branchRef.name;
    const found = branches.find((b: any) => (b._id || b.id) === branchRef);
    return found?.name || 'N/A';
  };

  const filteredStaffForBilling = useMemo(() => {
    if (!localBranchId) return allStaff || [];
    return (allStaff || []).filter((s) => {
      if (!s) return false;
      const sBranchId = s.branch?._id || s.branchId?._id || s.branchId || '';
      return sBranchId === localBranchId;
    });
  }, [allStaff, localBranchId]);

  // Form Handlers
  const addServiceRow = (type: 'service' | 'combo' = 'service') => {
    setBillServices([...billServices, {
      type, serviceId: '', serviceComboId: '', serviceName: '',
      amount: 0, quantity: 1, serviceAmount: 0, staffId: '', staffName: ''
    }]);
  };

  const removeServiceRow = (index: number) => {
    setBillServices(billServices.filter((_, i) => i !== index));
  };

  const updateServiceRow = (index: number, field: string, value: any) => {
    const updated = [...billServices];
    updated[index] = { ...updated[index], [field]: value };
    
    if (field === 'serviceId') {
      const svc = allServices.find((s: any) => (s._id || s.id) === value);
      if (svc) {
        updated[index].serviceName = svc.name;
        updated[index].amount = svc.amount;
        const qty = parseInt(String(updated[index].quantity)) || 1;
        updated[index].serviceAmount = svc.amount * qty;
      }
    }
    if (field === 'serviceComboId') {
      const combo = allServiceCombos.find((c: any) => (c._id || c.id) === value);
      if (combo) {
        updated[index].serviceName = combo.name;
        updated[index].amount = combo.totalPrice || 0;
        const qty = parseInt(String(updated[index].quantity)) || 1;
        updated[index].serviceAmount = (combo.totalPrice || 0) * qty;
      }
    }
    if (field === 'quantity' || field === 'amount') {
      const amt = parseFloat(String(updated[index].amount)) || 0;
      const qty = parseInt(String(updated[index].quantity)) || 1;
      updated[index].serviceAmount = amt * qty;
    }
    if (field === 'staffId') {
      const stf = allStaff.find((s: any) => (s._id || s.id) === value);
      updated[index].staffName = stf ? stf.name : '';
    }
    setBillServices(updated);
  };

  const subtotal = parseFloat(billServices.reduce((sum, s) => sum + (parseFloat(String(s.serviceAmount)) || 0), 0).toFixed(2));
  
  const discountAmount = parseFloat(((subtotal * (discountPercent || 0)) / 100).toFixed(2));
  const clientAmount = parseFloat((subtotal - discountAmount).toFixed(2));
  const taxAmount = parseFloat(((clientAmount * billTaxPercent) / 100).toFixed(2));
  const totalAmount = parseFloat((clientAmount + taxAmount).toFixed(2));

  // ✅ PDF Generator - Aligned perfectly to match image
 const generateInvoiceDoc = async (bill: any, clientData: any) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const centerX = pageWidth / 2;
    const marginLeft = 14;
    const marginRight = 14;

    const safeBill = {
      subtotal: parseFloat(String(bill?.subtotal)) || 0,
      discount: parseFloat(String(bill?.discount)) || 0,
      discountAmount: parseFloat(String(bill?.discountAmount)) || 0,
      clientAmount: parseFloat(String(bill?.clientAmount)) || 0,
      taxPercent: parseFloat(String(bill?.taxPercent)) || 0,
      taxAmount: parseFloat(String(bill?.taxAmount)) || 0,
      totalAmount: parseFloat(String(bill?.totalAmount)) || 0,
      billId: bill?.billId || bill?._id || 'TMP-' + Date.now(),
      date: bill?.date || '',
      services: bill?.services || [],
      paymentMethod: bill?.paymentMethod || 'cash'
    };

    const staffNames =
      safeBill.services.map((s: any) => s.staffName).filter(Boolean).join(', ') || 'N/A';

    let y = 8;

    try {
      const logoBase64 = await loadImageAsBase64(
        "https://res.cloudinary.com/dspp2vqid/image/upload/w_200,h_64,c_limit,q_auto,f_auto/v1763190132/picknowcrm/ol37ycat5une3kzyttdo.png"
      );
      doc.addImage(logoBase64, "PNG", centerX - 15, y, 30, 15);
      y += 20;
    } catch {
      y += 5;
    }

    // Title
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(225, 29, 72);
    doc.text("UNIKAA", centerX, y, { align: "center" });
    y += 8; 

    // Bill details block — centered as a group, each line left-aligned within it
    const detailLines: [string, string][] = [
      ["Bill No: ", String(safeBill.billId)],
      ["Date: ", String(safeBill.date)],
      ["Client: ", String(clientData?.name || '')],
      ["Service by: ", staffNames],
    ];

    doc.setFontSize(10);
    let maxLineWidth = 0;
    const widths = detailLines.map(([label, value]) => {
      doc.setFont("helvetica", "normal");
      const labelWidth = doc.getTextWidth(label);
      doc.setFont("helvetica", "bold");
      const valueWidth = doc.getTextWidth(value);
      const total = labelWidth + valueWidth;
      if (total > maxLineWidth) maxLineWidth = total;
      return { labelWidth, valueWidth };
    });

    const blockLeftX = centerX - maxLineWidth / 2;

    detailLines.forEach(([label, value], i) => {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(120, 120, 120);
      doc.text(label, blockLeftX, y);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(60, 60, 60);
      doc.text(value, blockLeftX + widths[i].labelWidth, y);
      y += 6;
    });

    y += 4;

    const rows = safeBill.services.map((s: any) => [
      String(s.serviceName || ''),
      String(s.quantity || 1),
      `Rs. ${parseFloat(String(s.serviceAmount)).toFixed(2)}`
    ]);
    autoTable(doc, {
      startY: y,
      margin: { left: marginLeft, right: marginRight },
      head: [["Service", "Qty", "Amount"]],
      body: rows,
      theme: "plain",
      headStyles: { fontStyle: "bold", fontSize: 10, textColor: [0, 0, 0] },
      styles: { fontSize: 10, cellPadding: { top: 3, bottom: 3 } },
      columnStyles: { 0: { cellWidth: "auto" }, 1: { cellWidth: 25, halign: "center" }, 2: { cellWidth: 35, halign: "right" } }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 8;
    const summaryLabelX = marginLeft;
    const summaryValueX = pageWidth - marginRight;

    const summaryLines: [string, string][] = [
      ["Subtotal", `Rs. ${safeBill.subtotal.toFixed(2)}`],
      [`Discount (${safeBill.discount}%)`, `-Rs. ${safeBill.discountAmount.toFixed(2)}`],
      ["Client Amount", `Rs. ${safeBill.clientAmount.toFixed(2)}`],
      [`Tax (${safeBill.taxPercent}%)`, `Rs. ${safeBill.taxAmount.toFixed(2)}`]
    ];

    doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(0, 0, 0);
    let sy = finalY;
    summaryLines.forEach(([label, value]) => {
      doc.text(label, summaryLabelX, sy);
      doc.text(value, summaryValueX, sy, { align: "right" });
      sy += 6;
    });

    sy += 2; doc.setDrawColor(220, 220, 220); doc.line(summaryLabelX, sy, summaryValueX, sy); sy += 8;

    doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text("Total", summaryLabelX, sy);
    doc.setTextColor(225, 29, 72);
    doc.text(`Rs. ${safeBill.totalAmount.toFixed(2)}`, summaryValueX, sy, { align: "right" });
    doc.setTextColor(0, 0, 0);

    sy += 10; doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.text("Payment", summaryLabelX, sy);
    doc.setFont("helvetica", "bold");

    const payString = Array.isArray(safeBill.paymentMethod)
      ? safeBill.paymentMethod.map((p: any) => Object.keys(p)[0]).join(', ').toUpperCase()
      : String(safeBill.paymentMethod || 'cash').toUpperCase();

    doc.text(payString, summaryValueX, sy, { align: "right" });

    // Footer — each line gets its own incrementing y so nothing overlaps
    sy += 8;
    try {
      const footerImageBase64 = await loadImageAsBase64(
        "https://res.cloudinary.com/e3jbzpxf/image/upload/v1788950311/whatsapp_qr_code.png"
      );
      const imgWidth = 20;
      const imgHeight = 20;
      doc.addImage(footerImageBase64, "PNG", centerX - imgWidth / 2, sy, imgWidth, imgHeight);
      sy += imgHeight + 4;
    } catch {}

     sy += 5;
    doc.text("GSTIN : 33AAIFU3741Q1ZO", centerX, sy, { align: "center" });
    sy += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text("INDIA'S NO.1 HAIR AND BEAUTY SALON", centerX, sy, { align: "center" });

    const activeBranchId = isManualClient
  ? (manualClient.branchId || localBranchId)
  : localBranchId;

const activeBranchIdStr = String(activeBranchId?._id || activeBranchId?.id || activeBranchId || '');
const clientBranchIdStr = String(clientData?.branchId?._id || clientData?.branchId?.id || clientData?.branchId || '');

// Prefer the branch stored on the client record; fall back to local/manual branch
const resolvedBranchIdStr = clientBranchIdStr || activeBranchIdStr;

const matchedBranch = branches.find((b: any) => {
  const branchIdStr = String(b._id || b.id || '');
  return branchIdStr === resolvedBranchIdStr;
});

  const pdfBranchName =
    matchedBranch?.name ||
    matchedBranch?.branchName ||
    localBranchName ||
    '—';

  sy += 5;
  doc.text(`Branch: ${pdfBranchName}`, centerX, sy, { align: "center" });

    sy += 8;
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text("Thank You", centerX, sy, { align: "center" });

    return doc;
  };



  const handleBillSubmit = async () => {
    if (billServices.length === 0) { toast.error('Add at least one service'); return; }
    
    const hasEmpty = billServices.some(s => s.type === 'service' && !s.serviceId);
    const hasEmptyCombo = billServices.some(s => s.type === 'combo' && !s.serviceComboId);
    if (hasEmpty || hasEmptyCombo) { toast.error('Select a service/combo for each row'); return; }

    const cleanPayments = billPayments
      .map(p => {
        const key = Object.keys(p)[0];
        const num = parseFloat(String(p[key]));
        if (isNaN(num) || num <= 0) return null;
        return { [key]: num };
      })
      .filter(Boolean) as any[];

    if (cleanPayments.length === 0) {
      toast.error('At least one payment method with a valid amount is required');
      return;
    }

    let finalClientId = selectedClientId;
    let clientDataForPdf = selectedClient;

    if (isManualClient) {
      if (!manualClient.name || !manualClient.phone) {
        toast.error('Please enter at least Name and Phone for the new client');
        return;
      }
      try {
        toast.loading('Creating new client...');
        const newClientRes = await apiCall('post', '/clients', { 
          name: manualClient.name,
          phone: manualClient.phone,
          gender: manualClient.gender,
          membership_card: manualClient.membership_card,
          email: '', 
          dateOfBirth: '', 
          branchId: manualClient.branchId || localBranchId 
        });
        toast.dismiss();
        
        const newClient = newClientRes?.client || newClientRes?.data?.client || newClientRes?.data || newClientRes;
        finalClientId = newClient?._id || newClient?.id;
        
        if (!finalClientId) {
          throw new Error('Failed to retrieve client ID from server response.');
        }
        
        clientDataForPdf = newClient;
        setClients(prev => [...prev, newClient]); 
        toast.success('New client saved successfully');
      } catch (err: any) {
        toast.dismiss();
        const errMsg = err?.response?.data?.message || err?.message || 'Failed to save new client';
        toast.error(typeof errMsg === 'string' ? errMsg : 'Failed to save new client');
        return;
      }
    } else {
      if (!finalClientId) { 
        toast.error('Please select a client'); 
        return; 
      }
    }

    if (!finalClientId) {
      toast.error('Client ID is missing. Cannot create bill.');
      return;
    }

    const payload = {
      clientId: finalClientId,
      branchId: localBranchId || undefined,
      services: billServices.map(s => ({
        serviceName: s.serviceName,
        amount: parseFloat(String(s.amount)) || 0,
        quantity: parseInt(String(s.quantity)) || 1,
        serviceAmount: parseFloat(String(s.serviceAmount)) || 0,
        serviceId: s.type === 'combo' ? null : s.serviceId,
        serviceComboId: s.type === 'combo' ? s.serviceComboId : null,
        staffId: s.staffId && s.staffId !== 'none' ? s.staffId : null,
        staffName: s.staffName || ''
      })),
      subtotal: subtotal,
      discount: discountPercent,
      discountAmount: discountAmount,
      clientAmount: clientAmount,
      taxPercent: 5, 
      taxAmount: taxAmount,
      totalAmount: totalAmount,
      payments: cleanPayments, 
      paymentMethod: cleanPayments, 
      status: 'paid', 
      date: billDate
    };

    try {
      const res = await apiCall('post', '/client-bills', payload);
      toast.success('Bill created successfully');

      setSelectedClientId('');
      setManualClient({ name: '', phone: '', gender: 'male', membership_card: '', branchId: '' });
      setIsManualClient(false);
      setBillServices([]);
      setDiscountPercent(0);
      setBillPayments([{ cash: "0" }]);

      const apiBillData = res?.bill || res?.data?.bill || res?.data || {};
      const billData = {
        ...payload,
        ...apiBillData,
        billId: apiBillData.billId || apiBillData._id || 'TMP-' + Date.now()
      };

      const doc = await generateInvoiceDoc(billData, clientDataForPdf);
      doc.autoPrint();
      window.open(doc.output('bloburl'), '_blank');

    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'Failed to save bill';
      toast.error(typeof errMsg === 'string' ? errMsg : 'Failed to save bill');
    }
  };

  const paymentMethods = [
    { value: "cash", label: "Cash", icon: Banknote },
    { value: "debit_card", label: "Debit", icon: CreditCard },
    { value: "credit_card", label: "Credit", icon: CreditCard },
    { value: "paytm", label: "Paytm", icon: Smartphone },
    { value: "gpay", label: "GPay", icon: Wallet }
  ];

   const filteredClients = useMemo(() => {
    if (!localBranchId) return clients || [];
    return (clients || []).filter((c) => {
      const cBranchId = c.branch?._id || c.branchId?._id || c.branchId || '';
      return cBranchId === localBranchId;
    });
  }, [clients, localBranchId]);
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Billing</h1>
        <p className="text-muted-foreground">Create a new bill for your services</p>
      </div>

      {/* Client Selection / Manual Entry Form */}
      <Card className="shadow-sm">
  <CardContent className="p-4 space-y-4">
    {!isManualClient ? (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Search & Select Client</Label>
          <Button variant="link" size="sm" className="p-0 h-auto text-rose-600" onClick={() => setIsManualClient(true)}>
            <UserPlus className="w-3 h-3 mr-1" /> Add Manually
          </Button>
        </div>
        
        {/* ✅ Changed `clients` to `filteredClients` */}
        <ClientSearchSelect 
          clients={filteredClients} 
          selectedClientId={selectedClientId} 
          setSelectedClientId={setSelectedClientId} 
        />

      </div>
    ) : (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-lg font-semibold">Manual Client Entry</Label>
          <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => setIsManualClient(false)}>
            <ChevronLeft className="w-3 h-3 mr-1" /> Select from list
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Client Name *</Label>
            <Input type="text" value={manualClient.name} onChange={(e) => setManualClient({...manualClient, name: e.target.value})} placeholder="Enter client name" />
          </div>
          <div>
            <Label>Phone Number *</Label>
            <Input type="tel" value={manualClient.phone} onChange={(e) => setManualClient({...manualClient, phone: e.target.value})} placeholder="Enter phone number" />
          </div>
          <div>
            <Label>Gender</Label>
            <Select value={manualClient.gender} onValueChange={(v) => setManualClient({...manualClient, gender: v})}>
              <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>M_Card</Label>
            <Input type="text" value={manualClient.membership_card} onChange={(e) => setManualClient({...manualClient, membership_card: e.target.value})} placeholder="Enter membership card (optional)" />
          </div>
          
          {localBranchId ? (
            <div>
              <Label>Branch</Label>
              <div className="h-10 px-3 flex items-center rounded-md border border-input bg-muted/50 text-sm font-medium">
                {localBranchName || (branches.find((b: any) => (b._id || b.id) === localBranchId)?.name || localBranchId)}
              </div>
            </div>
          ) : (
            <div>
              <Label>Branch</Label>
              <Select 
                value={manualClient.branchId || ''} 
                onValueChange={(v) => setManualClient({...manualClient, branchId: v})}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b: any) => (
                    <SelectItem key={b._id || b.id} value={b._id || b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>
    )}
  </CardContent>
</Card>

      {(selectedClient || isManualClient) ? (
        <Card className="shadow-sm">
          <CardContent className="p-6 space-y-6">
            
            {!isManualClient && selectedClient && (
              <div className="bg-gray-50 p-4 rounded-lg grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><p className="text-muted-foreground">Name</p><p className="font-semibold">{selectedClient?.name}</p></div>
                <div><p className="text-muted-foreground">Phone</p><p className="font-semibold">{selectedClient?.phone}</p></div>
                <div><p className="text-muted-foreground">Gender</p><p className="font-semibold capitalize">{selectedClient?.gender}</p></div>
                <div><p className="text-muted-foreground">Membership Card</p><p className="font-semibold">{selectedClient?.membership_card || 'N/A'}</p></div>
                {/* ✅ FIX: Displays Branch Name instead of raw ID string */}
                <div><p className="text-muted-foreground">Branch</p><p className="font-semibold">{getBranchName(selectedClient?.branchId)}</p></div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <h3 className="font-semibold text-lg">Services</h3>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => addServiceRow('service')} className="bg-rose-500 hover:bg-rose-600 text-white"><Plus className="w-3 h-3 mr-1" />Add Service</Button>
                <Button size="sm" onClick={() => addServiceRow('combo')} className="bg-purple-500 hover:bg-purple-600 text-white"><Plus className="w-3 h-3 mr-1" />Add Combo</Button>
              </div>
            </div>
            
            {billServices.length === 0 ? <p className="text-center py-4 text-muted-foreground border rounded-md">No services added yet</p> : (
              <div className="space-y-2">
                {billServices.map((s, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-end p-2 bg-gray-50 rounded-lg">
                    <div className="col-span-12 md:col-span-4">
                      <Label className="text-xs">{s.type === 'combo' ? 'Service Combo' : 'Service'}</Label>
                      {s.type === 'combo' ? (
                        <Select value={s.serviceComboId} onValueChange={(v) => updateServiceRow(i, 'serviceComboId', v)}>
                          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select Combo" /></SelectTrigger>
                          <SelectContent>{allServiceCombos.map((c: any) => <SelectItem key={c._id || c.id} value={c._id || c.id}>{c.name} (₹{c.totalPrice})</SelectItem>)}</SelectContent>
                        </Select>
                      ) : (
                        <Select value={s.serviceId} onValueChange={(v) => updateServiceRow(i, 'serviceId', v)}>
                          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select Service" /></SelectTrigger>
                          <SelectContent>{allServices.map((svc: any) => <SelectItem key={svc._id || svc.id} value={svc._id || svc.id}>{svc.name}</SelectItem>)}</SelectContent>
                        </Select>
                      )}
                    </div>
                    <div className="col-span-3 md:col-span-2"><Label className="text-xs">Amount</Label><Input type="number" className="h-9 text-xs" value={s.amount} onChange={(e) => updateServiceRow(i, 'amount', e.target.value)} /></div>
                    <div className="col-span-3 md:col-span-1"><Label className="text-xs">Qty</Label><Input type="number" className="h-9 text-xs" min="1" value={s.quantity} onChange={(e) => updateServiceRow(i, 'quantity', e.target.value)} /></div>
                    <div className="col-span-3 md:col-span-2"><Label className="text-xs">Svc Amt</Label><Input type="number" className="h-9 text-xs bg-muted" value={s.serviceAmount} readOnly /></div>
                    <div className="col-span-9 md:col-span-2">
                      <Label className="text-xs">Staff</Label>
                      <Select value={s.staffId} onValueChange={(v) => updateServiceRow(i, 'staffId', v)}>
                        <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Staff" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {filteredStaffForBilling.map((st: any) => <SelectItem key={st._id || st.id} value={st._id || st.id}>{st.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3 md:col-span-1 flex justify-end">
                      <Button variant="ghost" size="icon" className="text-red-500 h-9 w-9" onClick={() => removeServiceRow(i)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Date</Label><Input type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} /></div>
            </div>

            <div className="space-y-2">
              <Label>Payment Method(s)</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                {paymentMethods.map((method) => {
                  const activePayment = billPayments.find(p => p[method.value] !== undefined);
                  return (
                    <div key={method.value} className="flex flex-col items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (activePayment) {
                            setBillPayments(billPayments.filter(p => p[method.value] === undefined));
                          } else {
                            setBillPayments([...billPayments, { [method.value]: "0" }]);
                          }
                        }}
                        className={cn(
                          "flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 p-3 transition-all duration-150 cursor-pointer w-full",
                          activePayment ? "border-rose-500 bg-rose-50 text-rose-600 shadow-sm" : "border-muted bg-white text-muted-foreground hover:border-rose-300"
                        )}
                      >
                        <method.icon className="w-5 h-5" />
                        <span className="text-[11px] font-medium leading-tight text-center">{method.label}</span>
                      </button>
                      {activePayment && (
                        <Input
                          type="number"
                          className="h-8 text-xs text-center"
                          placeholder="Amount"
                          value={activePayment[method.value]}
                          onChange={(e) => {
                            const val = e.target.value;
                            setBillPayments(billPayments.map(p => p[method.value] !== undefined ? { [method.value]: val } : p));
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>₹{subtotal.toLocaleString()}</span>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span>Discount (%)</span>
                <Input 
                  type="number" 
                  className="w-32 h-8 text-sm text-right" 
                  value={discountPercent} 
                  onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)} 
                />
              </div>
              
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Discount Amount</span>
                <span>-₹{discountAmount.toLocaleString()}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span>Client Amount</span>
                <span>₹{clientAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax (5%)</span>
                <span className="font-medium">₹{taxAmount.toLocaleString()}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-rose-600">₹{totalAmount.toLocaleString()}</span>
              </div>
            </div>

            <Button onClick={handleBillSubmit} className="w-full bg-rose-500 hover:bg-rose-600 text-white">
              Create Bill & Print
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
            Please select a client or add a new client manually to start billing.
        </div>
      )}
    </div>
  );
}

function AppointmentsModule() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [serviceCombos, setServiceCombos] = useState<any[]>([]);
  const [serviceFormat, setServiceFormat] = useState<'service' | 'combo'>('service');
  const [filters, setFilters] = useState({ search: '', status: '', dateFrom: '', dateTo: '', staffId: '', serviceId: '' });

  const [form, setForm] = useState({ clientId: '', staffId: '', serviceId: '', serviceComboId: '', date: '', startTime: '', endTime: '', notes: '', clientName: '', clientNumber: '', status: 'pending' });

  // ─── Combobox & Search States ───────────────────────────────
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [clientNameDropdownOpen, setClientNameDropdownOpen] = useState(false);

  // ✅ Safely get branchId from localStorage
  let localBranchId = '';
  if (typeof window !== "undefined") {
    const userStr = localStorage.getItem("salon_user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        localBranchId = user.branchId?.id || user.branchId || '';
      } catch (e) {}
    }
    if (!localBranchId) localBranchId = localStorage.getItem('branchId') || '';
  }

  // ─── Phone Format Helper ────────────────────────────────────
  const formatPhone = (phone: string | null | undefined): string => {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
    if (digits.length === 12 && digits.startsWith('91')) return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
    if (digits.length > 10 && digits.startsWith('0')) return `+91 ${digits.slice(1, 6)} ${digits.slice(6, 11)}`;
    return phone;
  };

  // ✅ Use filteredClients for Combobox
  const filteredClients = localBranchId 
    ? clients.filter((c) => {
        const cBranchId = c.branchId?._id || c.branchId;
        return !cBranchId || cBranchId === localBranchId;
      })
    : clients;

  const selectedClient = filteredClients.find((c) => (c._id || c.id) === form.clientId);

  const filteredClientsByName = form.clientName.trim()
    ? filteredClients.filter(
        (c) =>
          c.name?.toLowerCase().includes(form.clientName.toLowerCase()) ||
          c.phone?.includes(form.clientName)
      )
    : [];

  // ─── Data Fetching ──────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.status) params.set('status', filters.status);
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);
      if (filters.staffId) params.set('staffId', filters.staffId);
      if (filters.serviceId) params.set('serviceId', filters.serviceId);

      const [apptData, clientData, staffData, serviceData, comboData] = await Promise.all([
        apiCall('get', `/appointments?${params.toString()}`),
        apiCall('get', '/clients'),
        apiCall('get', '/staff'),
        apiCall('get', '/services'),
        apiCall('get', '/service-combos'),
      ]);
      setAppointments(apptData.appointments || []);
      setClients(clientData.clients || []);
      setStaffList(staffData.staff || []);
      setServices(serviceData.services || []);
      setServiceCombos(comboData.serviceCombos || comboData.combos || []);
    } catch { toast.error('Failed to fetch'); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ✅ Filter Staff List
  const filteredStaffList = localBranchId 
    ? staffList.filter((s) => {
        const sBranchId = s.branch?._id || s.branchId?._id || s.branchId;
        return sBranchId === localBranchId;
      })
    : staffList;

  // ✅ Filter Appointments Table Data
  const filteredAppointments = localBranchId 
    ? appointments.filter((a) => {
        const aBranchId = a.branchId?._id || a.branchId;
        if (aBranchId) return aBranchId === localBranchId;
        
        const aStaffId = a.staffId?._id || a.staffId;
        const allowedIds = new Set(filteredStaffList.map(s => s._id || s.id));
        return allowedIds.has(aStaffId);
      })
    : appointments;

  // ─── Dialog Helpers ─────────────────────────────────────────
  const openNew = () => {
    setEditItem(null);
    setForm({ clientId: '', staffId: '', serviceId: '', serviceComboId: '', date: '', startTime: '', endTime: '', notes: '', clientName: '', clientNumber: '', status: 'pending' });
    setComboboxOpen(false); setClientNameDropdownOpen(false); setDialogOpen(true);
  };

  const openEdit = (a: any) => {
    setEditItem(a);
    const isCombo = !!a.serviceComboId || !!a.serviceCombo;
    setServiceFormat(isCombo ? 'combo' : 'service');
    setForm({
      clientId: a.clientId?._id || a.clientId || '',
      staffId: a.staffId?._id || a.staffId || '',
      serviceId: a.serviceId?._id || a.serviceId || '',
      serviceComboId: isCombo ? (a.serviceComboId?._id || a.serviceComboId || '') : '',
      date: a.date || '', startTime: a.startTime || '', endTime: a.endTime || '',
      notes: a.notes || '', clientName: a.clientName || a.client?.name || '',
      clientNumber: a.clientNumber || '', status: a.status || 'pending',
    });
    setComboboxOpen(false); setClientNameDropdownOpen(false); setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      if (serviceFormat === 'service' && !form.serviceId) { toast.error('Please select a service'); return; }
      if (serviceFormat === 'combo' && !form.serviceComboId) { toast.error('Please select a service combo'); return; }
      const payload: Record<string, any> = {
        staffId: form.staffId, date: form.date, startTime: form.startTime, endTime: form.endTime,
        notes: form.notes, clientName: form.clientName, clientNumber: form.clientNumber, status: form.status,
        ...(serviceFormat === 'service' ? { serviceId: form.serviceId } : { serviceComboId: form.serviceComboId }),
      };
      if (form.clientId && form.clientId.trim() !== '') payload.clientId = form.clientId;

      if (editItem) { await apiCall('put', `/appointments/${editItem._id || editItem.id}`, payload); toast.success('Updated'); }
      else { await apiCall('post', '/appointments', payload); toast.success('Created'); }
      setDialogOpen(false); fetchAll();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Failed'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete?')) return;
    try { await apiCall('delete', `/appointments/${id}`); toast.success('Deleted'); fetchAll(); }
    catch { toast.error('Failed'); }
  };

  // ─── Pagination (10 per page) ───────────────────────────────
  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);
  // ✅ Use filteredAppointments for Pagination Math
  const totalPages = Math.ceil(filteredAppointments.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  // ✅ Use filteredAppointments for Paginated Data
  const paginatedData = filteredAppointments.slice(startIndex, endIndex);

  useEffect(() => { setCurrentPage(1); }, [filters]);

  // ─── Status Config ──────────────────────────────────────────
  const statusConfig: Record<string, { label: string; className: string }> = {
    pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-100' },
    confirmed: { label: 'Confirmed', className: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100' },
    completed: { label: 'Completed', className: 'bg-green-100 text-green-700 border-green-200 hover:bg-green-100' },
    cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-700 border-red-200 hover:bg-red-100' },
  };

  const selectClientFromCombobox = (client: any) => {
    const id = client._id || client.id;
    setForm((prev) => ({ ...prev, clientId: id || '', clientName: client.name || '' }));
    setComboboxOpen(false);
  };

  const selectClientFromNameSearch = (client: any) => {
    const id = client._id || client.id;
    setForm((prev) => ({ ...prev, clientId: id || '', clientName: client.name || '' }));
    setClientNameDropdownOpen(false);
  };

  const handleClientNameChange = (value: string) => {
    setForm((prev) => ({ ...prev, clientName: value, clientId: '' }));
    setClientNameDropdownOpen(value.trim().length > 0);
  };

  // ─── Render ─────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Appointments</h1>
          <p className="text-muted-foreground">Manage appointments</p>
        </div>
          <Button onClick={openNew} className="bg-rose-500 hover:bg-rose-600 text-white">
          <Plus className="w-4 h-4 mr-1" />Online Appointment
        </Button>

        <Button onClick={openNew} className="bg-rose-500 hover:bg-rose-600 text-white">
          <Plus className="w-4 h-4 mr-1" />New Appointment
        </Button>
    
      </div>

      <Card className="border-0 shadow-md">
        <CardContent className="pt-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Input placeholder="Search..." value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
            <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v === 'all' ? '' : v })}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="confirmed">Confirmed</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            {/* ✅ Use filteredStaffList in Filter Dropdown */}
            <Select value={filters.staffId} onValueChange={(v) => setFilters({ ...filters, staffId: v === 'all' ? '' : v })}>
              <SelectTrigger><SelectValue placeholder="Staff" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Staff</SelectItem>
                {filteredStaffList.map((s) => (
                  <SelectItem key={s._id || s.id} value={s._id || s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.serviceId} onValueChange={(v) => setFilters({ ...filters, serviceId: v === 'all' ? '' : v })}>
              <SelectTrigger><SelectValue placeholder="Service" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Services</SelectItem>
                {services.map((s) => (
                  <SelectItem key={s._id || s.id} value={s._id || s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} />
            <Input type="date" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 h-10">Client</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 h-10">Service</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 h-10">Staff</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 h-10"><div className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Date</div></TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 h-10"><div className="flex items-center gap-1"><Clock className="w-3 h-3" /> Time</div></TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 h-10">Status</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 h-10 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="h-48 text-center"><div className="flex flex-col items-center gap-2"><div className="w-6 h-6 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" /><p className="text-sm text-muted-foreground">Loading appointments...</p></div></TableCell></TableRow>
                ) : paginatedData.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="h-48 text-center"><div className="flex flex-col items-center gap-2"><Calendar className="w-10 h-10 text-gray-300" /><p className="text-sm text-muted-foreground">No appointments found</p></div></TableCell></TableRow>
                ) : (
                  paginatedData.map((a) => {
                    const status = statusConfig[a.status] || statusConfig.pending;
                    const clientName = a.client?.name || a.clientName || null;
                    const clientPhone = a.client?.phone || null;
                    const formattedPhone = formatPhone(clientPhone);
                    const hasClient = !!clientName;
                    const serviceObj = a.service || (typeof a.serviceId === 'object' ? a.serviceId : services.find(s => (s._id || s.id) === a.serviceId));
                    const comboObj = a.serviceCombo || (typeof a.serviceComboId === 'object' ? a.serviceComboId : serviceCombos.find(c => (c._id || c.id) === a.serviceComboId));

                    return (
                      <TableRow key={a._id || a.id} className="group hover:bg-gray-50/50 transition-colors">
                        <TableCell>
                          {hasClient ? (
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-xs font-bold shrink-0">{clientName.charAt(0).toUpperCase()}</div>
                              <span className="text-sm font-medium">{clientName}</span>
                              <Phone className="w-3 h-3 text-muted-foreground" />
                              <p className="text-sm font-mono text-muted-foreground">{formattedPhone} {a.clientNumber}</p>
                            </div>
                          ) : (<span className="text-sm text-muted-foreground italic">—</span>)}
                        </TableCell>
                        <TableCell>
                          {serviceObj?.name ? (
                            <div className="flex flex-col"><span className="text-sm font-medium">{serviceObj.name}</span>{serviceObj.amount != null && (<span className="text-[11px] text-muted-foreground">₹{serviceObj.amount}</span>)}</div>
                          ) : comboObj?.name ? (
                            <div className="flex flex-col"><span className="text-sm inline-flex items-center gap-1.5 font-medium"><span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 text-[9px] font-semibold uppercase tracking-wide">Combo</span>{comboObj.name}</span>{comboObj.totalPrice != null && (<span className="text-[11px] text-muted-foreground mt-0.5">₹{comboObj.totalPrice}</span>)}</div>
                          ) : (<span className="text-sm text-muted-foreground italic">—</span>)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5"><User className="w-3 h-3 text-muted-foreground" /><span className="text-sm">{a.staff?.name || <span className="text-muted-foreground italic">—</span>}</span></div>
                        </TableCell>
                        <TableCell>{a.date ? (<span className="text-sm">{a.date}</span>) : (<span className="text-sm text-muted-foreground italic">—</span>)}</TableCell>
                        <TableCell>{a.startTime && a.endTime ? (<span className="text-sm font-mono tabular-nums">{a.startTime} – {a.endTime}</span>) : (<span className="text-sm text-muted-foreground italic">—</span>)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('text-[11px] font-medium px-2 py-0.5', status.className)}><span className="inline-block w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70" />{status.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-blue-600 hover:bg-blue-50" onClick={() => openEdit(a)}><Edit className="w-3.5 h-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(a._id || a.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* ✅ Use filteredAppointments.length in Pagination Footer */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50/50">
              <p className="text-xs text-muted-foreground">
                Showing <span className="font-medium text-foreground">{startIndex + 1}</span> to{' '}
                <span className="font-medium text-foreground">{Math.min(endIndex, filteredAppointments.length)}</span> of{' '}
                <span className="font-medium text-foreground">{filteredAppointments.length}</span> appointments
              </p>
              <Pagination>
                <PaginationContent>
                  <PaginationItem><PaginationPrevious onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} className={cn('h-8 text-xs', currentPage === 1 && 'pointer-events-none opacity-40')} /></PaginationItem>
                  {generatePageNumbers(currentPage, totalPages).map((page, idx) =>
                    page === '...' ? (
                      <PaginationItem key={`ellipsis-${idx}`}><PaginationEllipsis className="h-8 w-8" /></PaginationItem>
                    ) : (
                      <PaginationItem key={page}><PaginationLink onClick={() => setCurrentPage(page as number)} isActive={currentPage === page} className={cn('h-8 w-8 text-xs', currentPage === page && 'bg-rose-500 text-white hover:bg-rose-600 hover:text-white')}>{page}</PaginationLink></PaginationItem>
                    )
                  )}
                  <PaginationItem><PaginationNext onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} className={cn('h-8 text-xs', currentPage === totalPages && 'pointer-events-none opacity-40')} /></PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Dialog ──────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) setClientNameDropdownOpen(false); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editItem ? 'Edit Appointment' : 'New Appointment'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            
            {/* ── Visited Client (Combobox) ───────────────────── */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Visited Client</Label>
              <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={comboboxOpen} className={cn('w-full justify-between h-10 font-normal', !selectedClient && 'text-muted-foreground')}>
                    {selectedClient ? (
                      <span className="flex items-center gap-2.5 truncate">
                        <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-[10px] font-bold shrink-0">{selectedClient.name?.charAt(0).toUpperCase()}</div>
                        <span className="truncate">{selectedClient.name}{selectedClient.phone && (<span className="text-muted-foreground ml-1">({formatPhone(selectedClient.phone)})</span>)}</span>
                      </span>
                    ) : (<span className="flex items-center gap-2"><User className="w-4 h-4 opacity-50" /><span>Select existing client…</span></span>)}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command shouldFilter={true}>
                    <div className="flex items-center border-b px-3"><Search className="mr-2 h-4 w-4 shrink-0 opacity-40" /><CommandInput placeholder="Search by name or phone…" /></div>
                    <CommandList className="max-h-56">
                      <CommandEmpty><div className="py-8 text-center"><div className="w-10 h-10 mx-auto mb-2 rounded-full bg-gray-100 flex items-center justify-center"><User className="w-5 h-5 text-gray-400" /></div><p className="text-sm text-muted-foreground font-medium">No client found</p></div></CommandEmpty>
                      <CommandGroup>
                        {/* ✅ Use filteredClients in Combobox Map */}
                        {filteredClients.map((c) => {
                          const id = c._id || c.id;
                          const isSelected = form.clientId === id;
                          return (
                            <CommandItem key={id} value={`${c.name} ${c.phone}`} onSelect={() => selectClientFromCombobox(c)} className={cn('flex items-center gap-3 py-2.5 cursor-pointer', isSelected && 'bg-rose-50')}>
                              <div className="w-7 h-7 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-[11px] font-bold shrink-0">{c.name?.charAt(0).toUpperCase()}</div>
                              <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{c.name}</p><p className="text-[11px] text-muted-foreground font-mono">{formatPhone(c.phone)}</p></div>
                              <Check className={cn('h-4 w-4 shrink-0 text-rose-500', isSelected ? 'opacity-100' : 'opacity-0')} />
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="relative"><div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div><div className="relative flex justify-center text-[11px] uppercase tracking-wider"><span className="bg-white px-2 text-muted-foreground">or enter manually</span></div></div>

            {/* ── Client Name (Searchable Input) ──────────────── */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Client Name <span className="text-muted-foreground font-normal ml-1">(search or type new)</span></Label>
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 pointer-events-none" />
                  <Input value={form.clientName} onChange={(e) => handleClientNameChange(e.target.value)} onFocus={() => { if (form.clientName.trim()) setClientNameDropdownOpen(true); }} placeholder="Type name or phone to search…" className="pl-9 pr-8 h-10" />
                  {form.clientName && (
                    <button type="button" onClick={() => { setForm((prev) => ({ ...prev, clientName: '', clientId: '' })); setClientNameDropdownOpen(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"><X className="w-3.5 h-3.5" /></button>
                  )}
                </div>
                {clientNameDropdownOpen && filteredClientsByName.length > 0 && (<><div className="fixed inset-0 z-40" onClick={() => setClientNameDropdownOpen(false)} /><div className="absolute z-50 top-full mt-1 w-full bg-white rounded-lg border shadow-lg max-h-52 overflow-y-auto"><div className="px-3 py-2 border-b bg-gray-50/80"><p className="text-[11px] text-muted-foreground font-medium">{filteredClientsByName.length} client{filteredClientsByName.length !== 1 ? 's' : ''} found</p></div>{filteredClientsByName.map((c) => { const id = c._id || c.id; const isLinked = form.clientId === id; return (<button key={id} type="button" onClick={() => selectClientFromNameSearch(c)} className={cn('w-full px-3 py-2.5 text-left flex items-center gap-2.5 transition-colors border-b border-gray-50 last:border-0', isLinked ? 'bg-rose-50' : 'hover:bg-gray-50')}><div className="w-7 h-7 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-[11px] font-bold shrink-0">{c.name?.charAt(0).toUpperCase()}</div><div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{c.name}</p><p className="text-[11px] text-muted-foreground font-mono">{formatPhone(c.phone)}</p></div>{isLinked && (<Check className="w-4 h-4 text-rose-500 shrink-0" />)}</button>); })}</div></>)}
                {clientNameDropdownOpen && form.clientName.trim() && filteredClientsByName.length === 0 && (<><div className="fixed inset-0 z-40" onClick={() => setClientNameDropdownOpen(false)} /><div className="absolute z-50 top-full mt-1 w-full bg-white rounded-lg border shadow-lg"><div className="py-6 text-center"><div className="w-10 h-10 mx-auto mb-2 rounded-full bg-gray-100 flex items-center justify-center"><User className="w-5 h-5 text-gray-400" /></div><p className="text-sm text-muted-foreground font-medium">No matching client</p><p className="text-xs text-muted-foreground/70 mt-0.5">&quot;{form.clientName}&quot; will be saved as a new client</p></div></div></>)}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Client Number</Label>
              <Input value={form.clientNumber} onChange={(e) => { const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 10); setForm({ ...form, clientNumber: digitsOnly }); }} placeholder="Optional Client Number.." className="h-10" />
            </div>

            {/* ── Service ─────────────────────────────────────── */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">{serviceFormat === 'service' ? 'Service *' : 'Service Combo *'}</Label>
                <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
                  <button type="button" onClick={() => { setServiceFormat('service'); setForm((prev) => ({ ...prev, serviceComboId: '', serviceId: '' })); }} className={cn('px-3 py-1 text-xs font-medium rounded-md transition-colors', serviceFormat === 'service' ? 'bg-white text-rose-600 shadow-sm' : 'text-muted-foreground hover:text-foreground')}>Single</button>
                  <button type="button" onClick={() => { setServiceFormat('combo'); setForm((prev) => ({ ...prev, serviceId: '', serviceComboId: '' })); }} className={cn('px-3 py-1 text-xs font-medium rounded-md transition-colors', serviceFormat === 'combo' ? 'bg-white text-rose-600 shadow-sm' : 'text-muted-foreground hover:text-foreground')}>Combo</button>
                </div>
              </div>
              {serviceFormat === 'service' ? (
                <Select value={form.serviceId} onValueChange={(v) => setForm({ ...form, serviceId: v, serviceComboId: '' })}><SelectTrigger className="h-10"><SelectValue placeholder="Select service" /></SelectTrigger><SelectContent>{services.map((s) => (<SelectItem key={s._id || s.id} value={s._id || s.id}>{s.name} (₹{s.amount})</SelectItem>))}</SelectContent></Select>
              ) : (
                <Select value={form.serviceComboId} onValueChange={(v) => setForm({ ...form, serviceComboId: v, serviceId: '' })}><SelectTrigger className="h-10"><SelectValue placeholder="Select service combo" /></SelectTrigger><SelectContent>{serviceCombos.length === 0 ? (<SelectItem value="_none" disabled>No combos available</SelectItem>) : (serviceCombos.map((c) => (<SelectItem key={c._id || c.id} value={c._id || c.id}>{c.name}{c.totalPrice != null && ` (₹${c.totalPrice})`}{c.services?.length ? ` · ${c.services.length} services` : ''}</SelectItem>)))}</SelectContent></Select>
              )}
            </div>

            {/* ── Staff ───────────────────────────────────────── */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Staff *</Label>
              {/* ✅ Use filteredStaffList in Form Dropdown */}
              <Select value={form.staffId} onValueChange={(v) => setForm({ ...form, staffId: v })}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Select staff" /></SelectTrigger>
                <SelectContent>
                  {filteredStaffList.map((s) => (
                    <SelectItem key={s._id || s.id} value={s._id || s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5"><Label className="text-sm font-medium">Date *</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="h-10" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-sm font-medium">Start *</Label><Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className="h-10" /></div>
              <div className="space-y-1.5"><Label className="text-sm font-medium">End *</Label><Input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} className="h-10" /></div>
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}><SelectTrigger className="h-10"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="confirmed">Confirmed</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent></Select>
            </div>

            <div className="space-y-1.5"><Label className="text-sm font-medium">Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes…" className="h-10" /></div>

            <Button onClick={handleSubmit} className="w-full bg-rose-500 hover:bg-rose-600 text-white h-10 mt-2">{editItem ? 'Update Appointment' : 'Create Appointment'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

 function StaffListModule() {
  const [staff, setStaff] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const setActivePage = useNavStore((s) => s.setActivePage);
  const setStaffViewId = useNavStore((s) => s.setStaffViewId);
  
  // ✅ Separate state for actual File objects
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [certFile, setCertFile] = useState<File | null>(null);

  let localRole = '';
  let localBranchId = '';

  if (typeof window !== "undefined") {
    const userStr = localStorage.getItem("salon_user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        localRole = user.role || '';
        localBranchId = user.branchId?.id || user.branchId || '';
      } catch (e) { /* ignore parse error */ }
    }
    if (!localBranchId) {
      localBranchId = localStorage.getItem('branchId') || '';
    }
  }

  const isAdmin = localRole === 'admin';

  // ✅ Removed photo & certificate from JSON state
  const [form, setForm] = useState({ 
    name: '', email: '', phone: '', joinDate: '', aadharNumber: '', emergencyContact: '', 
    gender: 'male', age: '', qualification: '', 
    role: 'stylist', specialization: '', salary: '', branchId: '', address: '' 
  });

  const fetchStaff = useCallback(async () => {
    try {
      const [staffData, branchData] = await Promise.all([
        apiCall('get', `/staff?search=${search}`), 
        apiCall('get', '/branches')
      ]);
      setStaff(staffData.staff || []); 
      setBranches(branchData.branches || []);
    } catch { toast.error('Failed to fetch staff'); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const filteredStaff = localBranchId 
    ? staff.filter((s) => {
        const sBranchId = s.branch?._id || s.branchId?._id || s.branchId;
        return sBranchId === localBranchId;
      })
    : staff;

  const openNew = () => {
    setEditItem(null);
    setPhotoFile(null);
    setCertFile(null);
    setForm({
      name: '', email: '', phone: '', joinDate: '', aadharNumber: '', emergencyContact: '', 
      gender: 'male', age: '', qualification: '', 
      role: 'stylist', specialization: '', salary: '', 
      branchId: localBranchId || '', 
      address: ''
    });
    setDialogOpen(true);
  };
  
  const openEdit = (s: any) => { 
    setEditItem(s); 
    setPhotoFile(null); 
    setCertFile(null);
    setForm({ 
      name: s.name, email: s.email || '', phone: s.phone, joinDate: s.joinDate, 
      aadharNumber: s.aadharNumber || '', emergencyContact: s.emergencyContact || '', 
      gender: s.gender, age: String(s.age || ''), qualification: s.qualification || '', 
      role: s.role, specialization: s.specialization || '', salary: String(s.salary || ''), 
      branchId: s.branchId?._id || s.branchId || s.branch?._id || s.branch || '', 
      address: s.address || '' 
    }); 
    setDialogOpen(true); 
  };

  const handleSubmit = async () => {
    try {
      // ✅ Create FormData object to handle text + files
      const formData = new FormData();
      
      // Append all text fields
      Object.keys(form).forEach(key => {
        if (form[key as keyof typeof form] !== null && form[key as keyof typeof form] !== '') {
          formData.append(key, form[key as keyof typeof form]);
        }
      });

      // Append files if they exist
      if (photoFile) formData.append('photo', photoFile);
      if (certFile) formData.append('certificate', certFile);

      if (editItem) { 
        await apiCall('put', `/staff/${editItem._id || editItem.id}`, formData); 
        toast.success('Staff updated'); 
      } else { 
        await apiCall('post', '/staff', formData); 
        toast.success('Staff added'); 
      }
      setDialogOpen(false); 
      fetchStaff();
    } catch (err: unknown) { 
      toast.error(err instanceof Error ? err.message : 'Failed'); 
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete?')) return;
    try { await apiCall('delete', `/staff/${id}`); toast.success('Deleted'); fetchStaff(); }
    catch { toast.error('Failed'); }
  };

  const openStaffView = (id: string) => {
    setStaffViewId(id);
    setActivePage('staff-view');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Staff</h1>
          <p className="text-muted-foreground">Manage your salon staff ({filteredStaff.length})</p>
        </div>
        <Button onClick={openNew} className="bg-rose-500 hover:bg-rose-600 text-white">
          <Plus className="w-4 h-4 mr-1" />Add Staff
        </Button>
      </div>
      
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search staff..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-10">Loading...</div>
        ) : filteredStaff.length === 0 ? (
          <div className="col-span-full text-center py-10 text-muted-foreground">No staff found</div>
        ) : (
          filteredStaff.map((s) => (
            <Card key={s._id || s.id} className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="pt-5">
                <div className="flex items-start gap-4">
                  <Avatar className="w-14 h-14">
                    {s.photo ? <AvatarImage src={s.photo} /> : null}
                    <AvatarFallback className="bg-rose-100 text-rose-600 text-lg">
                      {s.name?.[0] || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{s.name}</h3>
                      {s.staff_id && (
                        <Badge variant="outline" className="text-xs font-mono">{s.staff_id}</Badge>
                      )}
                    </div>
                    <Badge variant="outline" className="capitalize mt-1">{s.role}</Badge>
                    
                    <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />{s.phone}
                      </div>
                      {s.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />{s.email}
                        </div>
                      )}
                      <div>Salary: ₹{s.salary?.toLocaleString()}</div>
                      
                      {isAdmin && (
                        <div className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {s.branch?.name || s.branchId?.name || '-'}
                        </div>
                      )}

                      <div>Joined: {s.joinDate}</div>
                    </div>
                    
                    <div className="mt-3 flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openStaffView(s._id || s.id)}>
                        <Eye className="w-3 h-3 mr-1" />View
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openEdit(s)}>
                        <Edit className="w-3 h-3 mr-1" />Edit
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-500" onClick={() => handleDelete(s._id || s.id)}>
                        <Trash2 className="w-3 h-3 mr-1" />Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? 'Edit Staff' : 'Add Staff'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Phone *</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Join Date *</Label><Input type="date" value={form.joinDate} onChange={(e) => setForm({ ...form, joinDate: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Gender</Label>
                <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Age</Label><Input type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Role</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stylist">Stylist</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="receptionist">Receptionist</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Salary</Label><Input type="number" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} /></div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {localBranchId ? (
                <div>
                  <Label>Branch</Label>
                  <div className="h-10 px-3 flex items-center rounded-md border border-input bg-muted/50 text-sm">
                    {branches.find((b) => (b._id || b.id) === localBranchId)?.name || 'Unassigned'}
                  </div>
                </div>
              ) : (
                isAdmin && (
                  <div>
                    <Label>Branch</Label>
                    <Select value={form.branchId || 'none'} onValueChange={(v) => setForm({ ...form, branchId: v === 'none' ? '' : v })}>
                      <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {branches.map((b) => (
                          <SelectItem key={b._id || b.id} value={b._id || b.id}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )
              )}

              <div className={!localBranchId && !isAdmin ? 'col-span-2' : ''}>
                <Label>Specialization</Label>
                <Input value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} />
              </div>
            </div>

            <div><Label>Qualification</Label><Input value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} /></div>
            <div><Label>Aadhar Number</Label><Input value={form.aadharNumber} onChange={(e) => setForm({ ...form, aadharNumber: e.target.value })} /></div>
            <div><Label>Emergency Contact</Label><Input value={form.emergencyContact} onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })} /></div>
            
            <div>
              <Label>Photo</Label>
              <Input 
                type="file" 
                accept="image/*" 
                onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} 
              />
              {editItem?.photo && !photoFile && (
                <p className="text-xs text-muted-foreground mt-1">
                  Current photo will be kept if no new file is selected.
                </p>
              )}
            </div>
            
            <div>
              <Label>Certificate</Label>
              <Input 
                type="file" 
                accept="image/*,.pdf" 
                onChange={(e) => setCertFile(e.target.files?.[0] || null)} 
              />
              {editItem?.certificate && !certFile && (
                <p className="text-xs text-muted-foreground mt-1">
                  Current certificate will be kept if no new file is selected.
                </p>
              )}
            </div>

            <div><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            
            <Button onClick={handleSubmit} className="w-full bg-rose-500 hover:bg-rose-600 text-white">
              {editItem ? 'Update' : 'Add'} Staff
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}



// function StaffFingerprint() {
//   const [name, setName] = useState('');
//   const [email, setEmail] = useState('');
//   const [fingerprintId, setFingerprintId] = useState('');
//   const [loading, setLoading] = useState(false);
//   const [success, setSuccess] = useState(false);

//   const { getData } = useVisitorData({ immediate: false });

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
    
//     if (!name || !email || !fingerprintId) {
//       toast.error('Please enter name, email, and fingerprint ID');
//       return;
//     }

//     setLoading(true);
//     setSuccess(false);

//     try {
//         const { visitor_id } = await getData();

//       // ✅ Sends exactly the format you requested: { name, email, fingerprintId }
//       await apiCall('post', '/attendance/fingerprint', { 
//         name, 
//         email, 
//         fingerprintId ,
//          deviceVisitorId: visitor_id
//       });
       
//       // Show success state
//       setSuccess(true);
//       toast.success('Attendance marked successfully!');
      
//       // Clear inputs
//       setName('');
//       setEmail('');
//       setFingerprintId('');
//       setTimeout(() => setSuccess(false), 3000);
      
//     } catch (error: any) {
//       toast.error(error?.response?.data?.message || 'Failed to mark attendance');
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="flex items-center justify-center min-h-[80vh] p-4 bg-gray-50">
//       <Card className="w-full max-w-md border-0 shadow-2xl rounded-3xl overflow-hidden bg-white">
//         {/* Header Gradient */}
//         <div className="bg-gradient-to-r from-rose-500 to-purple-600 p-6 text-center">
//           <h2 className="text-2xl font-bold text-white">Biometric Attendance</h2>
//           <p className="text-rose-100 text-sm mt-1">Enter details and scan fingerprint</p>
//         </div>
        
//         <CardContent className="p-8">
//           <form onSubmit={handleSubmit} className="space-y-5">
//             {/* Name Input */}
//             <div>
//               <Label htmlFor="name" className="text-sm font-medium text-gray-700">Staff Name</Label>
//               <div className="relative mt-1.5">
//                 <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
//                 <Input 
//                   id="name"
//                   value={name}
//                   onChange={(e) => setName(e.target.value)}
//                   placeholder="e.g. Rajesh"
//                   className="pl-10 py-5 rounded-xl border-gray-200 focus:border-rose-500 focus:ring-rose-500"
//                   disabled={loading}
//                 />
//               </div>
//             </div>

//             {/* Email Input */}
//             <div>
//               <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email Address</Label>
//               <div className="relative mt-1.5">
//                 <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
//                 <Input 
//                   id="email"
//                   type="email"
//                   value={email}
//                   onChange={(e) => setEmail(e.target.value)}
//                   placeholder="e.g. rajesh@gmail.com"
//                   className="pl-10 py-5 rounded-xl border-gray-200 focus:border-rose-500 focus:ring-rose-500"
//                   disabled={loading}
//                 />
//               </div>
//             </div>
          
//             <div>
//               <Label htmlFor="fingerprintId" className="text-sm font-medium text-gray-700">Fingerprint ID</Label>
//               <div className="relative mt-1.5">
//                 <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
//                 <Input 
//                   id="fingerprintId"
//                   value={fingerprintId}
//                   onChange={(e) => setFingerprintId(e.target.value)}
//                   placeholder="e.g. FP0001"
//                   className="pl-10 py-5 rounded-xl border-gray-200 focus:border-rose-500 focus:ring-rose-500"
//                   disabled={loading}
//                 />
//               </div>
//             </div>
          
          
//             {/* Fingerprint Submit Button Area */}
//             <div className="pt-4 flex flex-col items-center">
//               <button 
//                 type="submit"
//                 disabled={loading}
//                 className={`relative w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300 outline-none
//                   ${success ? 'bg-green-50' : 'bg-rose-50 hover:bg-rose-100'} 
//                   ${loading ? 'cursor-wait' : 'cursor-pointer hover:scale-105 active:scale-95'}
//                   focus:ring-4 focus:ring-rose-200`}
//               >
//                 {/* Scanning Animation Line */}
//                 {loading && (
//                   <div className="absolute inset-4 rounded-full border-2 border-rose-200 overflow-hidden">
//                     <div className="absolute left-0 right-0 h-1 bg-rose-500 animate-[scan_1.5s_ease-in-out_infinite]"></div>
//                   </div>
//                 )}

//                 {/* Icon Logic */}
//                 {loading ? (
//                   <Loader2 className="w-14 h-14 text-rose-500 animate-spin" />
//                 ) : success ? (
//                   <CheckCircle2 className="w-16 h-16 text-green-600" />
//                 ) : (
//                   <Fingerprint className={`w-16 h-16 transition-colors ${loading ? 'text-rose-300' : 'text-rose-500'}`} />
//                 )}
//               </button>
              
//               <p className={`mt-4 text-sm font-medium ${success ? 'text-green-600' : 'text-gray-600'}`}>
//                 {loading ? 'Scanning Fingerprint...' : success ? 'Attendance Recorded!' : 'Tap icon to scan & submit'}
//               </p>
//             </div>
//           </form>
//         </CardContent>
//       </Card>
//     </div>
//   );
// }


function AttendanceModule() {
  const [attendance, setAttendance] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ staffId: '', dateFrom: '', dateTo: '', month: '', year: '' });
  const [form, setForm] = useState({
    staffId: '', date: new Date().toISOString().split('T')[0],
    status: 'present', checkIn: '', checkOut: '',
    absentType: 'lop', halfDayType: 'first_half', notes: '',
  });

  // ✅ 1. Safely get branchId from localStorage
  let localBranchId = '';
  try {
    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem("salon_user");
      if (userStr) {
        const user = JSON.parse(userStr);
        localBranchId = user?.branchId?.id || user?.branchId || '';
      }
      if (!localBranchId) {
        localBranchId = localStorage.getItem('branchId') || '';
      }
    }
  } catch (error) {
    // Silently fail if localStorage is restricted
  }

  // ✅ 2. Fetch Data
  const fetchAll = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filters.staffId) params.set('staffId', filters.staffId);
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);
      
      const [attData, staffData] = await Promise.all([
        apiCall('get', `/attendance?${params.toString()}`), 
        apiCall('get', '/staff'),
      ]);
      setAttendance(attData.attendance || []); 
      setStaffList(staffData.staff || []);
    } catch { 
      toast.error('Failed to fetch'); 
    }
    finally { 
      setLoading(false); 
    }
  }, [filters]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ✅ 3. Filter Staff List (for Dropdowns)
  const filteredStaffList = localBranchId 
    ? (staffList || []).filter((s) => {
        if (!s) return false;
        const sBranchId = s.branch?._id || s.branchId?._id || s.branchId || '';
        return sBranchId === localBranchId;
      })
    : (staffList || []);

  // ✅ 4. Filter Attendance Table (Strictly restricts data if branchId exists)
  const filteredAttendance = localBranchId 
    ? (attendance || []).filter((a) => {
        if (!a) return false;
        const aBranchId = a.branchId?._id || a.branchId || '';
        if (aBranchId) return aBranchId === localBranchId;
        
        // Fallback check via staff ID if attendance record doesn't have direct branchId
        const aStaffId = a.staffId?._id || a.staffId;
        const allowedIds = new Set(filteredStaffList.map(s => s._id || s.id));
        return allowedIds.has(aStaffId);
      })
    : (attendance || []);

  const handleSubmit = async () => {
    try {
      const payload: any = {
        staffId: form.staffId, date: form.date, status: form.status, notes: form.notes,
      };
      if (form.status === 'present') { payload.checkIn = form.checkIn; payload.checkOut = form.checkOut || undefined; }
      if (form.status === 'absent') { payload.absentType = form.absentType; }
      if (form.status === 'half-day') {
        payload.halfDayType = form.halfDayType;
        if (form.halfDayType === 'first_half') { payload.checkIn = form.checkIn || undefined; }
        else { payload.checkOut = form.checkOut || undefined; }
      }
      await apiCall('post', '/attendance', payload);
      toast.success('Attendance recorded');
      setDialogOpen(false);
      setForm({ staffId: '', date: new Date().toISOString().split('T')[0], status: 'present', checkIn: '', checkOut: '', absentType: 'lop', halfDayType: 'first_half', notes: '' });
      fetchAll();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Failed to record attendance'); }
  };

  const handleEditSubmit = async () => {
    try {
      const payload: any = {
        staffId: editItem.staffId?._id || editItem.staffId,
        date: editItem.date, status: editItem.status, notes: editItem.notes,
      };
      if (editItem.status === 'present') { payload.checkIn = editItem.checkIn; payload.checkOut = editItem.checkOut || undefined; }
      if (editItem.status === 'absent') { payload.absentType = editItem.absentType; }
      if (editItem.status === 'half-day') { payload.halfDayType = editItem.halfDayType; payload.checkIn = editItem.checkIn || undefined; payload.checkOut = editItem.checkOut || undefined; }
      await apiCall('put', `/attendance/${editItem._id || editItem.id}`, payload);
      toast.success('Attendance updated'); setEditDialogOpen(false); fetchAll();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Failed to update'); }
  };

  const handleCheckOut = async (id: string) => {
    const now = new Date(); const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    try { await apiCall('put', `/attendance/${id}/checkout`, { checkOut: time }); toast.success('Checked out'); fetchAll(); }
    catch { toast.error('Failed to check out'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete?')) return;
    try { await apiCall('delete', `/attendance/${id}`); toast.success('Deleted'); fetchAll(); }
    catch { toast.error('Failed'); }
  };

  const getStatusBadge = (a: any) => {
    if (a.status === 'present') return <Badge className="bg-green-100 text-green-700 hover:bg-green-100"><CheckCircle2 className="w-3 h-3 mr-1" />Present</Badge>;
    if (a.status === 'absent') {
      if (a.absentType === 'casual_leave') return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100"><AlertCircle className="w-3 h-3 mr-1" />Casual Leave</Badge>;
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100"><UserX className="w-3 h-3 mr-1" />LOP</Badge>;
    }
    if (a.status === 'half-day') {
      if (a.halfDayType === 'first_half') return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100"><Moon className="w-3 h-3 mr-1" />1st Half</Badge>;
      return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100"><Sun className="w-3 h-3 mr-1" />2nd Half</Badge>;
    }
    return <Badge>{a.status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h1 className="text-3xl font-bold">Attendance</h1><p className="text-muted-foreground">Track staff attendance</p></div>
        <Button onClick={() => setDialogOpen(true)} className="bg-rose-500 hover:bg-rose-600 text-white"><Plus className="w-4 h-4 mr-1" />New Record</Button>
      </div>

      <Card className="border-0 shadow-md"><CardContent className="pt-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* ✅ Uses filteredStaffList */}
          <Select value={filters.staffId} onValueChange={(v) => setFilters({ ...filters, staffId: v === 'all' ? '' : v })}>
            <SelectTrigger><SelectValue placeholder="All Staff" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Staff</SelectItem>
              {filteredStaffList.map((s) => (
                <SelectItem key={s._id || s.id} value={s._id || s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="date" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} placeholder="From date" />
          <Input type="date" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} placeholder="To date" />
        </div>
      </CardContent></Card>

      <Card className="border-0 shadow-md"><CardContent className="p-0"><div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Staff</TableHead><TableHead>Staff ID</TableHead><TableHead>Date</TableHead>
              <TableHead>Status</TableHead><TableHead>Login</TableHead><TableHead>Logout</TableHead>
              <TableHead>Notes</TableHead><TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-10">Loading...</TableCell></TableRow>
            ) : filteredAttendance.length === 0 ? ( /* ✅ Uses filteredAttendance */
              <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">No records found</TableCell></TableRow>
            ) : (
              filteredAttendance.map((a) => ( /* ✅ Uses filteredAttendance */
                <TableRow key={a._id || a.id}>
                  <TableCell className="font-medium">{a.staff?.name}</TableCell>
                  <TableCell><span className="font-mono text-xs text-muted-foreground">{a.staff?.staff_id || '-'}</span></TableCell>
                  <TableCell>{a.date}</TableCell>
                  <TableCell>{getStatusBadge(a)}</TableCell>
                  <TableCell>{a.checkIn || '-'}</TableCell>
                  <TableCell>
                    {a.checkOut || (a.status === 'present' ? (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleCheckOut(a._id || a.id)}>Check Out</Button>
                    ) : '-')}
                  </TableCell>
                  <TableCell>{a.notes || '-'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => { setEditItem({ ...a }); setEditDialogOpen(true); }}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(a._id || a.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div></CardContent></Card>

      {/* New Attendance Record Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>New Attendance Record</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* ✅ Uses filteredStaffList */}
            <div>
              <Label>Staff *</Label>
              <Select value={form.staffId} onValueChange={(v) => setForm({ ...form, staffId: v })}>
                <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                <SelectContent>
                  {filteredStaffList.map((s) => (
                    <SelectItem key={s._id || s.id} value={s._id || s.id}>{s.name} ({s.staffId || s._id?.slice(-6)})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Date *</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
            
            <div>
              <Label>Attendance Status *</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="present"><div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-600" />Present</div></SelectItem>
                  <SelectItem value="absent"><div className="flex items-center gap-2"><UserX className="w-4 h-4 text-red-600" />Absent</div></SelectItem>
                  <SelectItem value="half-day"><div className="flex items-center gap-2"><Moon className="w-4 h-4 text-blue-600" />Half Day</div></SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.status === 'present' && (
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Login Time *</Label><Input type="time" value={form.checkIn} onChange={(e) => setForm({ ...form, checkIn: e.target.value })} /></div>
                <div><Label>Logout Time</Label><Input type="time" value={form.checkOut} onChange={(e) => setForm({ ...form, checkOut: e.target.value })} /></div>
              </div>
            )}

            {form.status === 'absent' && (
              <div>
                <Label>Absent Type *</Label>
                <Select value={form.absentType} onValueChange={(v) => setForm({ ...form, absentType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="casual_leave"><div className="flex items-center gap-2"><AlertCircle className="w-4 h-4 text-amber-600" />Casual Leave</div></SelectItem>
                    <SelectItem value="lop"><div className="flex items-center gap-2"><UserX className="w-4 h-4 text-red-600" />LOP (Loss of Pay)</div></SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {form.status === 'half-day' && (
              <>
                <div>
                  <Label>Half Day Type *</Label>
                  <Select value={form.halfDayType} onValueChange={(v) => setForm({ ...form, halfDayType: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="first_half"><div className="flex items-center gap-2"><Moon className="w-4 h-4 text-blue-600" />First Half (Morning)</div></SelectItem>
                      <SelectItem value="second_half"><div className="flex items-center gap-2"><Sun className="w-4 h-4 text-purple-600" />Second Half (Afternoon)</div></SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {(form.halfDayType === 'first_half' || form.halfDayType === 'second_half') && (
                    <div><Label>Login Time</Label><Input type="time" value={form.checkIn} onChange={(e) => setForm({ ...form, checkIn: e.target.value })} /></div>
                  )}
                  <div><Label>Logout Time</Label><Input type="time" value={form.checkOut} onChange={(e) => setForm({ ...form, checkOut: e.target.value })} /></div>
                </div>
              </>
            )}

            <div><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <Button onClick={handleSubmit} className="w-full bg-rose-500 hover:bg-rose-600 text-white">Save Record</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Attendance Record Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Edit Attendance Record</DialogTitle></DialogHeader>
          {editItem && (
            <div className="space-y-4">
              <div><Label>Staff</Label><Input value={editItem.staff?.name || ''} disabled /></div>
              <div><Label>Date</Label><Input value={editItem.date} disabled /></div>
              <div>
                <Label>Status</Label>
                <Select value={editItem.status} onValueChange={(v) => setEditItem({ ...editItem, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="half-day">Half Day</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editItem.status === 'present' && (
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Login Time</Label><Input type="time" value={editItem.checkIn || ''} onChange={(e) => setEditItem({ ...editItem, checkIn: e.target.value })} /></div>
                  <div><Label>Logout Time</Label><Input type="time" value={editItem.checkOut || ''} onChange={(e) => setEditItem({ ...editItem, checkOut: e.target.value })} /></div>
                </div>
              )}
              {editItem.status === 'absent' && (
                <div>
                  <Label>Absent Type</Label>
                  <Select value={editItem.absentType || 'lop'} onValueChange={(v) => setEditItem({ ...editItem, absentType: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="casual_leave">Casual Leave</SelectItem><SelectItem value="lop">LOP</SelectItem></SelectContent>
                  </Select>
                </div>
              )}
              {editItem.status === 'half-day' && (
                <>
                  <div>
                    <Label>Half Day Type</Label>
                    <Select value={editItem.halfDayType || 'first_half'} onValueChange={(v) => setEditItem({ ...editItem, halfDayType: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="first_half">First Half</SelectItem><SelectItem value="second_half">Second Half</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Login Time</Label><Input type="time" value={editItem.checkIn || ''} onChange={(e) => setEditItem({ ...editItem, checkIn: e.target.value })} /></div>
                    <div><Label>Logout Time</Label><Input type="time" value={editItem.checkOut || ''} onChange={(e) => setEditItem({ ...editItem, checkOut: e.target.value })} /></div>
                  </div>
                </>
              )}
              <div><Label>Notes</Label><Input value={editItem.notes || ''} onChange={(e) => setEditItem({ ...editItem, notes: e.target.value })} /></div>
              <Button onClick={handleEditSubmit} className="w-full bg-rose-500 hover:bg-rose-600 text-white">Update Record</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


function PayrollModule() {
  const [payroll, setPayroll] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));

  const fetchPayroll = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiCall('get', `/attendance/payroll?month=${month}&year=${year}`);
      setPayroll(data.payroll || []);
    } catch { 
      toast.error('Failed to fetch payroll'); 
    } finally { 
      setLoading(false); 
    }
  }, [month, year]);

  useEffect(() => { fetchPayroll(); }, [fetchPayroll]);

  // Calculations for Summary Cards
  const totalBase = payroll.reduce((sum, p) => sum + (p.baseSalary || 0), 0);
  const totalDeduction = payroll.reduce((sum, p) => sum + (p.totalDeduction || 0), 0);
  const totalNet = payroll.reduce((sum, p) => sum + (p.netSalary || 0), 0);

  const monthName = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][parseInt(month) - 1];

  // ✅ EXCEL EXPORT FUNCTION
  const handleExportExcel = () => {
    if (payroll.length === 0) {
      toast.error('No payroll data to export for this month');
      return;
    }

    // 1. Map data for Excel rows
    const excelData = payroll.map((p) => ({
      "Staff Name": p.name || 'Unknown',
      "Base Salary": p.baseSalary || 0,
      "Present Days": p.presentDays || 0,
      "Absent Days": p.absentDays || 0,
      "Half Days": p.halfDays || 0,
      "LOP Days": p.lopDays || 0,
      "Total Deductions": p.totalDeduction || 0,
      "Net Salary": p.netSalary || 0
    }));

    // 2. Add a TOTAL summary row at the bottom
    excelData.push({
      "Staff Name": "TOTAL",
      "Base Salary": totalBase,
      "Present Days": "",
      "Absent Days": "",
      "Half Days": "",
      "LOP Days": "",
      "Total Deductions": totalDeduction,
      "Net Salary": totalNet
    });

    // 3. Create a worksheet
    const ws = XLSX.utils.json_to_sheet(excelData);

    // 4. Set column widths for better readability
    ws['!cols'] = [
      { wch: 20 }, // Staff Name
      { wch: 15 }, // Base Salary
      { wch: 12 }, // Present
      { wch: 12 }, // Absent
      { wch: 12 }, // Half
      { wch: 12 }, // LOP
      { wch: 18 }, // Deductions
      { wch: 15 }  // Net Salary
    ];

    // 5. Create a workbook and append the worksheet
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Payroll");

    // 6. Generate and download the .xlsx file
    XLSX.writeFile(wb, `Payroll_Report_${monthName}_${year}.xlsx`);
    toast.success('Excel exported successfully');
  };

  // ✅ PDF Export Function (Your existing function)
  const handleExportPDF = () => {
    if (payroll.length === 0) {
      toast.error('No payroll data to export for this month');
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const centerX = pageWidth / 2;

    // Header
    doc.setFontSize(22); doc.setFont("helvetica", "bold"); doc.setTextColor(225, 29, 72);
    doc.text("UNIKAA", centerX, 20, { align: "center" });
    doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(120, 120, 120);
    doc.text("INDIA'S NO.1 HAIR AND BEAUTY SALON", centerX, 26, { align: "center" });
    doc.text(`Monthly Payroll Report - ${monthName} ${year}`, centerX, 32, { align: "center" });
    
    doc.setDrawColor(220, 220, 220); doc.line(14, 36, pageWidth - 14, 36);
    doc.setTextColor(0, 0, 0);

    // Table Data Mapping
    const tableRows = payroll.map((p) => [
      p.name || 'Unknown',
      `Rs. ${Number(p.baseSalary || 0).toLocaleString()}`,
      String(p.presentDays || 0),
      String(p.absentDays || 0),
      String(p.halfDays || 0),
      String(p.lopDays || 0),
      `-Rs. ${Number(p.totalDeduction || 0).toLocaleString()}`,
      `Rs. ${Number(p.netSalary || 0).toLocaleString()}`
    ]);

    // Generate Table
    autoTable(doc, {
      startY: 42,
      head: [["Staff Name", "Base Salary", "P", "A", "H", "LOP", "Deductions", "Net Salary"]],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [244, 63, 94], textColor: 255, fontSize: 10, halign: 'center' },
      bodyStyles: { fontSize: 9, halign: 'center' },
      columnStyles: { 0: { halign: 'left', cellWidth: 40 } }
    });

    // Summary Footer
    // @ts-ignore
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12); doc.setFont("helvetica", "bold");
    
    doc.text("Total Base Salary:", 14, finalY);
    doc.text(`Rs. ${totalBase.toLocaleString()}`, pageWidth - 14, finalY, { align: "right" });

    doc.text("Total Deductions:", 14, finalY + 7);
    doc.setTextColor(220, 38, 38); 
    doc.text(`-Rs. ${totalDeduction.toLocaleString()}`, pageWidth - 14, finalY + 7, { align: "right" });

    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(220, 220, 220); doc.line(14, finalY + 10, pageWidth - 14, finalY + 10);

    doc.setFontSize(14); doc.setTextColor(225, 29, 72);
    doc.text("Total Net Salary:", 14, finalY + 17);
    doc.text(`Rs. ${totalNet.toLocaleString()}`, pageWidth - 14, finalY + 17, { align: "right" });

    doc.save(`Payroll_Report_${monthName}_${year}.pdf`);
    toast.success('Payroll exported successfully');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Payroll</h1>
          <p className="text-muted-foreground">Staff salary overview & deductions</p>
        </div>
        
        {/* ✅ Export Buttons Group */}
        <div className="flex gap-2">
          <Button 
            onClick={handleExportExcel} 
            variant="outline" 
            className="border-green-500 text-green-600 hover:bg-green-50" 
            disabled={loading || payroll.length === 0}
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel
          </Button>
          <Button 
            onClick={handleExportPDF} 
            className="bg-rose-500 hover:bg-rose-600 text-white" 
            disabled={loading || payroll.length === 0}
          >
            <Download className="w-4 h-4 mr-2" /> PDF
          </Button>
        </div>
      </div>

      <Card className="border-0 shadow-md">
        <CardContent className="pt-5">
          <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger><SelectValue placeholder="Month" /></SelectTrigger>
              <SelectContent>
                {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, i) => (
                  <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026].map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-md">
          <CardContent className="pt-5 text-center">
            <p className="text-sm text-muted-foreground">Total Base Salary</p>
            <p className="text-2xl font-bold">₹{totalBase.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="pt-5 text-center">
            <p className="text-sm text-muted-foreground">Total Deductions</p>
            <p className="text-2xl font-bold text-red-600">-₹{totalDeduction.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-rose-500 to-amber-500" />
          <CardContent className="pt-5 text-center">
            <p className="text-sm text-muted-foreground">Total Net Salary</p>
            <p className="text-2xl font-bold text-rose-600">₹{totalNet.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-md">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff</TableHead>
                  <TableHead>Base Salary</TableHead>
                  <TableHead>Present</TableHead>
                  <TableHead>Absent</TableHead>
                  <TableHead>Half Days</TableHead>
                  <TableHead>LOP Days</TableHead>
                  <TableHead>Deductions</TableHead>
                  <TableHead>Net Salary</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-10">Loading...</TableCell></TableRow>
                ) : payroll.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">No payroll data</TableCell></TableRow>
                ) : (
                  payroll.map((p) => (
                    <TableRow key={p._id || p.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Avatar className="w-8 h-8">
                            {p.photo ? <AvatarImage src={p.photo} /> : null}
                            <AvatarFallback className="bg-rose-100 text-rose-600 text-xs">{p.name?.[0] || '?'}</AvatarFallback>
                          </Avatar>
                          {p.name}
                        </div>
                      </TableCell>
                      <TableCell>₹{p.baseSalary?.toLocaleString()}</TableCell>
                      <TableCell><Badge className="bg-green-100 text-green-700">{p.presentDays}</Badge></TableCell>
                      <TableCell><Badge className="bg-red-100 text-red-700">{p.absentDays}</Badge></TableCell>
                      <TableCell><Badge className="bg-blue-100 text-blue-700">{p.halfDays}</Badge></TableCell>
                      <TableCell><Badge className="bg-amber-100 text-amber-700">{p.lopDays}</Badge></TableCell>
                      <TableCell className="text-red-600">-₹{p.totalDeduction?.toLocaleString()}</TableCell>
                      <TableCell className="font-bold text-rose-600">₹{p.netSalary?.toLocaleString()}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const ITEMS_PER_PAGE = 10;

function ServicesModule() {
  const [services, setServices] = useState<any[]>([]);
  const [combos, setCombos] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [comboDialogOpen, setComboDialogOpen] = useState(false);
  
  // Edit states
  const [editItem, setEditItem] = useState<any>(null);
  const [editCombo, setEditCombo] = useState<any>(null);
  
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', amount: '', gender: 'unisex' });
  const [comboForm, setComboForm] = useState({ name: '', serviceIds: [] as string[] });
  const [activeTab, setActiveTab] = useState<'services' | 'combos'>('services');

  // New states for search and pagination
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchAll = useCallback(async () => {
    try {
      const [svcData, comboData] = await Promise.all([apiCall('get', '/services'), apiCall('get', '/service-combos')]);
      setServices(Array.isArray(svcData) ? svcData : (svcData.services || [])); 
      setCombos(Array.isArray(comboData) ? comboData : (comboData.combos || comboData.serviceCombos || []));
    } catch { toast.error('Failed to fetch'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Reset to page 1 whenever search or tab changes
  useEffect(() => { setCurrentPage(1); }, [search, activeTab]);

  // ---- Filter Logic based on Search ----
  const filteredServices = services.filter(s => 
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.gender?.toLowerCase().includes(search.toLowerCase()) ||
    String(s.amount || '').includes(search)
  );

  const filteredCombos = combos.filter(c => {
    const matchesName = c.name?.toLowerCase().includes(search.toLowerCase());
    // Also allow searching by services within the combo
    const matchesServiceName = (c.items || c.services || []).some((s: any) => 
      s.service?.name?.toLowerCase().includes(search.toLowerCase()) || s.name?.toLowerCase().includes(search.toLowerCase())
    );
    return matchesName || matchesServiceName;
  });

  // ---- Pagination Logic ----
  const currentData = activeTab === 'services' ? filteredServices : filteredCombos;
  const totalPages = Math.ceil(currentData.length / ITEMS_PER_PAGE);
  const paginatedData = currentData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // ---- Service Functions ----
  const openNew = () => { setEditItem(null); setForm({ name: '', amount: '', gender: 'unisex' }); setDialogOpen(true); };
  const openEdit = (s: any) => { setEditItem(s); setForm({ name: s.name, amount: String(s.amount), gender: s.gender }); setDialogOpen(true); };

  const handleSubmit = async () => {
    try {
      if (editItem) { await apiCall('put', `/services/${editItem._id || editItem.id}`, form); toast.success('Service updated'); }
      else { await apiCall('post', '/services', form); toast.success('Service added'); }
      setDialogOpen(false); fetchAll();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Failed'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this service?')) return;
    try { await apiCall('delete', `/services/${id}`); toast.success('Deleted'); fetchAll(); }
    catch { toast.error('Failed'); }
  };

  // ---- Combo Functions ----
  const openNewCombo = () => { 
    setEditCombo(null); 
    setComboForm({ name: '', serviceIds: [] }); 
    setComboDialogOpen(true); 
  };

  const openEditCombo = (c: any) => {
    setEditCombo(c);
    const ids = (c.items || c.services || []).map((s: any) => {
      if (typeof s === 'string') return s;
      return s.service?._id || s.service?.id || s._id || s.id;
    });
    setComboForm({ name: c.name, serviceIds: ids });
    setComboDialogOpen(true);
  };

  const handleComboSubmit = async () => {
    try {
      if (editCombo) {
        await apiCall('put', `/service-combos/${editCombo._id || editCombo.id}`, comboForm);
        toast.success('Combo updated');
      } else {
        await apiCall('post', '/service-combos', comboForm);
        toast.success('Combo created');
      }
      setComboDialogOpen(false); 
      setEditCombo(null);
      setComboForm({ name: '', serviceIds: [] }); 
      fetchAll();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Failed'); }
  };

  const handleDeleteCombo = async (id: string) => {
    if (!confirm('Delete this combo?')) return;
    try { 
      await apiCall('delete', `/service-combos/${id}`); 
      toast.success('Combo deleted'); 
      fetchAll(); 
    } catch (err: unknown) { 
      toast.error(err instanceof Error ? err.message : 'Failed to delete'); 
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h1 className="text-3xl font-bold">Services</h1><p className="text-muted-foreground">Manage services & combos</p></div>
        <div className="flex gap-2">
          <Button onClick={openNew} className="bg-rose-500 hover:bg-rose-600 text-white"><Plus className="w-4 h-4 mr-1" />Add Service</Button>
          <Button onClick={openNewCombo} variant="outline"><Star className="w-4 h-4 mr-1" />New Combo</Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder={`Search ${activeTab}...`} 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="pl-9" 
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button 
          variant={activeTab === 'services' ? 'default' : 'outline'} 
          size="sm" 
          onClick={() => { setActiveTab('services'); setSearch(''); }} 
          className={activeTab === 'services' ? 'bg-rose-500 hover:bg-rose-600 text-white' : ''}
        >
          Services
        </Button>
        <Button 
          variant={activeTab === 'combos' ? 'default' : 'outline'} 
          size="sm" 
          onClick={() => { setActiveTab('combos'); setSearch(''); }} 
          className={activeTab === 'combos' ? 'bg-rose-500 hover:bg-rose-600 text-white' : ''}
        >
          Combos
        </Button>
      </div>

      {/* Services Table View */}
      {activeTab === 'services' ? (
        <Card className="border-0 shadow-md"><CardContent className="p-0"><div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Amount</TableHead><TableHead>Gender</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {loading ? <TableRow><TableCell colSpan={4} className="text-center py-10">Loading...</TableCell></TableRow> :
                paginatedData.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground">No services found</TableCell></TableRow> :
                paginatedData.map((s: any) => (
                    <TableRow key={s._id || s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>₹{s.amount}</TableCell>
                      <TableCell className="capitalize">{s.gender}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Edit className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(s._id || s.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination Footer */}
        {filteredServices.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages || 1} (Total: {filteredServices.length})
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Prev
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages || totalPages === 0}>
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
        </CardContent></Card>
      ) : (
        /* Combos Grid View */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedData.length === 0 ? <div className="col-span-full text-center py-10 text-muted-foreground">No combos found</div> :
              paginatedData.map((c: any) => (
                <Card key={c._id || c.id} className="border-0 shadow-md flex flex-col">
                  <CardContent className="pt-5 flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg">{c.name}</h3>
                        <p className="text-rose-600 font-bold mt-1">₹{c.totalPrice || c.price}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditCombo(c)}><Edit className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteCombo(c._id || c.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                    <div className="mt-4 space-y-1 border-t pt-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Includes:</p>
                      {(c.items || c.services || []).map((s: any, i: number) => (
                        <p key={i} className="text-sm text-muted-foreground">
                          {s.service?.name || s.name} - ₹{s.service?.amount || s.amount}
                        </p>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            }
          </div>

          {/* Pagination Footer for Combos */}
          {filteredCombos.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-white rounded-md shadow-sm">
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages || 1} (Total: {filteredCombos.length})
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}>
                  <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages || totalPages === 0}>
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Service Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>{editItem ? 'Edit Service' : 'Add Service'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Amount *</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
            <div><Label>Gender</Label><Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="unisex">Unisex</SelectItem></SelectContent></Select></div>
            <Button onClick={handleSubmit} className="w-full bg-rose-500 hover:bg-rose-600 text-white">{editItem ? 'Update' : 'Add'} Service</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Combo Dialog */}
      <Dialog open={comboDialogOpen} onOpenChange={setComboDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editCombo ? 'Edit Combo' : 'New Combo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Combo Name *</Label><Input value={comboForm.name} onChange={(e) => setComboForm({ ...comboForm, name: e.target.value })} /></div>
            <div><Label>Services</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-2">
                {services.length === 0 ? <p className="text-center text-sm text-muted-foreground py-4">No services available</p> :
                services.map((s) => (
                  <label key={s._id || s.id} className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer">
                    <Checkbox 
                      checked={comboForm.serviceIds.includes(s._id || s.id)} 
                      onCheckedChange={(v) => {
                        const id = s._id || s.id;
                        setComboForm({ ...comboForm, serviceIds: v ? [...comboForm.serviceIds, id] : comboForm.serviceIds.filter((x) => x !== id) });
                      }} 
                    />
                    <span className="flex-1">{s.name}</span>
                    <span className="text-sm text-muted-foreground">₹{s.amount}</span>
                  </label>
                ))}
              </div>
            </div>
            <Button onClick={handleComboSubmit} className="w-full bg-rose-500 hover:bg-rose-600 text-white">
              {editCombo ? 'Update Combo' : 'Create Combo'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BranchesModule() {
  const [branches, setBranches] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', gstNumber: '' });

  const fetchBranches = useCallback(async () => {
    try { const data = await apiCall('get', '/branches'); setBranches(data.branches || []); }
    catch { toast.error('Failed to fetch'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchBranches(); }, [fetchBranches]);

  const openNew = () => { setEditItem(null); setForm({ name: '', email: '', phone: '', address: '', gstNumber: '' }); setDialogOpen(true); };
  const openEdit = (b: any) => { setEditItem(b); setForm({ name: b.name, email: b.email || '', phone: b.phone || '', address: b.address || '', gstNumber: b.gstNumber || '' }); setDialogOpen(true); };

  const handleSubmit = async () => {
    try {
      if (editItem) { await apiCall('put', `/branches/${editItem._id || editItem.id}`, form); toast.success('Updated'); }
      else { await apiCall('post', '/branches', form); toast.success('Created'); }
      setDialogOpen(false); fetchBranches();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Failed'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete?')) return;
    try { await apiCall('delete', `/branches/${id}`); toast.success('Deleted'); fetchBranches(); }
    catch { toast.error('Failed'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h1 className="text-3xl font-bold">Branches</h1><p className="text-muted-foreground">Manage salon branches</p></div>
        <Button onClick={openNew} className="bg-rose-500 hover:bg-rose-600 text-white"><Plus className="w-4 h-4 mr-1" />Add Branch</Button>
      </div>

      <Card className="border-0 shadow-md"><CardContent className="p-0"><div className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead>Address</TableHead><TableHead>GST</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading ? <TableRow><TableCell colSpan={6} className="text-center py-10">Loading...</TableCell></TableRow> :
              branches.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No branches found</TableCell></TableRow> :
                branches.map((b) => (
                  <TableRow key={b._id || b.id}>
                    <TableCell className="font-medium">{b.name}</TableCell>
                    <TableCell>{b.email || '-'}</TableCell>
                    <TableCell>{b.phone || '-'}</TableCell>
                    <TableCell>{b.address || '-'}</TableCell>
                    <TableCell>{b.gstNumber || '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(b)}><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(b._id || b.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div></CardContent></Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>{editItem ? 'Edit Branch' : 'Add Branch'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div><Label>GST Number</Label><Input value={form.gstNumber} onChange={(e) => setForm({ ...form, gstNumber: e.target.value })} /></div>
            <Button onClick={handleSubmit} className="w-full bg-rose-500 hover:bg-rose-600 text-white">{editItem ? 'Update' : 'Add'} Branch</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TransactionsModule() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', status: '', paymentMethod: '', dateFrom: '', dateTo: '' });
  const [form, setForm] = useState({ clientId: '', amount: '', status: 'paid', paymentMethod: 'cash', date: '', branchId: '' });

  // ✅ Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // ✅ Safely get branchId AND branchName from localStorage
  let localBranchId = '';
  let localBranchName = '';
  try {
    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem("salon_user");
      if (userStr) {
        const user = JSON.parse(userStr);
        localBranchId = user?.branchId?.id || user?.branchId || '';
        localBranchName = user?.branchId?.name || '';
      }
      if (!localBranchId) {
        localBranchId = localStorage.getItem('branchId') || '';
      }
    }
  } catch (e) {}

  const fetchAll = useCallback(async () => {
    try {
      // If localBranchId exists, fetch only that branch's data. If null, fetch all.
      const txUrl = localBranchId 
        ? `/transactions/client/transaction?branchId=${localBranchId}` 
        : `/transactions/client/transaction`;
        
      const clientUrl = localBranchId 
        ? `/clients?branchId=${localBranchId}` 
        : `/clients`;

      const [txData, clientData] = await Promise.all([
        apiCall('get', txUrl),
        apiCall('get', clientUrl)
      ]);
      
      setTransactions(txData.transactions || txData.data || txData || []);
      setClients(clientData.clients || []);
    } catch {
      toast.error('Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  }, [localBranchId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ✅ Reset to page 1 when filters change
  useEffect(() => { setCurrentPage(1); }, [filters]);

  // ✅ Filter logic adapted for the new data structure
  const filteredTransactions = useMemo(() => {
    return (transactions || []).filter((t) => {
      if (!t) return false;
      
      // ✅ FIX: Strict Branch Filter. If localBranchId exists, ONLY show matching branch data.
      // Checks t.branchId first, then falls back to t.client.branchId
      if (localBranchId) {
        let tBranchId = '';

        // 1. Check if transaction has a direct branchId
        if (t.branchId) {
          tBranchId = typeof t.branchId === 'object' ? (t.branchId._id || t.branchId.id || '') : t.branchId;
        } 
        // 2. If not found, check inside the populated client object
        else if (t.client?.branchId) {
          tBranchId = typeof t.client.branchId === 'object' ? (t.client.branchId._id || t.client.branchId.id || '') : t.client.branchId;
        }

        if (tBranchId !== localBranchId) return false;
      }
      
      // Search Filter
      if (filters.search) {
        const s = filters.search.toLowerCase();
        const matchesSearch = 
          t.billId?.toLowerCase().includes(s) || 
          t.client?.name?.toLowerCase().includes(s) || 
          t.client?.phone?.includes(s);
        if (!matchesSearch) return false;
      }
      
      // Status Filter
      if (filters.status && t.status !== filters.status) return false;
      
      // Payment Method Filter
      if (filters.paymentMethod) {
        const hasMethod = Array.isArray(t.paymentMethod) 
          ? t.paymentMethod.some(pm => pm[filters.paymentMethod] !== undefined)
          : t.paymentMethod === filters.paymentMethod;
        if (!hasMethod) return false;
      }
      
      // Date Filters
      if (filters.dateFrom && new Date(t.date) < new Date(filters.dateFrom)) return false;
      if (filters.dateTo && new Date(t.date) > new Date(filters.dateTo)) return false;
      
      return true;
    });
  }, [transactions, filters, localBranchId]); 

  // ✅ Calculate Total Amount for Selected Payment Method
  const totalPaymentAmount = useMemo(() => {
    if (!filters.paymentMethod) return null;
    return filteredTransactions.reduce((sum, t) => {
      let amount = 0;
      if (Array.isArray(t.paymentMethod)) {
        const pmObj = t.paymentMethod.find(pm => pm[filters.paymentMethod] !== undefined);
        if (pmObj) {
          amount = parseFloat(pmObj[filters.paymentMethod]) || 0;
        }
      } else if (t.paymentMethod === filters.paymentMethod) {
        amount = parseFloat(t.totalAmount) || 0;
      }
      return sum + amount;
    }, 0);
  }, [filteredTransactions, filters.paymentMethod]);

  const filteredClients = useMemo(() => {
    // ✅ If no localBranchId, return all clients. Otherwise, filter strictly.
    if (!localBranchId) return clients || [];
    return (clients || []).filter((c) => {
      if (!c) return false;
      // ✅ Handle branchId whether it's a string or an object { _id: "..." }
      const cBranchId = typeof c.branchId === 'object' ? c.branchId?._id : c.branchId;
      return cBranchId === localBranchId;
    });
  }, [clients, localBranchId]);

  // ✅ Pagination Math
  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedData = filteredTransactions.slice(startIndex, endIndex);

  const openNew = () => {
    setEditItem(null);
    setForm({ clientId: '', amount: '', status: 'paid', paymentMethod: 'cash', date: new Date().toISOString().split('T')[0], branchId: localBranchId });
    setDialogOpen(true);
  };

  const openEdit = (t: any) => {
    setEditItem(t);
    setForm({
      clientId: t.clientId?._id || t.clientId || '',
      amount: String(t.amount || t.totalAmount || ''),
      status: t.status || 'paid',
      paymentMethod: Array.isArray(t.paymentMethod) ? Object.keys(t.paymentMethod[0] || {})[0] || 'cash' : t.paymentMethod || 'cash',
      date: t.date || '',
      branchId: t.branchId?._id || t.branchId || localBranchId
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      // Ensure branchId is attached on create if it exists in local storage
      const payload = { ...form };
      if (!payload.branchId && localBranchId) payload.branchId = localBranchId;

      if (editItem) { 
        await apiCall('put', `/transactions/${editItem._id || editItem.id}`, payload); 
        toast.success('Updated'); 
      } else { 
        await apiCall('post', '/transactions', payload); 
        toast.success('Created'); 
      }
      setDialogOpen(false); 
      fetchAll();
    } catch (err: unknown) { 
      toast.error(err instanceof Error ? err.message : 'Failed'); 
    }
  };

  // ✅ Correct CSV Export Format with proper escaping and BOM for Excel
  const handleExportCSV = () => {
    const headers = ['Bill ID', 'Client Name', 'Phone', 'Total Amount', 'Status', 'Payment Methods', 'Date'];
    const rows = filteredTransactions.map((t) => {
      const pms = Array.isArray(t.paymentMethod) 
        ? t.paymentMethod.map(pm => `${Object.keys(pm)[0]}: ${Object.values(pm)[0]}`).join(' | ')
        : t.paymentMethod || '';
        
      return [
        t.billId || '', 
        t.client?.name || '', 
        t.client?.phone || '', 
        t.totalAmount || 0, 
        t.status || '', 
        pms, 
        t.date ? new Date(t.date).toLocaleDateString() : ''
      ];
    });

    const escapeCsv = (val: any) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvContent = '\uFEFF' + [headers, ...rows].map(r => r.map(escapeCsv).join(',')).join('\r\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); 
    a.href = url; 
    a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a); 
    a.click(); 
    document.body.removeChild(a); 
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Transactions</h1>
          <p className="text-muted-foreground">Manage transactions</p>
          {/* ✅ Total Count & Dynamic Payment Amount Box */}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <Badge variant="outline" className="bg-rose-50 text-rose-600 border-rose-200">
              Total Transactions: {filteredTransactions.length}
            </Badge>
            {totalPaymentAmount !== null && (
              <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
                Total {filters.paymentMethod.replace('_', ' ')}: ₹{totalPaymentAmount.toLocaleString()}
              </Badge>
            )}
            {localBranchName && (
              <span className="text-xs text-muted-foreground">Branch: {localBranchName}</span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportCSV} variant="outline" size="sm"><Download className="w-4 h-4 mr-1" />CSV</Button>
          <Button onClick={openNew} className="bg-rose-500 hover:bg-rose-600 text-white"><Plus className="w-4 h-4 mr-1" />New Transaction</Button>
        </div>
      </div>

      <Card className="border-0 shadow-md"><CardContent className="pt-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search Bill/Client..." className="pl-9" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
          </div>
          <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v === 'all' ? '' : v })}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.paymentMethod} onValueChange={(v) => setFilters({ ...filters, paymentMethod: v === 'all' ? '' : v })}>
            <SelectTrigger><SelectValue placeholder="Payment Method" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="debit_card">Debit Card</SelectItem>
              <SelectItem value="credit_card">Credit Card</SelectItem>
              <SelectItem value="paytm">Paytm</SelectItem>
              <SelectItem value="gpay">GPay</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} />
          <Input type="date" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} />
        </div>
      </CardContent></Card>

      <Card className="border-0 shadow-md">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill ID</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment Method(s)</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10">Loading...</TableCell>
                  </TableRow>
                ) : paginatedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      No transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedData.map((t) => (
                    <TableRow key={t._id || t.id || t.billId}>
                      <TableCell className="font-mono text-xs">{t.billId || '—'}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{t.client?.name || '—'}</span>
                          {t.client?.phone && <span className="text-xs text-muted-foreground">{t.client.phone}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">₹{Number(t.totalAmount || 0).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={t.status === 'paid' ? 'default' : t.status === 'refunded' ? 'destructive' : 'secondary'}>
                          {t.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {Array.isArray(t.paymentMethod) && t.paymentMethod.length > 0 ? (
                          <Select>
                            <SelectTrigger className="w-[160px] h-8 text-xs">
                              <SelectValue placeholder="View Payments" />
                            </SelectTrigger>
                            <SelectContent>
                              {t.paymentMethod.map((pm: any, idx: number) => {
                                const method = Object.keys(pm)[0];
                                const amount = pm[method];
                                return (
                                  <SelectItem key={idx} value={method} disabled>
                                    <span className="font-medium capitalize">{method.replace('_', ' ')}</span>: ₹{amount}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{t.date ? new Date(t.date).toLocaleDateString() : '—'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* ✅ Pagination Footer */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50/50">
              <p className="text-xs text-muted-foreground">
                Showing <span className="font-medium text-foreground">{startIndex + 1}</span> to{' '}
                <span className="font-medium text-foreground">{Math.min(endIndex, filteredTransactions.length)}</span> of{' '}
                <span className="font-medium text-foreground">{filteredTransactions.length}</span> transactions
              </p>
              <div className="flex items-center gap-1">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm font-medium px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editItem ? 'Edit Transaction' : 'New Transaction'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Client *</Label>
              <Select value={form.clientId} onValueChange={(v) => setForm({ ...form, clientId: v })}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {filteredClients.length === 0 ? (
                    <SelectItem value="__none" disabled>No clients in this branch</SelectItem>
                  ) : (
                    filteredClients.map((c) => (
                      <SelectItem key={c._id || c.id} value={c._id || c.id}>{c.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Amount *</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Payment</Label>
                <Select value={form.paymentMethod} onValueChange={(v) => setForm({ ...form, paymentMethod: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="debit_card">Debit Card</SelectItem>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                    <SelectItem value="paytm">Paytm</SelectItem>
                    <SelectItem value="gpay">GPay</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Date *</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
            <Button onClick={handleSubmit} className="w-full bg-rose-500 hover:bg-rose-600 text-white">{editItem ? 'Update' : 'Create'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProductsModule() {
  const [products, setProducts] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ vName:'',vNumber:'', vAddress:'', brand: '', pName: '', count: '', pricePerUnit: '', discount: '', totalAmount: '', dateAdded: '' });

  const fetchProducts = useCallback(async () => {
    try { 
      const url = search.trim() !== '' ? `/products?search=${encodeURIComponent(search)}` : '/products';
      const data = await apiCall('get', url); 
      const result = Array.isArray(data) ? data : (data.products || data.data || []);
      setProducts(result); 
    }
    catch { toast.error('Failed to fetch'); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const openNew = () => { 
    setEditItem(null); 
    setForm({ vName:'',vNumber: '',vAddress: '', brand: '', pName: '', count: '', pricePerUnit: '', discount: '', totalAmount: '', dateAdded: '' }); 
    setDialogOpen(true); 
  };

  const openEdit = (p: any) => { 
    setEditItem(p); 
    setForm({
      vName: p.vName || '',
      vNumber: p.vNumber || '',
      vAddress: p.vAddress || '',
      brand: p.brand || '',
      pName: p.pName || '',
      count: String(p.count || ''), 
      pricePerUnit: String(p.pricePerUnit || ''), 
      discount: String(p.discount || ''), 
      totalAmount: String(p.totalAmount || ''), 
      dateAdded: p.dateAdded || '' 
    }); 
    setDialogOpen(true); 
  };

  const handleSubmit = async () => {
    try {
      if (editItem) { await apiCall('put', `/products/${editItem._id || editItem.id}`, form); toast.success('Updated'); }
      else { await apiCall('post', '/products', form); toast.success('Created'); }
      setDialogOpen(false); 
      fetchProducts();
    } catch (err: unknown) { 
      toast.error(err instanceof Error ? err.message : 'Failed'); 
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete?')) return;
    try { await apiCall('delete', `/products/${id}`); toast.success('Deleted'); fetchProducts(); }
    catch { toast.error('Failed'); }
  };

  // Helper to calculate total amount dynamically
  const calculateTotal = (count: string, pricePerUnit: string, discount: string) => {
    const c = parseFloat(count) || 0;
    const p = parseFloat(pricePerUnit) || 0;
    const d = parseFloat(discount) || 0;
    const total = (c * p) - d;
    return total >= 0 ? String(total) : '0';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h1 className="text-3xl font-bold">Products</h1><p className="text-muted-foreground">Manage product inventory</p></div>
        <Button onClick={openNew} className="bg-rose-500 hover:bg-rose-600 text-white"><Plus className="w-4 h-4 mr-1" />Add Product</Button>
      </div>
      <div className="flex gap-2"><div className="relative flex-1 max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div></div>

      <Card className="border-0 shadow-md"><CardContent className="p-0"><div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>VName</TableHead>
              <TableHead>VNumber</TableHead>
              <TableHead>VAddress</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Price/Unit</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Total Amount</TableHead>
              <TableHead>Date Added</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={11} className="text-center py-10">Loading...</TableCell></TableRow>
            ) : products.length === 0 ? (
              <TableRow><TableCell colSpan={11} className="text-center py-10 text-muted-foreground">No products found</TableCell></TableRow>
            ) : (
              products.map((p) => (
                <TableRow key={p._id || p.id}>
                  <TableCell>{p.vName}</TableCell>
                  <TableCell>{p.vNumber}</TableCell>
                  <TableCell>{p.vAddress}</TableCell>
                  <TableCell className="font-medium">{p.brand}</TableCell>
                  <TableCell>{p.pName}</TableCell>
                  <TableCell>{Number(p.count) <= 5 ? <Badge variant="destructive">{p.count} (Low)</Badge> : p.count}</TableCell>
                  <TableCell>₹{p.pricePerUnit}</TableCell>
                  <TableCell>₹{p.discount}</TableCell>
                  <TableCell>₹{p.totalAmount}</TableCell>
                  <TableCell>{p.dateAdded || '-'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(p._id || p.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div></CardContent></Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>{editItem ? 'Edit Product' : 'Add Product'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>VName *</Label><Input value={form.vName} onChange={(e) => setForm({ ...form, vName: e.target.value })} /></div>
            <div><Label>VNumber *</Label><Input value={form.vNumber} onChange={(e) => setForm({ ...form, vNumber: e.target.value })} /></div>
            <div><Label>VAddress *</Label><Input value={form.vAddress} onChange={(e) => setForm({ ...form, vAddress: e.target.value })} /></div>
            <div><Label>Brand *</Label><Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></div>
            <div><Label>PName *</Label><Input value={form.pName} onChange={(e) => setForm({ ...form, pName: e.target.value })} /></div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Count</Label>
                <Input 
                  type="number" 
                  value={form.count} 
                  onChange={(e) => {
                    const newCount = e.target.value;
                    setForm({ ...form, count: newCount, totalAmount: calculateTotal(newCount, form.pricePerUnit, form.discount) });
                  }} 
                />
              </div>
              <div>
                <Label>Price/Unit</Label>
                <Input 
                  type="number" 
                  value={form.pricePerUnit} 
                  onChange={(e) => {
                    const newPrice = e.target.value;
                    setForm({ ...form, pricePerUnit: newPrice, totalAmount: calculateTotal(form.count, newPrice, form.discount) });
                  }} 
                />
              </div>
            </div>
            
            <div>
              <Label>Discount</Label>
              <Input 
                type="number" 
                value={form.discount} 
                onChange={(e) => {
                  const newDiscount = e.target.value;
                  setForm({ ...form, discount: newDiscount, totalAmount: calculateTotal(form.count, form.pricePerUnit, newDiscount) });
                }} 
              />
            </div>
            
            <div>
              <Label>Total Amount</Label>
              <Input 
                type="number" 
                value={form.totalAmount} 
                readOnly 
                className="bg-gray-100 cursor-not-allowed"
              />
            </div>
            
            <div><Label>Date Added</Label><Input type="date" value={form.dateAdded} onChange={(e) => setForm({ ...form, dateAdded: e.target.value })} /></div>
            
            <Button onClick={handleSubmit} className="w-full bg-rose-500 hover:bg-rose-600 text-white">{editItem ? 'Update' : 'Add'} Product</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


function TranswareProductsModule() {
  const [tProducts, setTProducts] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');

  // Local Storage Branch Context
  let localBranchId = '';
  let localBranchName = '';
  if (typeof window !== "undefined") {
    const userStr = localStorage.getItem("salon_user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        localBranchId = user?.branchId?.id || user?.branchId || '';
        localBranchName = user?.branchId?.name || '';
      } catch (e) { /* ignore */ }
    }
    if (!localBranchId) localBranchId = localStorage.getItem('branchId') || '';
  }

  const [form, setForm] = useState({
    productId: '',
    fBranchId: '',
    tBranchId: '',
    brand: '',
    count: '',
    f_b_s_name: '',
    t_b_s_name: '',
    notes: ''
  });

  const fetchData = useCallback(async () => {
    try {
      const [tProdRes, prodRes, branchRes] = await Promise.all([
        apiCall('get', '/products/tproduct'),
        apiCall('get', '/products'),
        apiCall('get', '/branches')
      ]);
      
      setTProducts(tProdRes.tProducts || tProdRes.data || []);
      setProducts(prodRes.products || prodRes.data || []);
      setBranches(branchRes.branches || branchRes.data || []);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredTProducts = tProducts.filter(tp => {
    const pName = products.find(p => (p._id || p.id) === (tp.productId?._id || tp.productId))?.pName || '';
    return pName.toLowerCase().includes(search.toLowerCase()) || tp.brand.toLowerCase().includes(search.toLowerCase());
  });

  const openNew = () => {
    setEditItem(null);
    setForm({
      productId: '',
      fBranchId: localBranchId || '', // Auto-fill if exists
      tBranchId: '',
      brand: '',
      count: '',
      f_b_s_name: '',
      t_b_s_name: '',
      notes: ''
    });
    setProductSearch('');
    setDialogOpen(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({
      productId: item.productId?._id || item.productId || '',
      fBranchId: item.fBranchId?._id || item.fBranchId || '',
      tBranchId: item.tBranchId?._id || item.tBranchId || '',
      brand: item.brand || '',
      count: String(item.count || ''),
      f_b_s_name: item.f_b_s_name || '',
      t_b_s_name: item.t_b_s_name || '',
      notes: item.notes || ''
    });
    setProductSearch('');
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.productId || !form.fBranchId || !form.tBranchId || !form.count || !form.f_b_s_name || !form.t_b_s_name) {
      toast.error('Please fill all required fields');
      return;
    }
    try {
      if (editItem) {
        await apiCall('put', `/products/tproduct/${editItem._id || editItem.id}`, form);
        toast.success('TProduct updated successfully');
      } else {
        await apiCall('post', '/products/tproduct', form);
        toast.success('TProduct added successfully');
      }
      setDialogOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this transfer record?')) return;
    try {
      await apiCall('delete', `/products/tproduct/${id}`);
      toast.success('Deleted successfully');
      fetchData();
    } catch {
      toast.error('Failed to delete');
    }
  };

  // Helper functions
  const getProductName = (id: string) => products.find(p => (p._id || p.id) === id)?.pName || 'N/A';
  const getBranchName = (id: string) => branches.find(b => (b._id || b.id) === id)?.name || 'N/A';

  const filteredProductsForDropdown = products.filter(p => 
    p.pName?.toLowerCase().includes(productSearch.toLowerCase())
  );

  if (loading) return <div className="flex justify-center p-10">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Transfer Products</h1>
          <p className="text-muted-foreground">Manage product transfers between branches</p>
        </div>
        <Button onClick={openNew} className="bg-rose-500 hover:bg-rose-600 text-white">
          <Plus className="w-4 h-4 mr-1" /> Add Transfer
        </Button>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by product or brand..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <Card className="border-0 shadow-md">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product Name</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Count</TableHead>
                <TableHead>From Branch</TableHead>
                <TableHead>To Branch</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No records found</TableCell>
                </TableRow>
              ) : (
                filteredTProducts.map((tp) => (
                  <TableRow key={tp._id || tp.id}>
                    <TableCell className="font-medium">{tp.productId?.pName || getProductName(tp.productId)}</TableCell>
                    <TableCell>{tp.brand}</TableCell>
                    <TableCell><Badge variant="secondary">{tp.count}</Badge></TableCell>
                    <TableCell>{tp.fBranchId?.name || getBranchName(tp.fBranchId)}
                    <p className="text-xs text-muted-foreground">{tp.f_b_s_name}</p>
                      </TableCell>
                    <TableCell>{tp.tBranchId?.name || getBranchName(tp.tBranchId)}
                      <p className="text-xs text-muted-foreground">{tp.t_b_s_name}</p>
                      </TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">{tp.notes || '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(tp)}><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(tp._id || tp.id)}><Trash2 className="w-4 h-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? 'Edit Transfer' : 'Add Transfer'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            
            {/* Product Dropdown with Search */}
            <div className="space-y-2">
              <Label>Product *</Label>
              <Select value={form.productId} onValueChange={(v) => setForm({ ...form, productId: v })}>
                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>
                  {/* Search Input inside Dropdown */}
                  <div className="p-2 sticky top-0 bg-white z-10 border-b">
                    <Input 
                      placeholder="Search product..." 
                      value={productSearch} 
                      onChange={(e) => setProductSearch(e.target.value)} 
                      className="h-8"
                    />
                  </div>
                  <div className="max-h-[200px] overflow-y-auto">
                    {filteredProductsForDropdown.length === 0 ? (
                      <p className="text-sm text-muted-foreground p-2 text-center">No products found</p>
                    ) : (
                      filteredProductsForDropdown.map((p) => (
                        <SelectItem key={p._id || p.id} value={p._id || p.id}>{p.pName}</SelectItem>
                      ))
                    )}
                  </div>
                </SelectContent>
              </Select>
            </div>

            {/* Branch Logic */}
            <div className="grid grid-cols-2 gap-4">
              {/* From Branch */}
              <div className="space-y-2">
                <Label>From Branch *</Label>
                {localBranchId ? (
                  <div className="h-10 px-3 flex items-center rounded-md border border-input bg-muted/50 text-sm font-medium">
                    {localBranchName || getBranchName(localBranchId)}
                  </div>
                ) : (
                  <Select value={form.fBranchId} onValueChange={(v) => setForm({ ...form, fBranchId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                    <SelectContent>
                      {branches.map((b) => (
                        <SelectItem key={b._id || b.id} value={b._id || b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* To Branch */}
              <div className="space-y-2">
                <Label>To Branch *</Label>
                <Select value={form.tBranchId} onValueChange={(v) => setForm({ ...form, tBranchId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b._id || b.id} value={b._id || b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>From Staff Name</Label>
                <Input value={form.f_b_s_name} onChange={(e) => setForm({ ...form, f_b_s_name: e.target.value })} placeholder="From" />
              </div>
              <div className="space-y-2">
                <Label>To Staff Name *</Label>
                <Input value={form.t_b_s_name} onChange={(e) => setForm({ ...form, t_b_s_name: e.target.value })} placeholder="To" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Brand</Label>
                <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="e.g. Loreal" />
              </div>
              <div className="space-y-2">
                <Label>Count *</Label>
                <Input type="number" value={form.count} onChange={(e) => setForm({ ...form, count: e.target.value })} placeholder="e.g. 5" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" />
            </div>

            <Button onClick={handleSubmit} className="w-full bg-rose-500 hover:bg-rose-600 text-white">
              {editItem ? 'Update' : 'Submit'} Transfer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


function ReportsModule() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('week');

  useEffect(() => {
    setLoading(true);
    // Send period as a query param to your API
    apiCall('get', `/reports?period=${period}`)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [period]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full" />
    </div>
  );

  const chartData = data?.last7Days || [];
  const COLORS = ['#f43f5e', '#f59e0b', '#10b981', '#6366f1', '#8b5cf6'];

  return (
    <div className="space-y-6">
      {/* Header & Period Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground">Analytics and insights</p>
        </div>
        
        {/* Weekly / Monthly / Yearly Buttons */}
        <div className="flex items-center bg-gray-100 rounded-lg p-1">
          {(['week', 'month', 'year'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors capitalize ${
                period === p ? 'bg-white text-rose-600 shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {p === 'week' ? 'Weekly' : p === 'month' ? 'Monthly' : 'Yearly'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">
              Appointments ({period === 'week' ? 'Last 7 Days' : period === 'month' ? 'Last 30 Days' : 'Last 12 Months'})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-muted-foreground text-center py-10">No data yet</p>}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Revenue by Payment Method</CardTitle>
          </CardHeader>
          <CardContent>
            {(data?.revenueByMethod || []).length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie 
                    data={data.revenueByMethod.map((r: any) => ({ 
                      name: r.paymentMethod, 
                      value: r._sum?.amount || 0 
                    }))} 
                    cx="50%" 
                    cy="50%" 
                    outerRadius={100} 
                    dataKey="value" 
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {data.revenueByMethod.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-muted-foreground text-center py-10">No data yet</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SalonCRM() {
   const { isAuthenticated, hydrate } = useAuthStore();
  const activePage = useNavStore((s) => s.activePage);

  // ✅ LOCAL state — no store dependency
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => { hydrate(); }, [hydrate]);
  useEffect(() => { apiCall('post', '/auth/login').catch(() => { }); }, []);

  if (isRegistering) {
    return <RegisterPage onClose={() => setIsRegistering(false)} />;
  }

  if (!isAuthenticated) return <LoginPage />;

  return (
    <div className="min-h-screen bg-gray-50/50">
      <NavHeader onRegisterOpen={() => setIsRegistering(true)} />
      <main className="max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8">
        {activePage === 'dashboard' && <DashboardModule />}
        {activePage === 'clients' && <ClientsModule />}
        {activePage === 'clients_message' && <ClientsMessageModule />}
        {activePage === 'billing' && <BillModule />}
        {activePage === 'appointments' && <AppointmentsModule />}
        {activePage === 'staff-list' && <StaffListModule />}
        {/* {activePage === 'staff-fingerprint' && <StaffFingerprint />} */}
        {activePage === 'attendance' && <AttendanceModule />}     
        {activePage === 'staff-view' && <StaffViewModule />}
        {activePage === 'payroll' && <PayrollModule />}
        {activePage === 'services' && <ServicesModule />}
        {activePage === 'branches' && <BranchesModule />}
        {activePage === 'transactions' && <TransactionsModule />}
        {activePage === 'products' && <ProductsModule />}
        {activePage === 'tproducts' && <TranswareProductsModule />}
        {activePage === 'reports' && <ReportsModule />}
      </main>
    </div>
  );
}


// export const useAuth = create((set) => ({
//   // --- Your existing states ---
//   isAuthenticated: false,
//   user: null,
//   token: null,
  
//   // --- Your existing functions ---
//   login: (token, user) => set({ isAuthenticated: true, user, token }),
//   logout: () => set({ isAuthenticated: false, user: null, token: null }),
//   hydrate: () => {
//     // Your existing hydrate logic
//     const token = localStorage.getItem('token');
//     const user = JSON.parse(localStorage.getItem('user') || 'null');
//     if (token && user) set({ isAuthenticated: true, user, token });
//   },

//   // ✅ ADD THESE TWO LINES TO FIX THE ERROR
//   isRegistering: false,
//   setRegistering: (val: boolean) => set({ isRegistering: val }),
// }));