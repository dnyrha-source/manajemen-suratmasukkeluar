/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { User, UserRole } from "../types";
import { 
  Users, 
  UserPlus, 
  Edit3, 
  ShieldCheck, 
  Mail, 
  Lock, 
  CircleDot, 
  CheckCircle, 
  XCircle, 
  X,
  Sparkles,
  Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface UserManagementProps {
  users: User[];
  currentUser: Omit<User, 'password_hash'>;
  onAddUser: (data: any) => Promise<void>;
  onUpdateUser: (id: string, data: any) => Promise<void>;
  onDeleteUser: (id: string, username: string) => Promise<void>;
}

export default function UserManagement({ 
  users, 
  currentUser, 
  onAddUser, 
  onUpdateUser,
  onDeleteUser
}: UserManagementProps) {

  // Modal box states
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  // Form states
  const [formUsername, setFormUsername] = useState("");
  const [formNamaLengkap, setFormNamaLengkap] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formRole, setFormRole] = useState<UserRole>("Operator");
  const [formPassword, setFormPassword] = useState("");
  const [formAktif, setFormAktif] = useState(true);

  if (currentUser.role !== "Super Admin") {
    return (
      <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center max-w-md mx-auto space-y-4 font-sans anim-fade-in">
        <ShieldCheck className="h-12 w-12 text-red-500 mx-auto" />
        <h3 className="text-base font-bold text-red-800 font-display">Akses Ditolak</h3>
        <p className="text-xs text-red-600 leading-relaxed">
          Menu Manajemen Pengguna hanya diperuntukkan bagi pengguna dengan status <strong>Super Admin / Administrator Utama</strong>. Akun Anda ({currentUser.nama_lengkap}) tidak memiliki instrumen regulasi ini.
        </p>
      </div>
    );
  }

  // Open Form create
  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormUsername("");
    setFormNamaLengkap("");
    setFormEmail("");
    setFormRole("Operator");
    setFormPassword("");
    setFormAktif(true);
    setShowModal(true);
  };

  // Open Form edit
  const handleOpenEdit = (u: User) => {
    setEditingUser(u);
    setFormUsername(u.username);
    setFormNamaLengkap(u.nama_lengkap);
    setFormEmail(u.email);
    setFormRole(u.role);
    setFormPassword(""); // leave blank for no change
    setFormAktif(u.aktif);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUsername || !formNamaLengkap || !formEmail || (!editingUser && !formPassword)) {
      alert("Silakan isi semua field wajib.");
      return;
    }

    setLoading(true);
    const payload = {
      username: formUsername,
      nama_lengkap: formNamaLengkap,
      email: formEmail,
      role: formRole,
      password: formPassword || undefined,
      aktif: formAktif
    };

    try {
      if (editingUser) {
        await onUpdateUser(editingUser.id, payload);
      } else {
        await onAddUser(payload);
      }
      setShowModal(false);
    } catch (err: any) {
      alert(err.message || "Gagal menyimpan akun.");
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (user: User) => {
    if (user.username === "superadmin") {
      alert("Akun utama superadmin tidak dapat dinonaktifkan.");
      return;
    }
    try {
      await onUpdateUser(user.id, { aktif: !user.aktif });
    } catch (e: any) {
      alert(e.message || "Gagal mengubah status aktif.");
    }
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 font-display flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" />
            Manajemen Akun Pengguna
          </h2>
          <p className="text-xs text-slate-400 mt-1">Kelola lisensi hak akses, status aktifasi, dan kewenangan tata naskah dinas</p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <UserPlus className="h-4.5 w-4.5" />
          Tambah Pengguna Baru
        </button>
      </div>

      {/* Grid of users card and info panel */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                <th className="py-4 px-5">Nama Lengkap &amp; Username</th>
                <th className="py-4 px-4">Kontak Email</th>
                <th className="py-4 px-4">Hak Kewenangan (Role)</th>
                <th className="py-4 px-4 text-center">Status</th>
                <th className="py-4 px-4 text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center font-bold text-blue-600 uppercase">
                        {u.nama_lengkap.substring(0, 2)}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 text-sm">{u.nama_lengkap}</div>
                        <div className="text-slate-400 mt-0.5 font-mono">@{u.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 font-medium text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      {u.email}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      u.role === "Super Admin" ? "bg-red-50 text-red-700 border border-red-100" :
                      u.role === "Admin" ? "bg-amber-50 text-amber-700 border border-amber-100" :
                      u.role === "Operator" ? "bg-blue-50 text-blue-700 border border-blue-100" :
                      "bg-slate-100 text-slate-600 border border-slate-200"
                    }`}>
                      <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                      {u.role}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <button
                      onClick={() => toggleUserStatus(u)}
                      disabled={u.username === "superadmin"}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                        u.aktif 
                          ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" 
                          : "bg-red-50 text-red-600 hover:bg-red-100"
                      }`}
                    >
                      {u.aktif ? (
                        <>
                          <CheckCircle className="h-3.5 w-3.5" />
                          Aktif
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3.5 w-3.5" />
                          Nonaktif
                        </>
                      )}
                    </button>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenEdit(u)}
                        className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
                        title="Edit Profil"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      
                      {u.username !== "superadmin" && u.id !== currentUser.id && (
                        <button
                          onClick={async () => {
                            if (window.confirm(`Apakah Anda yakin ingin menghapus pengguna '${u.nama_lengkap}' (@${u.username}) secara permanen?`)) {
                              try {
                                await onDeleteUser(u.id, u.username);
                              } catch (err: any) {
                                alert(err.message || "Gagal menghapus pengguna");
                              }
                            }
                          }}
                          className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
                          title="Hapus Pengguna"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit user details form Modal overlay */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-start justify-center p-4 bg-slate-900/40 backdrop-blur-xs font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-sm overflow-hidden border border-slate-100 shadow-2xl my-auto"
            >
              <div className="bg-slate-900/5 py-4 px-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 font-display">
                  {editingUser ? "Edit Profil Pengguna" : "Daftarkan Pengguna Baru"}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1 rounded-full hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
                
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Username Unik *</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-mono text-xs">@</span>
                    <input
                      type="text"
                      required
                      disabled={!!editingUser}
                      value={formUsername}
                      onChange={(e) => setFormUsername(e.target.value.toLowerCase().trim())}
                      placeholder="username"
                      className="block w-full border border-slate-200 rounded-xl pl-7 pr-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Nama Lengkap &amp; Gelar *</label>
                  <input
                    type="text"
                    required
                    value={formNamaLengkap}
                    onChange={(e) => setFormNamaLengkap(e.target.value)}
                    placeholder="Contoh: Budiman, S.Kel"
                    className="block w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Layanan Alamat Email *</label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="budiman@instansi.go.id"
                    className="block w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Kewenangan Peran (Role) *</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as UserRole)}
                    disabled={editingUser?.username === "superadmin"}
                    className="block w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-700 font-semibold"
                  >
                    <option value="Super Admin">Super Admin</option>
                    <option value="Admin">Admin</option>
                    <option value="Operator">Operator</option>
                    <option value="Viewer">Viewer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    {editingUser ? "Ganti Sandi (Kosongkan jika tidak diubah)" : "Kata Sandi Akses *"}
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                      <Lock className="h-4 w-4" />
                    </span>
                    <input
                      type="password"
                      required={!editingUser}
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder={editingUser ? "Masukkan sandi baru" : "Sandi minimal 6 digit"}
                      className="block w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-100 font-semibold cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 font-bold rounded-xl flex items-center gap-1 cursor-pointer"
                  >
                    {loading ? "Menyimpan..." : "Simpan Profil"}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
