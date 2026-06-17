/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { ConfigSettings, User } from "../types";
import { 
  Settings, 
  Database, 
  Lock, 
  RefreshCw, 
  Building, 
  Network, 
  HelpCircle, 
  CheckCircle, 
  AlertCircle,
  FileSpreadsheet
} from "lucide-react";
import { updateConfigApi, syncSheetApi, changePasswordApi } from "../lib/api";
import { googleSignIn, googleLogout, getAccessToken } from "../lib/firebaseAuth";
import { motion } from "motion/react";

interface SettingsProps {
  config: ConfigSettings;
  currentUser: Omit<User, 'password_hash'>;
  onConfigUpdate: (updated: ConfigSettings) => void;
}

const rawAppsScriptCode = `function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. Process files and upload to Google Drive if they are Base64
    var suratMasuk = data.surat_masuk || [];
    var folderId = data.drive_folder_id;
    
    for (var i = 0; i < suratMasuk.length; i++) {
      var sm = suratMasuk[i];
      if (sm.lampiran_url && sm.lampiran_url.indexOf('data:') === 0) {
        sm.lampiran_url = uploadFileToDrive(sm.lampiran_url, sm.lampiran_name || "lampiran_masuk.pdf", folderId);
      }
    }
    
    var suratKeluar = data.surat_keluar || [];
    for (var i = 0; i < suratKeluar.length; i++) {
      var sk = suratKeluar[i];
      if (sk.lampiran_url && sk.lampiran_url.indexOf('data:') === 0) {
        sk.lampiran_url = uploadFileToDrive(sk.lampiran_url, sk.lampiran_name || "lampiran_keluar.pdf", folderId);
      }
    }
    
    // 2. Ensure tabs exist and populate them
    writeToSheet(ss, "Surat Masuk", [
      ["ID", "No Agenda", "Tgl Terima", "No Surat", "Tgl Surat", "Pengirim", "Perihal", "Ditujukan", "Sifat", "Keterangan", "Status", "Dibuat Oleh", "Dibuat Pada", "Scan Lampiran Name", "Scan Lampiran URL", "Ukuran Lampiran (Bytes)"],
      ...suratMasuk.map(function(sm) {
        return [
          sm.id || "",
          sm.no_agenda || "",
          sm.tgl_terima || "",
          sm.no_surat || "",
          sm.tgl_surat || "",
          sm.pengirim || "",
          sm.perihal || "",
          sm.ditujukan || "",
          sm.sifat || "",
          sm.keterangan || "",
          sm.status || "",
          sm.dibuat_oleh || "",
          sm.dibuat_pada || "",
          sm.lampiran_name || "",
          sm.lampiran_url || "",
          sm.lampiran_size ? String(sm.lampiran_size) : ""
        ];
      })
    ]);

    writeToSheet(ss, "Surat Keluar", [
      ["ID", "No Surat", "Tgl Surat", "Tujuan", "Perihal", "Sifat", "Tgl Kirim", "Kirim Via", "Keterangan", "Status", "Dibuat Oleh", "Dibuat Pada", "Scan Lampiran Name", "Scan Lampiran URL", "Ukuran Lampiran (Bytes)"],
      ...suratKeluar.map(function(sk) {
        return [
          sk.id || "",
          sk.no_surat || "",
          sk.tgl_surat || "",
          sk.tujuan || "",
          sk.perihal || "",
          sk.sifat || "",
          sk.tgl_kirim || "",
          sk.via || "",
          sk.keterangan || "",
          sk.status || "",
          sk.dibuat_oleh || "",
          sk.dibuat_pada || "",
          sk.lampiran_name || "",
          sk.lampiran_url || "",
          sk.lampiran_size ? String(sk.lampiran_size) : ""
        ];
      })
    ]);

    writeToSheet(ss, "Pengguna", [
      ["ID", "Username", "Nama Lengkap", "Email", "Role", "Aktif", "Dibuat Pada"],
      ...(data.users || []).map(function(u) {
        return [
          u.id || "",
          u.username || "",
          u.nama_lengkap || "",
          u.email || "",
          u.role || "",
          u.aktif ? "Ya" : "Tidak",
          u.dibuat_pada || ""
        ];
      })
    ]);

    writeToSheet(ss, "Log Aktivitas", [
      ["ID", "User ID", "Username", "Aksi", "Modul", "Data ID", "Waktu"],
      ...(data.log_aktivitas || []).map(function(l) {
        return [
          l.id || "",
          l.user_id || "",
          l.username || "",
          l.aksi || "",
          l.modul || "",
          l.data_id || "",
          l.waktu || ""
        ];
      })
    ]);

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Sinkronisasi berhasil! Semua data & scan file tersalin ke Google Sheet dan Drive Anda.",
      rows_synced: {
        surat_masuk: suratMasuk.length,
        surat_keluar: suratKeluar.length,
        users: (data.users || []).length,
        log_aktivitas: (data.log_aktivitas || []).length
      }
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      message: "Error: " + e.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function writeToSheet(ss, sheetName, rows) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  sheet.clear();
  if (rows.length > 0) {
    sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
  }
}

function uploadFileToDrive(base64Data, fileName, folderId) {
  try {
    var contentType = base64Data.substring(5, base64Data.indexOf(';'));
    var bytes = Utilities.base64Decode(base64Data.split(',')[1]);
    var blob = Utilities.newBlob(bytes, contentType, fileName);
    var folder;
    if (folderId && folderId.trim().length > 0 && folderId.indexOf('---') === -1) {
      try {
        folder = DriveApp.getFolderById(folderId.trim());
      } catch(e) {
        folder = DriveApp.getRootFolder();
      }
    } else {
      folder = DriveApp.getRootFolder();
    }
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (e) {
    return "Gagal upload Drive: " + e.toString();
  }
}`;

