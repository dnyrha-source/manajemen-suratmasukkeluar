/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { loginApi, getPublicConfigApi } from "../lib/api";
import { Lock, Mail, User as UserIcon, AlertCircle, Sparkles } from "lucide-react";
import { motion } from "motion/react";

interface LoginProps {
  onLoginSuccess: (token: string, user: any) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publicConfig, setPublicConfig] = useState<{ instansi_nama: string; instansi_kode: string; logo_url?: string } | null>(null);

  useEffect(() => {
    getPublicConfigApi()
      .then(setPublicConfig)
      .catch((err) => console.error("Error loading public config for login branding:", err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Username dan Password wajib diisi.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await loginApi(username.trim(), password);
      localStorage.setItem("surat_auth_token", data.token);
      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message || "Gagal masuk. Silakan periksa kembali kredensial Anda.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          {publicConfig?.logo_url ? (
            <div className="h-16 w-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center p-2 shadow-xs select-none overflow-hidden">
              <img src={publicConfig.logo_url} alt="Logo Instansi" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            </div>
          ) : (
            <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center border border-blue-500 shadow-xs select-none">
              <Mail className="h-6 w-6 text-white" />
            </div>
          )}
        </div>
        <h2 className="mt-5 text-center text-xl font-extrabold tracking-tight text-slate-950 font-display uppercase">
          {publicConfig?.instansi_nama || "PERSURATAN DINAS DIGITAL"}
        </h2>
        <p className="mt-1.5 text-center text-xs text-slate-450 tracking-wide font-medium font-mono uppercase">
          {publicConfig?.instansi_kode ? `SISTEM PERSURATAN & DISPOSISI • ${publicConfig.instansi_kode}` : "ORGANIZER PERSURATAN & DISPOSISI CLOUD"}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="bg-white py-8 px-6 border border-slate-200 rounded-2xl sm:px-10 shadow-xs"
        >
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-red-50 border border-red-200 p-3 rounded-xl flex items-start gap-2.5"
              >
                <AlertCircle className="h-4.5 w-4.5 text-red-650 shrink-0 mt-0.5" />
                <span className="text-xs text-red-800 font-bold leading-normal">{error}</span>
              </motion.div>
            )}

            <div>
              <label htmlFor="username" className="block text-[10px] font-extrabold text-slate-450 uppercase tracking-widest font-mono">
                Akun Pengguna (Username)
              </label>
              <div className="mt-1 relative rounded-xl">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <UserIcon className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-600 focus:ring-0 text-xs text-slate-800 transition-all bg-slate-50/50 hover:bg-slate-50 focus:bg-white font-medium"
                  placeholder="Isikan username anda"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-[10px] font-extrabold text-slate-450 uppercase tracking-widest font-mono">
                Kata Sandi (Password)
              </label>
              <div className="mt-1 relative rounded-xl">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-hidden focus:border-blue-600 focus:ring-0 text-xs text-slate-800 transition-all bg-slate-50/50 hover:bg-slate-50 focus:bg-white font-medium"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer uppercase tracking-wider"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Otorisasi Akun...
                  </span>
                ) : (
                  "Masuk ke Sistem"
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>

      <div className="mt-8 text-center text-[10px] text-slate-400 font-semibold font-mono tracking-wider select-none uppercase">
        SISTEM TATA KELOLA PERSURATAN DINAS DIGITAL • REVENUE v1.0.0
      </div>
    </div>
  );
}
