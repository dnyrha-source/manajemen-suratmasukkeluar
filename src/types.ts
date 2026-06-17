/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'Super Admin' | 'Admin' | 'Operator' | 'Viewer';

export interface User {
  id: string;
  username: string;
  password_hash: string;
  nama_lengkap: string;
  email: string;
  role: UserRole;
  aktif: boolean;
  dibuat_pada: string;
}

export type SifatSurat = 'Biasa' | 'Penting' | 'Rahasia';

export type StatusSuratMasuk = 'Baru' | 'Proses' | 'Selesai';

export interface SuratMasuk {
  id: string;
  no_agenda: string;
  tgl_terima: string;
  no_surat: string;
  tgl_surat: string;
  pengirim: string;
  perihal: string;
  ditujukan: string;
  sifat: SifatSurat;
  lampiran_url?: string;
  lampiran_name?: string;
  lampiran_size?: number;
  keterangan: string;
  status: StatusSuratMasuk;
  dibuat_oleh: string;
  dibuat_pada: string;
}

export type StatusSuratKeluar = 'Draft' | 'Terkirim' | 'Diterima';
export type KirimVia = 'Email' | 'Pos' | 'Kurir' | 'Langsung';

export interface SuratKeluar {
  id: string;
  no_surat: string;
  tgl_surat: string;
  tujuan: string;
  perihal: string;
  sifat: SifatSurat;
  lampiran_url?: string;
  lampiran_name?: string;
  lampiran_size?: number;
  tgl_kirim: string;
  via: KirimVia;
  keterangan: string;
  status: StatusSuratKeluar;
  dibuat_oleh: string;
  dibuat_pada: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  username: string;
  aksi: string;
  modul: 'Dashboard' | 'Surat Masuk' | 'Surat Keluar' | 'Manajemen Pengguna' | 'Pengaturan';
  data_id: string;
  waktu: string;
}

export interface ConfigSettings {
  instansi_nama: string;
  instansi_kode: string;
  target_sheet_id: string;
  drive_folder_id: string;
  koneksi_status: 'Connected' | 'Disconnected';
  format_surat_keluar: string;
  format_agenda_masuk: string;
  sync_method?: 'oauth' | 'script';
  apps_script_url?: string;
  logo_url?: string;
}

export interface AuthState {
  token: string | null;
  user: Omit<User, 'password_hash'> | null;
}
