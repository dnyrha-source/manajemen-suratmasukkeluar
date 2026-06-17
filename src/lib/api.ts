/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  User, 
  SuratMasuk, 
  SuratKeluar, 
  ActivityLog, 
  ConfigSettings 
} from "../types";

const getHeaders = () => {
  const token = localStorage.getItem("surat_auth_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {})
  };
};

export async function loginApi(username: string, password: string) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Gagal Login");
  }
  return res.json();
}

export async function logoutApi() {
  await fetch("/api/auth/logout", {
    method: "POST",
    headers: getHeaders()
  });
  localStorage.removeItem("surat_auth_token");
}

export async function changePasswordApi(oldPassword: string, newPassword: string) {
  const res = await fetch("/api/auth/change-password", {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ oldPassword, newPassword })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Gagal mengubah password");
  }
  return res.json();
}

export async function getUsersApi(): Promise<User[]> {
  const res = await fetch("/api/users", { headers: getHeaders() });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Gagal mengambil data user");
  }
  return res.json();
}

export async function createUserApi(data: Partial<User> & { password?: string }): Promise<User> {
  const res = await fetch("/api/users", {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Gagal membuat user");
  }
  return res.json();
}

export async function updateUserApi(id: string, data: Partial<User> & { password?: string }): Promise<User> {
  const res = await fetch(`/api/users/${id}`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Gagal memperbarui user");
  }
  return res.json();
}

export async function deleteUserApi(id: string): Promise<void> {
  const res = await fetch(`/api/users/${id}`, {
    method: "DELETE",
    headers: getHeaders()
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Gagal menghapus pengguna");
  }
}

export async function getSuratMasukApi(): Promise<SuratMasuk[]> {
  const res = await fetch("/api/surat-masuk", { headers: getHeaders() });
  if (!res.ok) throw new Error("Gagal mengambil data surat masuk");
  return res.json();
}

export async function createSuratMasukApi(data: Partial<SuratMasuk>): Promise<SuratMasuk> {
  const res = await fetch("/api/surat-masuk", {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Gagal membuat surat masuk");
  }
  return res.json();
}

export async function updateSuratMasukApi(id: string, data: Partial<SuratMasuk>): Promise<SuratMasuk> {
  const res = await fetch(`/api/surat-masuk/${id}`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Gagal memperbarui surat masuk");
  }
  return res.json();
}

export async function deleteSuratMasukApi(id: string): Promise<void> {
  const res = await fetch(`/api/surat-masuk/${id}`, {
    method: "DELETE",
    headers: getHeaders()
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Gagal menghapus surat masuk");
  }
}

export async function getSuratKeluarApi(): Promise<SuratKeluar[]> {
  const res = await fetch("/api/surat-keluar", { headers: getHeaders() });
  if (!res.ok) throw new Error("Gagal mengambil data surat keluar");
  return res.json();
}

export async function createSuratKeluarApi(data: Partial<SuratKeluar>): Promise<SuratKeluar> {
  const res = await fetch("/api/surat-keluar", {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Gagal membuat surat keluar");
  }
  return res.json();
}

export async function updateSuratKeluarApi(id: string, data: Partial<SuratKeluar>): Promise<SuratKeluar> {
  const res = await fetch(`/api/surat-keluar/${id}`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Gagal memperbarui surat keluar");
  }
  return res.json();
}

export async function deleteSuratKeluarApi(id: string): Promise<void> {
  const res = await fetch(`/api/surat-keluar/${id}`, {
    method: "DELETE",
    headers: getHeaders()
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Gagal menghapus surat keluar");
  }
}

export async function getLogsApi(): Promise<ActivityLog[]> {
  const res = await fetch("/api/logs", { headers: getHeaders() });
  if (!res.ok) throw new Error("Gagal mengambil log aktivitas");
  return res.json();
}

export async function getPublicConfigApi(): Promise<{ instansi_nama: string; instansi_kode: string; logo_url?: string }> {
  const res = await fetch("/api/config/public");
  if (!res.ok) throw new Error("Gagal mengambil konfigurasi publik");
  return res.json();
}

export async function getConfigApi(): Promise<ConfigSettings> {
  const res = await fetch("/api/config", { headers: getHeaders() });
  if (!res.ok) throw new Error("Gagal mengambil konfigurasi");
  return res.json();
}

export async function updateConfigApi(data: Partial<ConfigSettings>): Promise<ConfigSettings> {
  const res = await fetch("/api/config", {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Gagal memperbarui konfigurasi");
  }
  return res.json();
}

export async function syncSheetApi(gToken?: string): Promise<{
  success: boolean;
  timestamp: string;
  message: string;
  rows_synced: {
    surat_masuk: number;
    surat_keluar: number;
    users: number;
    log_aktivitas: number;
  };
}> {
  const headers = getHeaders();
  const res = await fetch("/api/config/sync-sheet", {
    method: "POST",
    headers: gToken ? { ...headers, "X-Google-Token": gToken } : headers
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Gagal sinkronisasi Spreadsheet");
  }
  return res.json();
}

export async function summarizeWithAiApi(content: string): Promise<{ summary: string }> {
  const res = await fetch("/api/gemini/summarize", {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ content })
  });
  if (!res.ok) throw new Error("Gagal membuat ringkasan AI");
  return res.json();
}