export default function SettingsView({ config, currentUser, onConfigUpdate }: SettingsProps) {
  
  // States of spreadsheet configuration (only Super Admin can change)
  const [instansiNama, setInstansiNama] = useState(config.instansi_nama);
  const [instansiKode, setInstansiKode] = useState(config.instansi_kode);
  const [logoUrl, setLogoUrl] = useState(config.logo_url || "");
  const [targetSheetId, setTargetSheetId] = useState(config.target_sheet_id);
  const [driveFolderId, setDriveFolderId] = useState(config.drive_folder_id);
  const [formatSuratKeluar, setFormatSuratKeluar] = useState(config.format_surat_keluar);
  const [syncMethod, setSyncMethod] = useState<'oauth' | 'script'>(config.sync_method || 'script');
  const [appsScriptUrl, setAppsScriptUrl] = useState(config.apps_script_url || "");
  const [updating, setUpdating] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleLogoUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1.5 * 1024 * 1024) {
      alert("Ukuran berkas logo terlalu besar. Batas maksimal adalah 1.5 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setLogoUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // States of Google Sheets synchronizing
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [syncLoading, setSyncLoading] = useState(false);

  // Google OAuth connection states
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);

  useEffect(() => {
    // Attempt auto-recovery of accessToken if already signed in
    getAccessToken().then(tok => {
      if (tok) setGoogleToken(tok);
    });
  }, []);

  const handleConnectGoogle = async () => {
    setIsConnectingGoogle(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleToken(result.accessToken);
        setGoogleUser(result.user);
      }
    } catch (err: any) {
      alert("Gagal menyambungkan Google: " + (err.message || err));
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  const handleLogoutGoogle = async () => {
    await googleLogout();
    setGoogleToken(null);
    setGoogleUser(null);
  };

  // Password modify states (F04 - any user can ganti password sendiri)
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser.role !== "Super Admin") {
      alert("Akses ditolak: Hanya Super Admin yang dapat menala konfigurasi dasar sistem.");
      return;
    }

    setUpdating(true);
    setSuccessMsg(null);
    try {
      const updated = await updateConfigApi({
        instansi_nama: instansiNama.trim(),
        instansi_kode: instansiKode.toUpperCase().trim(),
        target_sheet_id: targetSheetId.trim(),
        drive_folder_id: driveFolderId.trim(),
        format_surat_keluar: formatSuratKeluar.trim(),
        sync_method: syncMethod,
        apps_script_url: appsScriptUrl.trim(),
        logo_url: logoUrl.trim()
      });
      onConfigUpdate(updated);
      setSuccessMsg("Pembaruan konfigurasi instansi & cloud berhasil disimpan.");
    } catch (err: any) {
      alert(err.message || "Gagal memperbarui konfigurasi.");
    } finally {
      setUpdating(false);
    }
  };

  const handleSyncSpreadsheet = async () => {
    if (syncMethod === 'oauth' && !googleToken) {
      alert("Hubungkan akun Google Anda terlebih dahulu sebelum mensinkronkan.");
      return;
    }
    if (syncMethod === 'script' && (!appsScriptUrl || appsScriptUrl.trim() === "" || appsScriptUrl.includes("---"))) {
      alert("Konfigurasikan dan simpan URL Aplikasi Web Google Apps Script Anda terlebih dahulu.");
      return;
    }
    setSyncLoading(true);
    setSyncStatus(null);
    try {
      const res = await syncSheetApi(syncMethod === 'oauth' ? googleToken || undefined : undefined);
      setSyncStatus({
        success: true,
        message: res.message,
        rows: res.rows_synced,
        time: new Date(res.timestamp || new Date()).toLocaleTimeString()
      });
    } catch (err: any) {
      setSyncStatus({
        success: false,
        message: err.message || "Gagal sinkronisasi dengan Google Sheet."
      });
    } finally {
      setSyncLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwSuccess(null);
    setPwError(null);

    if (!oldPassword || !newPassword || !confirmPassword) {
      setPwError("Kolom kata sandi tidak boleh kosong.");
      return;
    }

    if (newPassword.length < 6) {
      setPwError("Kata sandi baru minimal terdiri dari 6 karakter.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwError("Konfirmasi kata sandi baru tidak sesuai.");
      return;
    }

    setPwLoading(true);
    try {
      await changePasswordApi(oldPassword, newPassword);
      setPwSuccess("Kata sandi Anda berhasil diperbarui di server.");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPwError(err.message || "Gagal memperbarui password.");
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
      
      {/* 2/3 width for instansi and database configuration */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Instansi Config Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs space-y-6">
          <div className="border-b border-slate-50 pb-4">
            <h3 className="text-base font-bold text-slate-800 font-display flex items-center gap-2">
              <Building className="h-5 w-5 text-blue-600" />
              Identitas Satuan Kerja Instansi (Tata Naskah)
            </h3>
            <p className="text-xs text-slate-400">Atur kop dinas surat dan format penomoran agenda otomatis</p>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
            {successMsg && (
              <div className="p-3 bg-emerald-50 text-emerald-800 border-l-4 border-emerald-500 rounded-r-lg font-medium flex items-center gap-2">
                <CheckCircle className="h-4.5 w-4.5 text-emerald-600" />
                {successMsg}
              </div>
            )}

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Nama Instansi Dinas KOP Surat *</label>
              <input
                type="text"
                required
                disabled={currentUser.role !== "Super Admin"}
                value={instansiNama}
                onChange={(e) => setInstansiNama(e.target.value)}
                placeholder="Contoh: Dinas Pendidikan Provinsi Cabang Wilayah V"
                className="block w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 font-medium"
              />
            </div>

            {/* Logo Settings element */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col sm:flex-row items-center gap-4">
              <div className="w-16 h-16 bg-white rounded-xl border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo Instansi" className="w-full h-full object-contain p-1" referrerPolicy="no-referrer" />
                ) : (
                  <span className="text-[10px] text-slate-400 font-mono font-bold uppercase text-center leading-tight">Belum Ada Logo</span>
                )}
              </div>
              <div className="flex-1 space-y-2 w-full">
                <span className="block text-slate-700 font-bold text-xs">Logo Lambang Instansi</span>
                {currentUser.role === "Super Admin" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                    <div className="space-y-1">
                      <span className="block text-[10px] text-slate-500 font-medium">Unggah Berkas Gambar (PNG/JPG):</span>
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleLogoUploadChange}
                        className="block w-full text-[10px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="block text-[10px] text-slate-500 font-medium">Atau Tulis URL Gambar Langsung:</span>
                      <div className="flex gap-1.5">
                        <input 
                          type="text" 
                          value={logoUrl}
                          onChange={(e) => setLogoUrl(e.target.value)}
                          placeholder="https://example.com/logo.png"
                          className="flex-1 border border-slate-200 rounded-lg px-2 py-0.5 text-[10px] font-mono focus:ring-1 focus:ring-blue-500/20"
                        />
                        {logoUrl && (
                          <button 
                            type="button" 
                            onClick={() => setLogoUrl("")}
                            className="px-2 py-0.5 text-red-600 font-bold bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer text-[10px]"
                          >
                            Hapus
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 italic">Pengaturan logo instansi terkunci dibatasi untuk Super Admin.</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Kode Instansi *</label>
                <input
                  type="text"
                  required
                  disabled={currentUser.role !== "Super Admin"}
                  value={instansiKode}
                  onChange={(e) => setInstansiKode(e.target.value)}
                  placeholder="Contoh: DISDIK-V"
                  className="block w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Pola No. Surat Keluar (Konsep) *</label>
                <input
                  type="text"
                  required
                  disabled={currentUser.role !== "Super Admin"}
                  value={formatSuratKeluar}
                  onChange={(e) => setFormatSuratKeluar(e.target.value)}
                  placeholder="Contoh: {SEQ}/SK/{KODE}/{ROM}/{YYYY}"
                  className="block w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 font-mono"
                />
              </div>
            </div>

            {currentUser.role === "Super Admin" ? (
              <div className="flex items-center justify-end">
                <button
                  type="submit"
                  disabled={updating}
                  className="px-5 py-2 text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 font-bold rounded-xl flex items-center gap-1 cursor-pointer"
                >
                  {updating ? "Menyimpan..." : "Simpan Identitas Instansi"}
                </button>
              </div>
            ) : (
              <p className="text-[10px] text-slate-400 italic">Identitas instansi terkunci dibatasi untuk Super Admin.</p>
            )}
          </form>
        </div>

        {/* Database Google Sheet Connector Connector Panel */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs space-y-6">
          <div className="border-b border-slate-50 pb-4">
            <h3 className="text-base font-bold text-slate-800 font-display flex items-center gap-2">
              <Database className="h-5 w-5 text-indigo-600" />
              Integrasi Google Sheets Database (Cloud Storage)
            </h3>
            <p className="text-xs text-slate-400">Penyimpanan cloud terdistribusi tersinkronisasi 4 sheet (Surat Masuk, Surat Keluar, Pengguna, Log Aktivitas)</p>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-5 text-xs">
            
            <div className="space-y-2">
              <label className="block text-slate-700 font-bold">Pilih Metode Sinkronisasi Cloud:</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSyncMethod('script')}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${syncMethod === 'script' ? 'border-emerald-500 bg-emerald-50/50 text-emerald-950 ring-2 ring-emerald-500/10' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}
                >
                  <div className="font-bold text-[12px] flex items-center gap-1.5 text-emerald-900">
                    <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                    ⭐ Metode Google Apps Script (Rekomendasi!)
                  </div>
                  <div className="text-[10px] mt-1 text-slate-500 leading-normal">
                    Melompati verifikasi Google. 100% bebas error "Access Blocked / 403", mendukung semua akun (termasuk <span className="font-bold underline text-emerald-800">labslib@gmail.com</span>).
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSyncMethod('oauth')}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${syncMethod === 'oauth' ? 'border-indigo-500 bg-indigo-50/50 text-indigo-950 ring-2 ring-indigo-500/10' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}
                >
                  <div className="font-bold text-[12px] flex items-center gap-1.5 text-indigo-900">
                    <span className="flex h-2 w-2 rounded-full bg-indigo-500" />
                    Metode Google OAuth (Login Langsung)
                  </div>
                  <div className="text-[10px] mt-1 text-slate-500 leading-normal">
                    Memerlukan persetujuan masuk akun Google interaktif. Hanya bisa untuk developer-approved tester Google Cloud.
                  </div>
                </button>
              </div>
            </div>

            {syncMethod === 'script' ? (
              <div className="space-y-4 pt-1">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Google Apps Script Web App Deployment URL *</label>
                  <input
                    type="url"
                    required={syncMethod === 'script'}
                    disabled={currentUser.role !== "Super Admin"}
                    value={appsScriptUrl}
                    onChange={(e) => setAppsScriptUrl(e.target.value)}
                    placeholder="Contoh: https://script.google.com/macros/s/AKfycb.../exec"
                    className="block w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:ring-2 focus:ring-blue-500/20 font-mono"
                  />
                  <p className="mt-1 text-[10px] text-slate-500 leading-normal">
                    Salin URL deployment Aplikasi Web yang didapat setelah mempublikasi skrip di sheet Anda.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Google Drive Folder ID (Scan Lampiran) </label>
                    <input
                      type="text"
                      disabled={currentUser.role !== "Super Admin"}
                      value={driveFolderId}
                      onChange={(e) => setDriveFolderId(e.target.value)}
                      placeholder="Opsional - Masukkan ID folder Dropbox/Drive"
                      className="block w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 font-mono"
                    />
                    <p className="mt-1 text-[10px] text-slate-500">
                      ID Folder Cloud Drive untuk menampung unggah lampiran PDF.
                    </p>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Spreadsheet Target ID (Sebagai Referensi) </label>
                    <input
                      type="text"
                      disabled={currentUser.role !== "Super Admin"}
                      value={targetSheetId}
                      onChange={(e) => setTargetSheetId(e.target.value)}
                      placeholder="ID Spreadsheet..."
                      className="block w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 font-mono"
                    />
                    <p className="mt-1 text-[10px] text-slate-500">
                      ID file Google Sheets yang dipasangi Apps Script.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 border border-slate-150 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                    <h4 className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                      <HelpCircle className="h-4 w-4 text-emerald-600" />
                      Panduan Penghubungan Google Sheet Bebas Error 403:
                    </h4>
                    <span className="text-[9px] font-mono font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-sm">Untuk: labslib@gmail.com</span>
                  </div>
                  
                  <ol className="list-decimal pl-4 text-[11px] text-slate-600 space-y-2 leading-relaxed">
                    <li>Buka <strong>Google Sheet</strong> target milik Anda (login sebagai <span className="font-bold underline text-slate-800">labslib@gmail.com</span> di browser).</li>
                    <li>Pada menu atas sheet, klik <strong>Ekstensi (Extensions)</strong> &rarr; pilih <strong>Apps Script</strong>.</li>
                    <li>Hapus seluruh baris kode kosong bawaan editor, lalu <strong>salin &amp; tempel (copypaste)</strong> skrip di bawah ini sepenuhnya:</li>
                    
                    <div className="relative">
                      <textarea
                        readOnly
                        value={rawAppsScriptCode}
                        className="w-full h-32 p-2 bg-slate-950 text-slate-100 font-mono text-[9px] rounded-lg border border-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        onClick={(e) => (e.target as any).select()}
                      />
                      <div className="text-[10px] text-indigo-600 font-semibold mt-0.5">💡 Tip: Klik teks hitam di atas, lalu tekan <kbd className="bg-slate-200 px-1 py-0.5 rounded font-mono text-[9px]">Ctrl+A</kbd> setelah itu <kbd className="bg-slate-200 px-1 py-0.5 rounded font-mono text-[9px]">Ctrl+C</kbd> untuk menyalin kodenya.</div>
                    </div>

                    <li>Klik ikon <strong>Simpan (ikon Disket)</strong> di bilah atas Apps Script editor Anda.</li>
                    <li>Klik opsi <strong>Terapkan (Deploy)</strong> di samping kanan &rarr; pilih <strong>Penerapan baru (New deployment)</strong>.</li>
                    <li>Di dalam bilah popup kiri, klik ikon gerigi (Settings) &rarr; pilih tipe <strong>Aplikasi web (Web app)</strong>.</li>
                    <li>Atur parameternya:
                      <ul className="list-disc pl-4 mt-1 space-y-1 text-slate-500">
                        <li>Deskripsi: <span className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[9px] text-slate-700">Sinkronisasi Dinas</span></li>
                        <li>Jalankan sebagai (Execute as): <strong>Saya sendiri (Me - labslib@gmail.com)</strong></li>
                        <li>Siapa yang memiliki akses (Who has access): <strong className="text-emerald-700">Siapa saja (Anyone)</strong> &lt;-- <span className="font-bold text-red-500">wajib dipilih agar database bisa mem-POST data!</span></li>
                      </ul>
                    </li>
                    <li>Klik <strong>Terapkan (Deploy)</strong>. Jika meminta persetujuan akses, berikan otorisasi akun Google Anda &rarr; klik <strong>Advanced / Lanjutan</strong> &rarr; klik <strong>Go to ... (unsafe)</strong> &rarr; klik <strong>Allow / Izinkan</strong>.</li>
                    <li>Salin string <strong>URL Aplikasi Web (Web App URL)</strong> yang dimunculkan (format url diakhiri <span className="font-mono text-indigo-700 font-bold">/exec</span>) kemudian tempelkan pada kolom input di atas.</li>
                    <li>Klik tombol <strong>Simpan Pengaturan Cloud</strong> di bawah!</li>
                  </ol>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Spreadsheet Target ID *</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 font-mono">
                      ID
                    </span>
                    <input
                      type="text"
                      required={syncMethod === 'oauth'}
                      disabled={currentUser.role !== "Super Admin"}
                      value={targetSheetId}
                      onChange={(e) => setTargetSheetId(e.target.value)}
                      placeholder="Masukkan Google Sheets ID unik..."
                      className="block w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs focus:ring-2 focus:ring-blue-500/20 font-mono"
                    />
                  </div>
                  <p className="mt-1.5 text-[10px] text-slate-500 leading-relaxed">
                    Masukkan ID saja (kode teks panjang antara <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-indigo-700 text-[9px]">/d/</code> dan <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-indigo-700 text-[9px]">/edit</code>).
                  </p>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Google Drive Folder ID (Lampiran) *</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 font-mono">
                      ID
                    </span>
                    <input
                      type="text"
                      required={syncMethod === 'oauth'}
                      disabled={currentUser.role !== "Super Admin"}
                      value={driveFolderId}
                      onChange={(e) => setDriveFolderId(e.target.value)}
                      placeholder="ID Folder penyimpanan scan lampiran..."
                      className="block w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs focus:ring-2 focus:ring-blue-500/20 font-mono"
                    />
                  </div>
                  <p className="mt-1.5 text-[10px] text-slate-500 leading-relaxed">
                    Masukkan kode ID folder saja (setelah <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-emerald-700 text-[9px]">/folders/</code>).
                  </p>
                </div>
              </div>
            )}

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-150 space-y-2">
              <span className="font-bold text-[10px] text-slate-400 uppercase tracking-widest block font-mono">Ketentuan Keamanan Multi-akun</span>
              <ul className="list-disc pl-4 text-[11px] text-slate-500 space-y-1.5 leading-normal">
                <li>Seluruh pertukaran JSON data cloud dienkripsi menggunakan protokol HTTPS aman SSL.</li>
                <li>Hanya pengguna dengan kewenangan <strong>Super Admin &amp; Admin</strong> yang diizinkan menginstruksikan sinkronisasi database.</li>
              </ul>
            </div>

            {currentUser.role === "Super Admin" ? (
              <div className="flex items-center justify-end">
                <button
                  type="submit"
                  disabled={updating}
                  className="px-5 py-2 text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 font-bold rounded-xl flex items-center gap-1 cursor-pointer text-xs"
                >
                  {updating ? "Menyimpan..." : "Simpan Pengaturan Cloud"}
                </button>
              </div>
            ) : null}
          </form>
        </div>

      </div>

      {/* 1/3 width for sync status and self-service password modify */}
      <div className="space-y-6">
        
        {/* Active synchronizer module (F27) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs space-y-5">
          <div className="border-b border-slate-50 pb-3">
            <h3 className="text-base font-bold text-slate-800 font-display flex items-center gap-1.5">
              <Network className="h-5 w-5 text-emerald-600" />
              Kanal Sinkronisasi
            </h3>
            <p className="text-xs text-slate-400">Sinkronisasi data ke Google Sheets Cloud</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Metode Aktif:</span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${syncMethod === 'script' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-indigo-50 text-indigo-700 border border-indigo-100'}`}>
                {syncMethod === 'script' ? 'Google Apps Script' : 'Google OAuth API'}
              </span>
            </div>

            {syncMethod === 'script' ? (
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] leading-relaxed text-slate-600">
                  <div className="font-bold text-slate-800 flex items-center gap-1 mb-1">
                    <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                    Apps Script Siap Kirim
                  </div>
                  Data dikirim langsung dari server kami ke Aplikasi Web Google Apps Script Anda (<span className="font-bold underline text-indigo-700 font-mono text-[9px]">{currentUser.email === "dnyrha@gmail.com" ? "labslib@gmail.com" : currentUser.email}</span>).
                </div>

                <button
                  type="button"
                  disabled={syncLoading}
                  onClick={handleSyncSpreadsheet}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs hover:shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${syncLoading ? 'animate-spin' : ''}`} />
                  {syncLoading ? "Mengirim ke Apps Script..." : "Sinkronkan Sekarang"}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">Status Google Auth:</span>
                  {googleToken ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 select-none">
                      <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      Terhubung
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100 select-none">
                      <span className="h-1.5 w-1.5 bg-amber-500 rounded-full" />
                      Koneksi Terputus
                    </span>
                  )}
                </div>

                {!googleToken ? (
                  <button
                    type="button"
                    disabled={isConnectingGoogle}
                    onClick={handleConnectGoogle}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-xs hover:shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    <svg className="h-4 w-4 fill-current shrink-0" viewBox="0 0 24 24">
                      <path d="M21.35 11.1H12v2.7h5.38c-.24 1.28-.96 2.37-2.04 3.1v2.57h3.3c1.93-1.78 3.04-4.4 3.04-7.57 0-.58-.05-1.15-.13-1.8z" fill="#FFFFFF"/>
                      <path d="M12 21c2.43 0 4.47-.8 5.96-2.18l-3.3-2.57c-.9.6-2.07.97-3.66.97-2.81 0-5.2-1.9-6.05-4.45H1.54v2.66C3.07 19.16 7.23 21 12 21z" fill="#FFFFFF"/>
                      <path d="M5.95 12.77c-.22-.65-.35-1.35-.35-2.07s.13-1.42.35-2.07V5.97H1.54C.56 7.93 0 10.11 0 12.42s.56 4.49 1.54 6.45l4.41-3.11c-.85-2.55-.85-4.54 0-5.99z" fill="#FFFFFF"/>
                      <path d="M12 5.38c1.32 0 2.5.45 3.44 1.35l2.58-2.58C16.46 2.72 14.43 2 12 2 7.23 2 3.07 3.84 1.54 7.5l4.41 3.1C6.8 8.05 9.19 5.38 12 5.38z" fill="#FFFFFF"/>
                    </svg>
                    {isConnectingGoogle ? "Menghubungkan..." : "Hubungkan Akun Google"}
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-[11px]">
                      <div className="truncate font-medium text-slate-700">
                        Akun: <span className="font-bold font-mono">{googleUser?.email || "Akun Terhubung"}</span>
                      </div>
                      <button 
                        type="button" 
                        onClick={handleLogoutGoogle}
                        className="text-red-600 hover:text-red-700 font-bold ml-2 shrink-0"
                      >
                        Logout
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={syncLoading}
                      onClick={handleSyncSpreadsheet}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs hover:shadow-md transition-all cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`h-4 w-4 ${syncLoading ? 'animate-spin' : ''}`} />
                      {syncLoading ? "Mendata & Sinkronisasi..." : "Sinkronkan Data Sekarang"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {syncStatus && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`p-3.5 rounded-xl text-xs space-y-2 border ${
                  syncStatus.success 
                    ? "bg-emerald-50 text-emerald-950 border-emerald-100" 
                    : "bg-red-50 text-red-950 border-red-100"
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold">
                  {syncStatus.success ? (
                    <CheckCircle className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4.5 w-4.5 text-red-600 shrink-0" />
                  )}
                  {syncStatus.success ? "Sinkronisasi Sukses" : "Sinkronisasi Gagal"}
                </div>
                <p className="leading-relaxed text-[11px] text-slate-600 font-medium text-left">{syncStatus.message}</p>
                {syncStatus.success && syncStatus.rows && (
                  <div className="border-t border-slate-200/50 pt-2 text-[10px] font-mono space-y-1 text-slate-500 text-left">
                    <div>Waktu: <strong>{syncStatus.time} WIB</strong></div>
                    <div>• Surat Masuk: <strong>{syncStatus.rows.surat_masuk ?? 0} baris</strong></div>
                    <div>• Surat Keluar: <strong>{syncStatus.rows.surat_keluar ?? 0} baris</strong></div>
                    <div>• Pengguna: <strong>{syncStatus.rows.users ?? 0} baris</strong></div>
                    <div>• Log: <strong>{syncStatus.rows.log_aktivitas ?? 0} baris</strong></div>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>

        {/* Change Account Password (F04) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs space-y-5">
          <div className="border-b border-slate-50 pb-3">
            <h3 className="text-base font-bold text-slate-800 font-display flex items-center gap-1.5">
              <Lock className="h-5 w-5 text-amber-600" />
              Ubah Sandi Akun (F04)
            </h3>
            <p className="text-xs text-slate-400">Ganti password masuk akun mandiri di sistem</p>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
            {pwSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-lg flex items-center gap-1.5 font-medium">
                <CheckCircle className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                {pwSuccess}
              </div>
            )}
            {pwError && (
              <div className="p-3 bg-red-50 text-red-800 border border-red-100 rounded-lg flex items-center gap-1.5 font-medium">
                <AlertCircle className="h-4.5 w-4.5 text-red-650 shrink-0" />
                {pwError}
              </div>
            )}

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Sandi Lama *</label>
              <input
                type="password"
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Masukkan sandi saat ini"
                className="block w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Sandi Baru *</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="block w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Konfirmasi Sandi Baru *</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ketik ulang sandi baru"
                className="block w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={pwLoading}
              className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {pwLoading ? "Mengubah..." : "Perbarui Kata Sandi"}
            </button>
          </form>
        </div>

      </div>

    </div>
  );
}
