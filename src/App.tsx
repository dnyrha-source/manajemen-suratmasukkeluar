/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect } from "react";
import { 
  getSuratMasukApi, 
  getSuratKeluarApi, 
  getLogsApi, 
  getConfigApi, 
  getUsersApi, 
  getProfileApi,
  createUserApi, 
  updateUserApi,
  deleteUserApi,
  createSuratMasukApi, 
  updateSuratMasukApi, 
  deleteSuratMasukApi,
  createSuratKeluarApi, 
  updateSuratKeluarApi, 
  deleteSuratKeluarApi,
  logoutApi 
} from "./lib/api";
import { 
  User, 
  SuratMasuk, 
  SuratKeluar, 
  ActivityLog, 
  ConfigSettings 
} from "./types";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import SuratMasukList from "./components/SuratMasukList";
import SuratKeluarList from "./components/SuratKeluarList";
import UserManagement from "./components/UserManagement";
import SettingsView from "./components/Settings";
import { 
  Building, 
  Inbox, 
  Send, 
  Users, 
  Settings as SettingsIcon, 
  LogOut, 
  LayoutDashboard, 
  Bell, 
  RefreshCw, 
  CloudLightning,
  AlertCircle,
  Menu,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  
  // Auth states
  const [token, setToken] = useState<string | null>(localStorage.getItem("surat_auth_token"));
  const [currentUser, setCurrentUser] = useState<Omit<User, 'password_hash'> | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Core application data states
  const [suratMasuk, setSuratMasuk] = useState<SuratMasuk[]>([]);
  const [suratKeluar, setSuratKeluar] = useState<SuratKeluar[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [config, setConfig] = useState<ConfigSettings | null>(null);

  // View state: 'Dashboard' | 'SuratMasuk' | 'SuratKeluar' | 'ManajemenPengguna' | 'Pengaturan'
  const [activeTab, setActiveTab ] = useState<string>("Dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Global notification helper (toasts)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Perform token authentication on boot
  useEffect(() => {
    const handleAuthInit = async () => {
      const storedToken = localStorage.getItem("surat_auth_token");
      if (!storedToken) {
        setAuthChecking(false);
        return;
      }

      try {
        // Fetch configs to check token validity
        const cfg = await getConfigApi();
        setConfig(cfg);
        
        // Fetch current user details dynamically from server based on stored token
        const foundUser = await getProfileApi();

        setCurrentUser(foundUser);
        setToken(storedToken);
        await loadAllSystemData(foundUser);
      } catch (err) {
        console.error("Session verification failed:", err);
        localStorage.removeItem("surat_auth_token");
        setToken(null);
        setCurrentUser(null);
      } finally {
        setAuthChecking(false);
      }
    };

    handleAuthInit();
  }, [token]);

  // Main data synchronization block
  const loadAllSystemData = async (userProfile?: any) => {
    if (!localStorage.getItem("surat_auth_token")) return;
    setDataLoading(true);
    setGlobalError(null);
    try {
      const [sm, sk, l, cfg] = await Promise.all([
        getSuratMasukApi(),
        getSuratKeluarApi(),
        getLogsApi().catch(() => []), // gracefully bypass if lower role
        getConfigApi()
      ]);
      setSuratMasuk(sm);
      setSuratKeluar(sk);
      setLogs(l);
      setConfig(cfg);

      const effectiveUser = userProfile || currentUser;
      if (effectiveUser?.role === "Super Admin") {
        const u = await getUsersApi();
        setUsers(u);
      }
    } catch (err: any) {
      console.error("Data fetch error:", err);
      setGlobalError("Gagal menyinkronkan data dengan database local server.");
    } finally {
      setDataLoading(false);
    }
  };

  const handleLoginSuccess = async (newToken: string, user: any) => {
    localStorage.setItem("surat_auth_token", newToken);
    setCurrentUser(user);
    setToken(newToken);
    setActiveTab("Dashboard");
    await loadAllSystemData(user);
    showToast(`Selamat datang kembali, ${user.nama_lengkap}!`);
  };

  const handleLogout = async () => {
    try {
      await logoutApi();
      localStorage.removeItem("surat_auth_token");
      setToken(null);
      setCurrentUser(null);
      showToast("Berhasil logout dari sistem persuratan.");
    } catch {
      localStorage.removeItem("surat_auth_token");
      setToken(null);
      setCurrentUser(null);
    }
  };

  // Surat Masuk CRUD wrappers
  const handleAddSuratMasuk = async (data: Partial<SuratMasuk>) => {
    try {
      await createSuratMasukApi(data);
      await loadAllSystemData();
      showToast("Surat masuk berhasil diregistrasi ke agenda.");
    } catch (err: any) {
      throw new Error(err.message || "Gagal menambah rujukan surat masuk.");
    }
  };

  const handleUpdateSuratMasuk = async (id: string, data: Partial<SuratMasuk>) => {
    try {
      await updateSuratMasukApi(id, data);
      await loadAllSystemData();
      showToast("Registrasi agenda surat masuk diperbarui.");
    } catch (err: any) {
      throw new Error(err.message || "Gagal memperbarui rujukan.");
    }
  };

  const handleDeleteSuratMasuk = async (id: string) => {
    try {
      await deleteSuratMasukApi(id);
      await loadAllSystemData();
      showToast("Agenda surat masuk berhasil dihapus permanen.", "error");
    } catch (err: any) {
      throw new Error(err.message || "Gagal melenyapkan rujukan.");
    }
  };

  // Surat Keluar CRUD wrappers
  const handleAddSuratKeluar = async (data: Partial<SuratKeluar>) => {
    try {
      await createSuratKeluarApi(data);
      await loadAllSystemData();
      showToast("Surat keluar berhasil diregistrasi.");
    } catch (err: any) {
      throw new Error(err.message || "Gagal membuat nomor rujukan.");
    }
  };

  const handleUpdateSuratKeluar = async (id: string, data: Partial<SuratKeluar>) => {
    try {
      await updateSuratKeluarApi(id, data);
      await loadAllSystemData();
      showToast("Rincian naskah keluar berhasil dikoreksi.");
    } catch (err: any) {
      throw new Error(err.message || "Gagal memperbarui naskah.");
    }
  };

  const handleDeleteSuratKeluar = async (id: string) => {
    try {
      await deleteSuratKeluarApi(id);
      await loadAllSystemData();
      showToast("Arsip naskah keluar berhasil dibersihkan.", "error");
    } catch (err: any) {
      throw new Error(err.message || "Gagal menghapus naskah.");
    }
  };

  // User Management Admin wrappers
  const handleAddUser = async (data: any) => {
    try {
      await createUserApi(data);
      await loadAllSystemData();
      showToast(`Pengguna baru @${data.username} terdaftar.`);
    } catch (err: any) {
      throw new Error(err.message || "Gagal mendaftarkan user.");
    }
  };

  const handleUpdateUser = async (id: string, data: any) => {
    try {
      await updateUserApi(id, data);
      await loadAllSystemData();
      showToast("Profil atau otorisasi hak akun diperbarui.");
    } catch (err: any) {
      throw new Error(err.message || "Gagal mengubah profil user.");
    }
  };

  const handleDeleteUser = async (id: string, username: string) => {
    try {
      await deleteUserApi(id);
      await loadAllSystemData();
      showToast(`Pengguna @${username} berhasil dihapus dari sistem.`, "error");
    } catch (err: any) {
      throw new Error(err.message || "Gagal menghapus pengguna.");
    }
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin h-10 w-10 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-sm font-bold text-slate-500 font-display uppercase tracking-widest animate-pulse">
            Menghubungkan Sesi Dinas...
          </p>
        </div>
      </div>
    );
  }

  // View login screen if not authenticated
  if (!token || !currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row font-sans text-slate-805">
      
      {/* Desktop Sidebar (no-print) */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col shrink-0 min-h-screen no-print select-none">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            {config?.logo_url ? (
              <img src={config.logo_url} alt="Logo" className="w-8 h-8 object-contain rounded-lg" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold select-none font-display">
                {(config?.instansi_nama || "P").substring(0, 1)}
              </div>
            )}
            <div className="min-w-0">
              <span className="text-sm font-extrabold tracking-tight text-slate-950 block truncate leading-tight uppercase font-display">
                {config?.instansi_kode || "DISDIK-V"}
              </span>
              <span className="text-[9px] text-slate-400 font-mono tracking-wider font-extrabold block truncate">
                TATA NASKAH DIGITAL
              </span>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1">
          <button
            onClick={() => { setActiveTab("Dashboard"); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "Dashboard" 
                ? "bg-blue-50 text-blue-700 font-bold" 
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <LayoutDashboard className="h-5 w-5 shrink-0" />
            Beranda Utama
          </button>

          <button
            onClick={() => { setActiveTab("SuratMasuk"); setMobileMenuOpen(false); }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "SuratMasuk" 
                ? "bg-blue-50 text-blue-700 font-bold" 
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <span className="flex items-center gap-3">
              <Inbox className="h-5 w-5 shrink-0" />
              Surat Masuk
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${activeTab === "SuratMasuk" ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-500"}`}>
              {suratMasuk.length}
            </span>
          </button>

          <button
            onClick={() => { setActiveTab("SuratKeluar"); setMobileMenuOpen(false); }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "SuratKeluar" 
                ? "bg-blue-50 text-blue-700 font-bold" 
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <span className="flex items-center gap-3">
              <Send className="h-5 w-5 shrink-0" />
              Surat Keluar
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${activeTab === "SuratKeluar" ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-500"}`}>
              {suratKeluar.length}
            </span>
          </button>

          {currentUser.role === "Super Admin" && (
            <button
              onClick={() => { setActiveTab("ManajemenPengguna"); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "ManajemenPengguna" 
                  ? "bg-blue-50 text-blue-700 font-bold" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Users className="h-5 w-5 shrink-0" />
              Manajemen Pengguna
            </button>
          )}

          <button
            onClick={() => { setActiveTab("Pengaturan"); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "Pengaturan" 
                ? "bg-blue-50 text-blue-700 font-bold" 
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <SettingsIcon className="h-5 w-5 shrink-0" />
            Pengaturan &amp; Cloud (F04)
          </button>
        </nav>

        {/* Desktop Sidebar User Profile (no-print) */}
        <div className="p-4 border-t border-slate-100 mt-auto select-none">
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 border border-blue-200 flex items-center justify-center font-extrabold text-xs uppercase shrink-0">
              {currentUser.nama_lengkap.substring(0, 2)}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-extrabold text-slate-900 truncate leading-snug">{currentUser.nama_lengkap}</p>
              <p className="text-[10px] text-slate-400 font-semibold truncate mt-0.5 font-mono">@{currentUser.username}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Top Header Navbar (no-print) */}
      <div className="md:hidden flex h-16 items-center justify-between bg-white border-b border-slate-200 px-4 shrink-0 no-print sticky top-0 z-40 select-none">
        <div className="flex items-center gap-2">
          {config?.logo_url ? (
            <img src={config.logo_url} alt="Logo" className="w-8 h-8 object-contain rounded-lg" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold select-none font-display">
              {(config?.instansi_nama || "P").substring(0, 1)}
            </div>
          )}
          <div>
            <span className="font-extrabold text-slate-950 text-xs block leading-tight font-display tracking-tight uppercase">
              {config?.instansi_kode || "DISDIK-V"}
            </span>
            <span className="text-[8px] text-slate-400 font-mono tracking-wider font-extrabold block leading-none">
              TATA NASKAH DIGITAL
            </span>
          </div>
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1 px-2 border border-slate-200 rounded-lg bg-slate-50 hover:bg-slate-100 focus:outline-hidden cursor-pointer"
        >
          {mobileMenuOpen ? <X className="h-5 w-5 text-slate-705" /> : <Menu className="h-5 w-5 text-slate-705" />}
        </button>
      </div>

      {/* Mobile Navigation Drawer Dropdown Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden bg-white border-b border-slate-200 pb-5 px-4 absolute w-full top-16 left-0 z-30 shadow-lg no-print flex flex-col space-y-1.5 select-none"
          >
            <button
              onClick={() => { setActiveTab("Dashboard"); setMobileMenuOpen(false); }}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold ${
                activeTab === "Dashboard" ? "bg-blue-50 text-blue-700 font-bold" : "text-slate-500"
              }`}
            >
              <LayoutDashboard className="h-5 w-5 shrink-0" />
              Beranda Utama
            </button>
            <button
              onClick={() => { setActiveTab("SuratMasuk"); setMobileMenuOpen(false); }}
              className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-semibold ${
                activeTab === "SuratMasuk" ? "bg-blue-50 text-blue-700 font-bold" : "text-slate-500"
              }`}
            >
              <span className="flex items-center gap-3">
                <Inbox className="h-5 w-5 shrink-0" />
                Surat Masuk
              </span>
              <span className="font-bold text-[10px] bg-slate-100 px-2 py-0.5 rounded-full">{suratMasuk.length}</span>
            </button>
            <button
              onClick={() => { setActiveTab("SuratKeluar"); setMobileMenuOpen(false); }}
              className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-semibold ${
                activeTab === "SuratKeluar" ? "bg-blue-50 text-blue-700 font-bold" : "text-slate-500"
              }`}
            >
              <span className="flex items-center gap-3">
                <Send className="h-5 w-5 shrink-0" />
                Surat Keluar
              </span>
              <span className="font-bold text-[10px] bg-slate-100 px-2 py-0.5 rounded-full">{suratKeluar.length}</span>
            </button>
            {currentUser.role === "Super Admin" && (
              <button
                onClick={() => { setActiveTab("ManajemenPengguna"); setMobileMenuOpen(false); }}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold ${
                  activeTab === "ManajemenPengguna" ? "bg-blue-50 text-blue-700 font-bold" : "text-slate-500"
                }`}
              >
                <Users className="h-5 w-5 shrink-0" />
                Manajemen Pengguna
              </button>
            )}
            <button
              onClick={() => { setActiveTab("Pengaturan"); setMobileMenuOpen(false); }}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold ${
                activeTab === "Pengaturan" ? "bg-blue-50 text-blue-700 font-bold" : "text-slate-500"
              }`}
            >
              <SettingsIcon className="h-5 w-5 shrink-0" />
              Pengaturan &amp; Cloud (F04)
            </button>
            
            <div className="border-t border-slate-100 my-2 pt-3 flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-extrabold text-[11px] flex items-center justify-center">
                  {currentUser.nama_lengkap.substring(0, 2)}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 leading-normal">{currentUser.nama_lengkap}</p>
                  <p className="text-[9px] text-slate-400 font-mono">@{currentUser.username}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Right Area Panel */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC]">
        {/* Right Header Navigation Panel (no-print) */}
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-6 sm:px-8 no-print select-none shrink-0">
          <div>
            <h1 className="text-lg font-bold text-slate-900 font-display tracking-tight uppercase">
              {activeTab === "Dashboard" ? "Dasbor Statistik" :
               activeTab === "SuratMasuk" ? "Daftar Surat Masuk" :
               activeTab === "SuratKeluar" ? "Daftar Surat Keluar" :
               activeTab === "ManajemenPengguna" ? "Manajemen Pengguna" :
               "Pengaturan Global & Cloud"}
            </h1>
            <p className="hidden sm:block text-[11px] text-slate-400 mt-0.5">
              {activeTab === "Dashboard" ? "Analisis volume persuratan, sebaran status, dan audit trail log" :
               activeTab === "SuratMasuk" ? "Registrasi agenda surat masuk dinas, disposisi, dan scan lampiran arsip" :
               activeTab === "SuratKeluar" ? "Pola registrasi penomoran otomatis dinas, agenda surat naskah keluar" :
               activeTab === "ManajemenPengguna" ? "Manajemen kewenangan otorisasi per-peran akun pengguna (Super Admin)" :
               "Setelan kop naskah dinas, folder lampiran Drive, dan sinkronisasi Google Sheets"}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Sync Status Badge Indicator */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-mono text-slate-500 font-medium h-9">
              <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse shrink-0" />
              <span>Spreadsheet Sync: <strong className="text-emerald-600">Connected</strong></span>
            </div>

            {/* Sync Reload Button */}
            <button 
              onClick={loadAllSystemData}
              disabled={dataLoading}
              title="Pembaruan Data Instansi"
              className="p-2 h-9 w-9 flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 cursor-pointer transition-colors"
            >
              <RefreshCw className={`h-4.5 w-4.5 ${dataLoading ? 'animate-spin text-blue-600' : ''}`} />
            </button>

            {/* Sign Out Action Button */}
            <button
              onClick={handleLogout}
              title="Keluar dari Sistem"
              className="px-3.5 h-9 text-xs rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-semibold flex items-center gap-1.5 cursor-pointer border border-red-100/50 transition-colors"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </header>

        {/* Dynamic Main Workspace Content */}
        <main className="flex-1 p-6 sm:p-8 overflow-y-auto">
          
          {globalError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-xs font-medium text-red-800 anim-fade-in no-print">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
              <div className="flex-1">
                <strong>Kesalahan Sinkronisasi:</strong> {globalError}
              </div>
              <button 
                onClick={loadAllSystemData} 
                className="px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 duration-150 rounded-lg text-[10px] font-bold shrink-0 cursor-pointer"
              >
                Muat Ulang Data
              </button>
            </div>
          )}

          <div className="print-area">
            {/* Active View Router rendering */}
            {activeTab === "Dashboard" && (
              <Dashboard 
                suratMasuk={suratMasuk}
                suratKeluar={suratKeluar}
                logs={logs}
                currentUser={currentUser}
                onNavigateTo={(view) => setActiveTab(view)}
              />
            )}

            {activeTab === "SuratMasuk" && (
              <SuratMasukList 
                letters={suratMasuk}
                currentUser={currentUser}
                onAdd={handleAddSuratMasuk}
                onUpdate={handleUpdateSuratMasuk}
                onDelete={handleDeleteSuratMasuk}
              />
            )}

            {activeTab === "SuratKeluar" && (
              <SuratKeluarList 
                letters={suratKeluar}
                currentUser={currentUser}
                onAdd={handleAddSuratKeluar}
                onUpdate={handleUpdateSuratKeluar}
                onDelete={handleDeleteSuratKeluar}
                instansiKode={config?.instansi_kode || "DISDIK-V"}
              />
            )}

            {activeTab === "ManajemenPengguna" && (
              <UserManagement 
                users={users}
                currentUser={currentUser}
                onAddUser={handleAddUser}
                onUpdateUser={handleUpdateUser}
                onDeleteUser={handleDeleteUser}
              />
            )}

            {activeTab === "Pengaturan" && config && (
              <SettingsView 
                config={config}
                currentUser={currentUser}
                onConfigUpdate={(updated) => {
                  setConfig(updated);
                  loadAllSystemData();
                }}
              />
            )}
          </div>
        </main>

        <footer className="bg-white border-t border-slate-200 py-6 text-center text-[11px] text-slate-400 no-print select-none shrink-0 mt-auto">
          <div className="max-w-7xl mx-auto px-4">
            <p>Sistem Informasi Manajemen Persuratan Digital • Sekretariat Utama Kantor Dinas Pendidikan Pemuda &amp; Olahraga</p>
            <p className="mt-1 font-mono text-[9px] text-slate-300">Pola database cloud terintegrasi Google Spreadsheet API v4 • Cloud Environment v1.0.0</p>
          </div>
        </footer>
      </div>

      {/* Global Toast Alerts (no-print) */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 right-6 z-50 no-print font-sans"
          >
            <div className={`px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-bold border ${
              toast.type === "success" 
                ? "bg-slate-900 border-slate-800 text-white" 
                : "bg-red-600 border-red-700 text-white"
            }`}>
              {toast.type === "success" ? (
                <div className="h-5 w-5 bg-emerald-500 rounded-full flex items-center justify-center shrink-0">
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : (
                <AlertCircle className="h-5 w-5 shrink-0" />
              )}
              <span>{toast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
