/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { 
  SuratMasuk, 
  SuratKeluar, 
  ActivityLog, 
  User 
} from "../types";
import { 
  Inbox, 
  Send, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  History, 
  FileText, 
  UserCheck 
} from "lucide-react";
import { motion } from "motion/react";

interface DashboardProps {
  suratMasuk: SuratMasuk[];
  suratKeluar: SuratKeluar[];
  logs: ActivityLog[];
  currentUser: Omit<User, 'password_hash'>;
  onNavigateTo: (view: string) => void;
}

export default function Dashboard({ 
  suratMasuk, 
  suratKeluar, 
  logs, 
  currentUser,
  onNavigateTo 
}: DashboardProps) {
  
  // Calculate statistics
  const totalMasuk = suratMasuk.length;
  const totalKeluar = suratKeluar.length;
  const totalKeseluruhan = totalMasuk + totalKeluar;

  // Monthly stats helper
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`; // "2026-06"
  
  const masukBulanIni = suratMasuk.filter(s => s.dibuat_pada.startsWith(currentMonthStr)).length;
  const keluarBulanIni = suratKeluar.filter(s => s.dibuat_pada.startsWith(currentMonthStr)).length;

  // Group by status (Masuk & Keluar)
  const statusMasuk = {
    Baru: suratMasuk.filter(s => s.status === "Baru").length,
    Proses: suratMasuk.filter(s => s.status === "Proses").length,
    Selesai: suratMasuk.filter(s => s.status === "Selesai").length
  };

  const statusKeluar = {
    Draft: suratKeluar.filter(s => s.status === "Draft").length,
    Terkirim: suratKeluar.filter(s => s.status === "Terkirim").length,
    Diterima: suratKeluar.filter(s => s.status === "Diterima").length
  };

  // Combine newest 10 letters
  const combinedRecent = [
    ...suratMasuk.map(s => ({
      id: s.id,
      type: "Masuk" as const,
      no_agenda: s.no_agenda,
      no_surat: s.no_surat,
      perihal: s.perihal,
      pengirim_tujuan: s.pengirim,
      status: s.status,
      timestamp: s.dibuat_pada,
      sifat: s.sifat
    })),
    ...suratKeluar.map(s => ({
      id: s.id,
      type: "Keluar" as const,
      no_agenda: s.no_surat, // acts as key identifier
      no_surat: s.no_surat,
      perihal: s.perihal,
      pengirim_tujuan: s.tujuan,
      status: s.status,
      timestamp: s.dibuat_pada,
      sifat: s.sifat
    }))
  ]
  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  .slice(0, 10);

  // Parse letters monthly for F41 Monthly Chart (Jan-Dec)
  const monthlyData = [
    { name: "Jan", masuk: 0, keluar: 0 },
    { name: "Feb", masuk: 0, keluar: 0 },
    { name: "Mar", masuk: 0, keluar: 0 },
    { name: "Apr", masuk: 0, keluar: 0 },
    { name: "Mei", masuk: 0, keluar: 0 },
    { name: "Jun", masuk: 0, keluar: 0 },
    { name: "Jul", masuk: 0, keluar: 0 },
    { name: "Agu", masuk: 0, keluar: 0 },
    { name: "Sep", masuk: 0, keluar: 0 },
    { name: "Okt", masuk: 0, keluar: 0 },
    { name: "Nov", masuk: 0, keluar: 0 },
    { name: "Des", masuk: 0, keluar: 0 }
  ];

  // Calculate monthly distributions
  suratMasuk.forEach(s => {
    const d = new Date(s.tgl_surat);
    if (!isNaN(d.getTime())) {
      const m = d.getMonth();
      monthlyData[m].masuk += 1;
    }
  });

  suratKeluar.forEach(s => {
    const d = new Date(s.tgl_surat);
    if (!isNaN(d.getTime())) {
      const m = d.getMonth();
      monthlyData[m].keluar += 1;
    }
  });

  // Dynamic maximum value for chart heights calculation
  const maxVal = Math.max(...monthlyData.map(m => m.masuk + m.keluar), 5);

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Welcome Banner - Clean Custom Card */}
      <div className="bg-white border border-slate-205 rounded-2xl p-6 sm:p-8 text-slate-800 relative overflow-hidden flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="relative z-10 space-y-3 flex-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200 rounded-full text-[10px] font-bold text-slate-400 font-mono select-none">
            <UserCheck className="h-3 w-3 text-slate-400" />
            HAK AKSES / PERAN: <span className="text-blue-650 font-extrabold">{currentUser.role}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold font-display tracking-tight text-slate-950 uppercase leading-normal">
            Selamat Datang, {currentUser.nama_lengkap}!
          </h1>
          <p className="text-slate-500 max-w-xl text-xs sm:text-sm leading-relaxed">
            Anda login sebagai <span className="font-semibold text-slate-800 font-mono">@{currentUser.username}</span>. Gunakan panel navigasi di sebelah kiri untuk mengelola pencatatan surat masuk, disposisi jabatan, serta pencatatan surat keluar dinas.
          </p>
        </div>
        <div className="flex items-center gap-2 md:self-center shrink-0">
          <button 
            onClick={() => onNavigateTo("SuratMasuk")}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap"
          >
            Registrasi Surat Masuk
          </button>
          <button 
            onClick={() => onNavigateTo("SuratKeluar")}
            className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-705 border border-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap"
          >
            Naskah Baru
          </button>
        </div>
      </div>

      {/* Ringkasan Surat Stats Grid (F40) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex items-center gap-5 hover:border-slate-350 transition-all">
          <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 border border-blue-100">
            <Inbox className="h-6 w-6" />
          </div>
          <div className="space-y-1 min-w-0">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block font-mono">Surat Masuk</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-905 tracking-tight">{totalMasuk}</span>
              <span className="text-[10px] text-blue-600 font-extrabold font-mono bg-blue-50 px-2 py-0.5 rounded-md">+{masukBulanIni} Bln Ini</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex items-center gap-5 hover:border-slate-350 transition-all">
          <div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600 shrink-0 border border-slate-200/60">
            <Send className="h-6 w-6" />
          </div>
          <div className="space-y-1 min-w-0">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block font-mono">Surat Keluar</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-905 tracking-tight">{totalKeluar}</span>
              <span className="text-[10px] text-slate-500 font-extrabold font-mono bg-slate-50 px-2 py-0.5 rounded-md">+{keluarBulanIni} Bln Ini</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex items-center gap-5 hover:border-slate-350 transition-all">
          <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0 border border-emerald-100">
            <FileText className="h-6 w-6" />
          </div>
          <div className="space-y-1 min-w-0">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block font-mono">Arsip Keseluruhan</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-905 tracking-tight">{totalKeseluruhan}</span>
              <span className="text-[10px] text-emerald-600 font-extrabold font-mono bg-emerald-50 px-2 py-0.5 rounded-md">Total Arsip</span>
            </div>
          </div>
        </div>
      </div>

      {/* Graphs Block (F41 & F42) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* F41: Grafik Bulanan jumlah surat (2/3 width) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900 font-display uppercase tracking-tight">Grafik Bulanan Volume Surat</h3>
              <p className="text-xs text-slate-400">Total sebaran surat dinas masuk dan keluar sepanjang tahun 2026</p>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-bold font-mono">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-600" /> MASUK</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-slate-400" /> KELUAR</span>
            </div>
          </div>

          {/* Bar Chart Representation using Native Flexible SVG */}
          <div className="h-64 flex items-end justify-between gap-1 pt-6 px-2 border-b border-l border-slate-200">
            {monthlyData.map((month, idx) => {
              const maxBarHeight = 160; // pixels
              const masukHeight = maxVal > 0 ? (month.masuk / maxVal) * maxBarHeight : 0;
              const keluarHeight = maxVal > 0 ? (month.keluar / maxVal) * maxBarHeight : 0;

              return (
                <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                  {/* Tooltip on Hover */}
                  <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 bg-slate-900 text-white rounded-lg text-[10px] p-2.5 shadow-md w-28 text-center -translate-y-1 border border-slate-800">
                    <p className="font-bold border-b border-slate-800 pb-1 mb-1 font-mono uppercase">{month.name} 2026</p>
                    <p>Surat Masuk: {month.masuk}</p>
                    <p>Surat Keluar: {month.keluar}</p>
                  </div>

                  {/* Twin bars */}
                  <div className="w-full flex justify-center items-end gap-1 px-0.5">
                    {/* Masuk Bar */}
                    <div 
                      style={{ height: `${masukHeight || 4}px` }}
                      className={`w-3.5 sm:w-4.5 rounded-t-sm transition-all duration-500 ${month.masuk > 0 ? 'bg-blue-600 group-hover:bg-blue-700' : 'bg-slate-100'}`}
                    />
                    {/* Keluar Bar */}
                    <div 
                      style={{ height: `${keluarHeight || 4}px` }}
                      className={`w-3.5 sm:w-4.5 rounded-t-sm transition-all duration-500 ${month.keluar > 0 ? 'bg-slate-400 group-hover:bg-slate-500' : 'bg-slate-100'}`}
                    />
                  </div>

                  {/* Label */}
                  <span className="text-[10px] font-bold text-slate-400 mt-2 block font-mono uppercase">{month.name}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* F42: Status Overview Distribution (1/3 width) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-205 shadow-xs space-y-6">
          <div className="space-y-1 border-b border-slate-100 pb-4">
            <h3 className="text-sm font-bold text-slate-900 font-display uppercase tracking-tight">Tinjauan Alur Status</h3>
            <p className="text-xs text-slate-400">Distribusi status tindak lanjut dan disposisi arsip</p>
          </div>

          <div className="space-y-5">
            {/* Status Masuk Lists */}
            <div className="space-y-3.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Alur Surat Masuk</span>
              
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" /> Baru</span>
                  <span className="text-slate-700 font-mono font-bold text-[11px] bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{statusMasuk.Baru}</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div style={{ width: `${totalMasuk > 0 ? (statusMasuk.Baru / totalMasuk) * 100 : 0}%` }} className="bg-amber-500 h-full rounded-full" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-600" /> Diproses (Disposisi)</span>
                  <span className="text-slate-700 font-mono font-bold text-[11px] bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{statusMasuk.Proses}</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div style={{ width: `${totalMasuk > 0 ? (statusMasuk.Proses / totalMasuk) * 100 : 0}%` }} className="bg-blue-600 h-full rounded-full" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-600" /> Selesai Arsip</span>
                  <span className="text-slate-700 font-mono font-bold text-[11px] bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{statusMasuk.Selesai}</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div style={{ width: `${totalMasuk > 0 ? (statusMasuk.Selesai / totalMasuk) * 100 : 0}%` }} className="bg-emerald-600 h-full rounded-full" />
                </div>
              </div>
            </div>

            {/* Status Keluar Lists */}
            <div className="space-y-3.5 border-t border-slate-100 pt-4.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Status Surat Keluar</span>
              
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-50/50 p-2 text-center rounded-xl border border-slate-100">
                  <span className="text-[9px] font-bold text-slate-400 block font-mono">DRAFT</span>
                  <span className="text-sm font-extrabold text-slate-800 font-mono">{statusKeluar.Draft}</span>
                </div>
                <div className="bg-blue-50/50 p-2 text-center rounded-xl border border-blue-100">
                  <span className="text-[9px] font-extrabold text-blue-500 block font-mono">TERKIRIM</span>
                  <span className="text-sm font-extrabold text-blue-700 font-mono">{statusKeluar.Terkirim}</span>
                </div>
                <div className="bg-emerald-50/50 p-2 text-center rounded-xl border border-emerald-100">
                  <span className="text-[9px] font-extrabold text-emerald-500 block font-mono">DITERIMA</span>
                  <span className="text-sm font-extrabold text-emerald-700 font-mono">{statusKeluar.Diterima}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Log and Recents container (F43 & F44) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* F43: Surat Terbaru (10 entries) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-2 uppercase tracking-tight">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                Daftar 10 Surat Terbaru
              </h3>
              <p className="text-xs text-slate-400">Aktualisasi dari records surat masuk & keluar terakhir</p>
            </div>
          </div>

          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto pr-1">
            {combinedRecent.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 font-mono">Belum ada surat yang terdaftar.</div>
            ) : (
              combinedRecent.map((letter) => (
                <div key={`${letter.type}-${letter.id}`} className="py-3 flex items-start gap-3.5 hover:bg-slate-50/40 rounded-xl p-2 transition-colors border border-transparent hover:border-slate-100">
                  <div className={`mt-0.5 shrink-0 p-2 rounded-lg border ${letter.type === "Masuk" ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-slate-50 text-slate-700 border-slate-205"}`}>
                    {letter.type === "Masuk" ? <Inbox className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold font-mono text-slate-900 truncate">{letter.no_surat}</span>
                      <span className={`text-[8px] px-2 py-0.5 rounded-full font-extrabold select-none shrink-0 font-mono uppercase border ${
                        letter.sifat === "Penting" ? "bg-red-50 text-red-700 border-red-100" : 
                        letter.sifat === "Rahasia" ? "bg-purple-50 text-purple-700 border-purple-100" : 
                        "bg-slate-50 text-slate-650 border-slate-150"
                      }`}>
                        {letter.sifat}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-800 line-clamp-1 leading-snug">{letter.perihal}</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold font-mono uppercase mt-1">
                      <span className="truncate max-w-[140px] block text-slate-400 normal-case font-sans">
                        {letter.type === "Masuk" ? `Dari: ${letter.pengirim_tujuan}` : `Ke: ${letter.pengirim_tujuan}`}
                      </span>
                      <span>
                        {new Date(letter.timestamp).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* F44: Log Aktivitas Audit trail */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="space-y-1 border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-2 uppercase tracking-tight">
              <History className="h-4 w-4 text-slate-600" />
              Log Riwayat Aktivitas Pengguna
            </h3>
            <p className="text-xs text-slate-400">Catatan audit log aktivitas penulisan serta perubahan sistem</p>
          </div>

          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto pr-1">
            {logs.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 font-mono">Belum ada riwayat terekam.</div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="py-3 flex items-start gap-3 hover:bg-slate-50/40 rounded-xl p-2 transition-colors border border-transparent hover:border-slate-100">
                  <div className="h-8 w-8 rounded-full bg-slate-50 text-slate-605 border border-slate-200 flex items-center justify-center shrink-0 font-extrabold text-[10px] select-none uppercase font-mono">
                    {log.username.substring(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-xs text-slate-700 leading-normal font-medium">
                      <span className="font-extrabold text-slate-900">@{log.username}</span> {log.aksi}
                    </p>
                    <div className="flex items-center gap-3 text-[9px] text-slate-400 font-extrabold font-mono uppercase">
                      <span className="bg-slate-50 border border-slate-150 text-slate-500 px-1.5 py-0.5 rounded font-bold font-sans">
                        {log.modul}
                      </span>
                      <span>
                        {new Date(log.waktu).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit"
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
