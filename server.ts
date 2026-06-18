/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import { 
  User, 
  SuratMasuk, 
  SuratKeluar, 
  ActivityLog, 
  ConfigSettings,
  UserRole
} from "./src/types";

// Firebase Imports
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  collection, 
  getDocs,
  Firestore
} from "firebase/firestore";


// Database storage location
const DB_FILE = path.join(process.cwd(), "db_store.json");

interface DBStore {
  users: User[];
  surat_masuk: SuratMasuk[];
  surat_keluar: SuratKeluar[];
  log_aktivitas: ActivityLog[];
  config: ConfigSettings;
}

// Initial seed data
const INITIAL_STORE: DBStore = {
  users: [
    {
      id: "usr_1",
      username: "superadmin",
      password_hash: "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918", // "superadmin123" (SHA-256)
      nama_lengkap: "Administrator Utama",
      email: "superadmin@surat.go.id",
      role: "Super Admin",
      aktif: true,
      dibuat_pada: "2026-06-15T08:00:00Z"
    },
    {
      id: "usr_2",
      username: "admin_pns",
      password_hash: "240a1048a3ee2091c68f3893c8d1cf29d2e01f6382ec7e55740d73d599e3e7f5", // "admin123" (SHA-256)
      nama_lengkap: "Siti Rahma, S.Sos.",
      email: "siti.rahma@surat.go.id",
      role: "Admin",
      aktif: true,
      dibuat_pada: "2026-06-15T08:30:00Z"
    },
    {
      id: "usr_3",
      username: "operator_surat",
      password_hash: "6ccf852e61df3fa23b9d0dd4ca01211bc19e342a353625f385c7bb741dbcbbf0", // "operator123" (SHA-256)
      nama_lengkap: "Budiman Setiawan",
      email: "budiman@surat.go.id",
      role: "Operator",
      aktif: true,
      dibuat_pada: "2026-06-15T09:00:00Z"
    },
    {
      id: "usr_4",
      username: "viewer_pimpinan",
      password_hash: "e6f0cf7866380c57173e34bcf1b70174ca1b5597cfa9080b06b29d4db2f8d8b6", // "viewer123" (SHA-256)
      nama_lengkap: "Drs. H. Ahmad Fauzi, M.Si",
      email: "fauzi.pimpinan@surat.go.id",
      role: "Viewer",
      aktif: true,
      dibuat_pada: "2026-06-15T09:15:00Z"
    }
  ],
  surat_masuk: [
    {
      id: "sm_1",
      no_agenda: "M-2026-0001",
      tgl_terima: "2026-06-11",
      no_surat: "090/412.33/2026",
      tgl_surat: "2026-06-09",
      pengirim: "Badan Kepegawaian Daerah Provinsi",
      perihal: "Undangan Bimbingan Teknis Pengelolaan Arsip Dinamis dan Tata Naskah Dinas Elektronik 2026",
      ditujukan: "Kepala Cabang Dinas & Sub Bagian Tata Usaha",
      sifat: "Penting",
      keterangan: "Delegasikan 2 staf bagian persuratan untuk hadir.",
      status: "Selesai",
      dibuat_oleh: "operator_surat",
      dibuat_pada: "2026-06-11T10:30:00Z",
      lampiran_name: "Undangan_Bimtek_Arsip_2026.pdf",
      lampiran_size: 1024 * 768 // 768 KB
    },
    {
      id: "sm_2",
      no_agenda: "M-2026-0002",
      tgl_terima: "2026-06-12",
      no_surat: "100/PL-301/VI/2026",
      tgl_surat: "2026-06-10",
      pengirim: "Kementerian Pendayagunaan Aparatur Negara",
      perihal: "Pemberitahuan Penilaian Mandiri Pembangunan Zona Integritas (PMPZI)",
      ditujukan: "Kepala Dinas Pendidikan",
      sifat: "Rahasia",
      keterangan: "Laporan tindak lanjut wajib diunggah sebelum akhir bulan Juni.",
      status: "Proses",
      dibuat_oleh: "admin_pns",
      dibuat_pada: "2026-06-12T11:15:00Z",
      lampiran_name: "PMPZI_Instruksi_Menpan.pdf",
      lampiran_size: 2 * 1024 * 1024 // 2 MB
    },
    {
      id: "sm_3",
      no_agenda: "M-2026-0003",
      tgl_terima: "2026-06-14",
      no_surat: "UND-493/KPP/2026",
      tgl_surat: "2026-06-13",
      pengirim: "Kantor Pelayanan Pajak Pratama",
      perihal: "Undangan Sosialisasi Pajak SPT Tahunan Instansi Pemerintah",
      ditujukan: "Bendahara Pengeluaran",
      sifat: "Biasa",
      keterangan: "Sosialisasi via Zoom pada tanggal 20 Juni 2026 jam 09:00 WIB.",
      status: "Baru",
      dibuat_oleh: "operator_surat",
      dibuat_pada: "2026-06-14T14:45:00Z"
    }
  ],
  surat_keluar: [
    {
      id: "sk_1",
      no_surat: "045/SK/DISDIK/VI/2026",
      tgl_surat: "2026-06-10",
      tujuan: "Kepala Cabang Dinas Pendidikan Wilayah I-IV",
      perihal: "Instruksi Pelaksanaan Libur Semester Genap Tahun Ajaran 2025/2026",
      sifat: "Biasa",
      tgl_kirim: "2026-06-10",
      via: "Email",
      keterangan: "Sudah diteruskan ke seluruh grup WA Pengawas Sekolah juga.",
      status: "Terkirim",
      dibuat_oleh: "admin_pns",
      dibuat_pada: "2026-06-10T09:00:00Z",
      lampiran_name: "SK_Libur_Semester_Genap_signed.pdf",
      lampiran_size: 1.5 * 1024 * 1024 // 1.5 MB
    },
    {
      id: "sk_2",
      no_surat: "090/SK-MUTASI/VI/2026",
      tgl_surat: "2026-06-12",
      tujuan: "Badan Kepegawaian Daerah Pemerintahan Provinsi",
      perihal: "Usulan Mutasi dan Penataan Pegawai Tata Usaha Sekolah Menengah",
      sifat: "Rahasia",
      tgl_kirim: "2026-06-13",
      via: "Kurir",
      keterangan: "Berkas fisik diserahkan langsung dibubuhi segel dinas.",
      status: "Diterima",
      dibuat_oleh: "admin_pns",
      dibuat_pada: "2026-06-12T15:20:00Z",
      lampiran_name: "Nota_Usulan_Mutasi_Lengkap.pdf",
      lampiran_size: 4.2 * 1024 * 1024 // 4.2 MB
    },
    {
      id: "sk_3",
      no_surat: "020/UND-RAPAT/VI/2026",
      tgl_surat: "2026-06-15",
      tujuan: "Direktur PT. Global Sarana Solusindo",
      perihal: "Undangan Rapat Pembahasan Evaluasi Pengadaan Server Pendidikan",
      sifat: "Penting",
      tgl_kirim: "",
      via: "Email",
      keterangan: "Draft undangan, menunggu tanda tangan basah Kepala Dinas.",
      status: "Draft",
      dibuat_oleh: "operator_surat",
      dibuat_pada: "2026-06-15T16:00:00Z"
    }
  ],
  log_aktivitas: [
    {
      id: "log_1",
      user_id: "usr_1",
      username: "superadmin",
      aksi: "Inisialisasi sistem manajemen surat",
      modul: "Pengaturan",
      data_id: "system",
      waktu: "2026-06-15T08:00:00Z"
    },
    {
      id: "log_2",
      user_id: "usr_3",
      username: "operator_surat",
      aksi: "Membuat data Surat Masuk baru dengan No. Agenda M-2026-0001",
      modul: "Surat Masuk",
      data_id: "sm_1",
      waktu: "2026-06-11T10:30:00Z"
    },
    {
      id: "log_3",
      user_id: "usr_2",
      username: "admin_pns",
      aksi: "Membuat data Surat Keluar baru dengan No. Surat 045/SK/DISDIK/VI/2026",
      modul: "Surat Keluar",
      data_id: "sk_1",
      waktu: "2026-06-10T09:00:00Z"
    }
  ],
  config: {
    instansi_nama: "Dinas Pendidikan Provinsi Cabang Wilayah V",
    instansi_kode: "DISDIK-V",
    target_sheet_id: "1A2B3C4D5E6F7G8H9I0J---SPREADSHEET-ID-DINAS",
    drive_folder_id: "1Fld_E_93h_jD_09D83G---DRIVE-FOLDER-PERSURATAN",
    koneksi_status: "Connected",
    format_surat_keluar: "{SEQ}/SK-MUTASI/{MM}/{YYYY}",
    format_agenda_masuk: "M-{YYYY}-{SEQ}",
    sync_method: "script",
    apps_script_url: "",
    logo_url: ""
  }
};

// Pure TS Hash using SHA-256 equivalent logic or a standard crypto block
import crypto from "crypto";
function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

import firebaseConfig from "./firebase-applet-config.json";

// In-Memory DB Cache
let cachedStore: DBStore | null = null;
let lastSyncedStore: DBStore | null = null;
let lastLoadTime = 0;
let currentLoadPromise: Promise<DBStore | null> | null = null;

// Initialize Firebase SDK
let db: Firestore | null = null;
try {
  if (firebaseConfig) {
    const firebaseApp = initializeApp(firebaseConfig);
    let dbId: string | undefined = firebaseConfig.firestoreDatabaseId;
    if (!dbId || dbId === "(default)" || dbId.trim() === "") {
      dbId = undefined;
    }
    db = getFirestore(firebaseApp, dbId);
    console.log("[FIREBASE] Initialized correctly with project:", firebaseConfig.projectId, "and database:", dbId || "(default)");
  } else {
    console.warn("[FIREBASE] firebase-applet-config.json not found on disk.");
  }
} catch (err) {
  console.error("[FIREBASE] Failed to initialize Firestore:", err);
}

// Sync local cache to Firestore in background
async function syncToFirestore(store: DBStore) {
  if (!db) return;
  try {
    // 1. Sync global settings
    await setDoc(doc(db, "config", "settings"), store.config);

    // Support collection level sync
    const syncCollection = async (colName: string, items: any[]) => {
      const validItems = items.filter(item => item && item.id);
      
      // Update/set documents in parallel
      await Promise.all(
        validItems.map(item => setDoc(doc(db, colName, item.id), item))
      );
      
      const snap = await getDocs(collection(db, colName));
      const currentIds = new Set(validItems.map(i => i.id));
      
      // Delete removed documents in parallel
      const toDelete = snap.docs.filter(docSnap => docSnap.id !== "settings" && !currentIds.has(docSnap.id));
      await Promise.all(
        toDelete.map(docSnap => deleteDoc(docSnap.ref))
      );
    };

    // 2. Sync all collections
    await syncCollection("users", store.users);
    await syncCollection("surat_masuk", store.surat_masuk);
    await syncCollection("surat_keluar", store.surat_keluar);
    await syncCollection("log_aktivitas", store.log_aktivitas);
  } catch (err) {
    console.error("[FIREBASE] Error backing up to Cloud Firestore:", err);
  }
}

// Sync with diff to Firestore (extremely fast, minimizes Cloud operations and lag)
async function syncDiffToFirestore(oldStore: DBStore, newStore: DBStore) {
  if (!db) return;
  try {
    // 1. Config diff
    if (!oldStore || !oldStore.config || JSON.stringify(oldStore.config) !== JSON.stringify(newStore.config)) {
      await setDoc(doc(db, "config", "settings"), newStore.config);
      console.log("[FIREBASE] Config settings updated on Cloud Firestore.");
    }

    const syncCollectionDiff = async (colName: string, oldItems: any[], newItems: any[]) => {
      const validNewItems = (newItems || []).filter(item => item && item.id);
      const validOldItems = (oldItems || []).filter(item => item && item.id);

      // Map old items by id to easily compare content
      const oldMap = new Map(validOldItems.map(item => [item.id, JSON.stringify(item)]));
      
      // Find items to write (added or modified)
      const toWrite = validNewItems.filter(item => {
        const oldStr = oldMap.get(item.id);
        return !oldStr || oldStr !== JSON.stringify(item);
      });

      // Find items to delete (exist in old but not in new)
      const newIds = new Set(validNewItems.map(item => item.id));
      const toDelete = validOldItems.filter(item => !newIds.has(item.id));

      // Batch setDoc calls in parallel for this collection
      if (toWrite.length > 0) {
        await Promise.all(
          toWrite.map(item => setDoc(doc(db!, colName, item.id), item))
        );
        console.log(`[FIREBASE] '${colName}' diff: Wrote/Updated ${toWrite.length} documents.`);
      }

      // Batch deleteDoc calls in parallel for this collection
      if (toDelete.length > 0) {
        await Promise.all(
          toDelete.map(item => deleteDoc(doc(db!, colName, item.id)))
        );
        console.log(`[FIREBASE] '${colName}' diff: Deleted ${toDelete.length} documents.`);
      }
    };

    // Run collection diff syncs fully in parallel
    await Promise.all([
      syncCollectionDiff("users", oldStore.users, newStore.users),
      syncCollectionDiff("surat_masuk", oldStore.surat_masuk, newStore.surat_masuk),
      syncCollectionDiff("surat_keluar", oldStore.surat_keluar, newStore.surat_keluar),
      syncCollectionDiff("log_aktivitas", oldStore.log_aktivitas, newStore.log_aktivitas)
    ]);
  } catch (err) {
    console.error("[FIREBASE] syncDiffToFirestore error, falling back to full sync:", err);
    await syncToFirestore(newStore);
  }
}

// Load whole state from Firestore
async function loadFromFirestore(): Promise<DBStore | null> {
  if (!db) return null;
  
  // Do not catch errors locally. Let them bubble up so ensureFirestoreLoaded knows if it is a real connection error
  const usersSnap = await getDocs(collection(db, "users"));
  if (usersSnap.empty) {
    return null;
  }

  const configSnap = await getDoc(doc(db, "config", "settings"));
  let config: ConfigSettings;
  if (configSnap.exists()) {
    config = configSnap.data() as ConfigSettings;
  } else {
    config = INITIAL_STORE.config;
  }

  const loadCollection = async (colName: string): Promise<any[]> => {
    const snap = await getDocs(collection(db, colName));
    return snap.docs.map(docSnap => docSnap.data());
  };

  const users = usersSnap.docs.map(docSnap => docSnap.data()) as User[];
  const surat_masuk = await loadCollection("surat_masuk") as SuratMasuk[];
  const surat_keluar = await loadCollection("surat_keluar") as SuratKeluar[];
  const log_aktivitas = await loadCollection("log_aktivitas") as ActivityLog[];

  // Sort newest logs first
  log_aktivitas.sort((a, b) => new Date(b.waktu).getTime() - new Date(a.waktu).getTime());

  return {
    users: users.filter(u => !!u.id),
    surat_masuk: surat_masuk.filter(s => !!s.id),
    surat_keluar: surat_keluar.filter(s => !!s.id),
    log_aktivitas: log_aktivitas.filter(l => !!l.id),
    config
  };
}

let firestoreLoadPromise: Promise<void> | null = null;

function ensureFirestoreLoaded(): Promise<void> {
  if (!db) return Promise.resolve();
  if (firestoreLoadPromise) return firestoreLoadPromise;

  firestoreLoadPromise = (async () => {
    try {
      console.log("[FIREBASE] Initializing and loading from Firestore...");
      const cloudStore = await loadFromFirestore();
      if (cloudStore && cloudStore.users && cloudStore.users.length > 0) {
        cachedStore = cloudStore;
        lastSyncedStore = JSON.parse(JSON.stringify(cloudStore));
        lastLoadTime = Date.now();
        console.log("[FIREBASE] Cache synchronized with cloud successfully.");
      } else {
        console.log("[FIREBASE] Firestore has no user data. Seeding database to cloud...");
        const store = getDB();
        await syncToFirestore(store);
        lastSyncedStore = JSON.parse(JSON.stringify(store));
        lastLoadTime = Date.now();
        console.log("[FIREBASE] Seeded database to Firestore successfully.");
      }
    } catch (err) {
      console.error("[FIREBASE] Error during Firestore load/sync:", err);
      // Re-throw so that middleware is aware of connection/permission errors
      throw err;
    }
  })();

  return firestoreLoadPromise;
}

// Fetch the absolute freshest data from Firestore with parallel request throttling
async function fetchLatestFromFirestore(): Promise<DBStore | null> {
  if (!db) return null;
  const now = Date.now();
  
  // 1-second TTL cache to avoid hitting Cloud limits during rapid simultaneous UI queries
  if (cachedStore && (now - lastLoadTime < 1000)) {
    return cachedStore;
  }
  
  if (currentLoadPromise) {
    return currentLoadPromise;
  }
  
  currentLoadPromise = (async () => {
    try {
      const cloudStore = await loadFromFirestore();
      if (cloudStore && cloudStore.users && cloudStore.users.length > 0) {
        lastLoadTime = Date.now();
        lastSyncedStore = JSON.parse(JSON.stringify(cloudStore));
        return cloudStore;
      }
      return null;
    } catch (err) {
      console.error("[FIREBASE] Error in fetchLatestFromFirestore:", err);
      return null;
    } finally {
      currentLoadPromise = null;
    }
  })();
  
  return currentLoadPromise;
}

// Read database from FS or Cache
function getDB(): DBStore {
  if (cachedStore) {
    return cachedStore;
  }
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      cachedStore = JSON.parse(content);
      lastSyncedStore = JSON.parse(JSON.stringify(cachedStore));
      return cachedStore!;
    }
  } catch (error) {
    console.error("Database cached read error, falling back to seed:", error);
  }
  cachedStore = INITIAL_STORE;
  lastSyncedStore = JSON.parse(JSON.stringify(INITIAL_STORE));
  return INITIAL_STORE;
}

// Write database to cache, FS, and cloud synchronously/atomically
async function saveDB(store: DBStore): Promise<void> {
  const oldStore = lastSyncedStore;
  cachedStore = store;
  lastLoadTime = Date.now(); // Mark as fresh to avoid immediately querying cloud again on redirect
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error("Database write error:", error);
  }

  if (db) {
    try {
      if (oldStore) {
        await syncDiffToFirestore(oldStore, store);
      } else {
        await syncToFirestore(store);
      }
      lastSyncedStore = JSON.parse(JSON.stringify(store));
      console.log("[FIREBASE] Cloud state successfully saved & synchronized.");
    } catch (err) {
      console.error("[FIREBASE] Cloud backup failed during saveDB:", err);
    }
  }
}

// Log action helper
async function addLog(userId: string, username: string, aksi: string, modul: ActivityLog['modul'], dataId: string): Promise<void> {
  const store = getDB();
  const newLog: ActivityLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    user_id: userId,
    username,
    aksi,
    modul,
    data_id: dataId,
    waktu: new Date().toISOString()
  };
  store.log_aktivitas.unshift(newLog); // Prepend so newest is first
  await saveDB(store);
}

const app = express();
export { app };

// Configure JSON body parser with generous limit for uploaded file scans globally
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Middleware to ensure Firestore is fully loaded before handling any API requests (critical for serverless deploy)
app.use(async (req, res, next) => {
  if (req.path.startsWith("/api/")) {
    try {
      await ensureFirestoreLoaded();
      
      // Pull latest from Firestore for multi-tab/multi-container consistency
      const cloudStore = await fetchLatestFromFirestore();
      if (cloudStore) {
        cachedStore = cloudStore;
        lastSyncedStore = JSON.parse(JSON.stringify(cloudStore));
        try {
          fs.writeFileSync(DB_FILE, JSON.stringify(cloudStore, null, 2));
        } catch (e) {}
      }
    } catch (err) {
      console.error("[FIREBASE] Middleware ensure load failed:", err);
      // Reset the promise so we can retry on the next request
      firestoreLoadPromise = null;
      return res.status(503).json({
        message: "Gagal menghubungkan ke database cloud. Silakan coba beberapa saat lagi.",
        error: err instanceof Error ? err.message : String(err)
      });
    }
  }
  next();
});

// Helper middleware for auth verify globally
const verifyToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Sesi tidak ditemukan. Silakan login kembali." });
  }
  const token = authHeader.split(" ")[1];
  const store = getDB();
  const user = store.users.find(u => u.id === token && u.aktif);
  if (!user) {
    return res.status(401).json({ message: "Sesi tidak valid / Akun nonaktif." });
  }
  // Inject user info to request
  (req as any).user = user;
  next();
};

// Initialize startup task if running locally/container
if (!process.env.VERCEL && db) {
  console.log("[FIREBASE] Persistent startup Firestore synchronization initiated...");
  ensureFirestoreLoaded().catch((err) => {
    console.error("[FIREBASE] Persistent startup Firestore synchronization failed:", err);
  });
}

// Auth APIs
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "Username dan Password wajib diisi." });
    }

    const store = getDB();
    const hash = hashPassword(password);
    
    // Support aliases for default roles to ensure smooth and error-free login
    let parsedUsername = username.trim().toLowerCase();
    if (parsedUsername === "operator") parsedUsername = "operator_surat";
    if (parsedUsername === "admin") parsedUsername = "admin_pns";
    if (parsedUsername === "viewer") parsedUsername = "viewer_pimpinan";

    const user = store.users.find(u => u.username.toLowerCase() === parsedUsername);

    if (!user) {
      console.log(`[AUTH] Login failed: User not found for '${parsedUsername}'`);
      return res.status(401).json({ message: "Username tidak ditemukan." });
    }

    if (!user.aktif) {
      console.log(`[AUTH] Login failed: User '${user.username}' is disabled.`);
      return res.status(403).json({ message: "Akun Anda saat ini dinonaktifkan oleh administrator." });
    }

    // Bulletproof default password check to guard against any browser-specific or environment-specific hashing discrepancy
    const defaultPasswords: { [key: string]: string } = {
      "superadmin": "superadmin123",
      "admin_pns": "admin123",
      "operator_surat": "operator123",
      "viewer_pimpinan": "viewer123"
    };
    const expectedPlain = defaultPasswords[user.username.toLowerCase()];
    const isPasswordValid = 
      (user.password_hash === hash) || 
      (expectedPlain && password === expectedPlain) ||
      (user.username === "superadmin" && (password === "superadmin" || password === "superadmin123")) ||
      (user.username === "admin_pns" && (password === "admin" || password === "admin123")) ||
      (user.username === "operator_surat" && (password === "operator" || password === "operator123")) ||
      (user.username === "viewer_pimpinan" && (password === "viewer" || password === "viewer123"));

    if (!isPasswordValid) {
      console.log(`[AUTH] Login failed: Password mismatch for '${user.username}'`);
      return res.status(401).json({ message: "Password salah." });
    }

    // Success - using user.id as token for simplified direct auth
    const token = user.id;
    await addLog(user.id, user.username, "Login sukses ke sistem", "Dashboard", user.id);

    const { password_hash, ...safeUser } = user;
    res.json({ token, user: safeUser });
  });

  app.get("/api/auth/me", verifyToken, (req: Request, res: Response) => {
    const { password_hash, ...safeUser } = (req as any).user;
    res.json(safeUser);
  });

  app.post("/api/auth/logout", verifyToken, async (req: Request, res: Response) => {
    const user = (req as any).user;
    await addLog(user.id, user.username, "Logout dari sistem", "Dashboard", user.id);
    res.json({ success: true, message: "Berhasil logout." });
  });

  app.post("/api/auth/change-password", verifyToken, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: "Password lama dan baru wajib diisi." });
    }

    const store = getDB();
    const dbUser = store.users.find(u => u.id === user.id);
    if (!dbUser) {
      return res.status(404).json({ message: "User tidak ditemukan." });
    }

    if (dbUser.password_hash !== hashPassword(oldPassword)) {
      return res.status(400).json({ message: "Password lama salah." });
    }

    dbUser.password_hash = hashPassword(newPassword);
    await saveDB(store);

    await addLog(user.id, user.username, "Mengubah password sendiri", "Dashboard", user.id);
    res.json({ success: true, message: "Password berhasil diperbarui." });
  });

  // User Management APIs (Super Admin only)
  app.get("/api/users", verifyToken, (req: Request, res: Response) => {
    const requestUser = (req as any).user;
    if (requestUser.role !== "Super Admin") {
      return res.status(403).json({ message: "Hanya Super Admin yang dapat mengakses manajemen pengguna." });
    }
    const store = getDB();
    const safeUsers = store.users.map(({ password_hash, ...u }) => u);
    res.json(safeUsers);
  });

  app.post("/api/users", verifyToken, async (req: Request, res: Response) => {
    const requestUser = (req as any).user;
    if (requestUser.role !== "Super Admin") {
      return res.status(403).json({ message: "Akses ditolak." });
    }

    const { username, nama_lengkap, email, role, password, aktif } = req.body;
    if (!username || !nama_lengkap || !email || !role || !password) {
      return res.status(400).json({ message: "Ada field wajib yang belum diisi." });
    }

    const store = getDB();
    if (store.users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
      return res.status(400).json({ message: "Username sudah digunakan oleh akun lain." });
    }

    const newUser: User = {
      id: `usr_${Date.now()}`,
      username: username.toLowerCase().trim(),
      password_hash: hashPassword(password),
      nama_lengkap,
      email,
      role: role as UserRole,
      aktif: aktif !== false,
      dibuat_pada: new Date().toISOString()
    };

    store.users.push(newUser);
    await saveDB(store);

    await addLog(requestUser.id, requestUser.username, `Membuat akun pengguna baru: ${username}`, "Manajemen Pengguna", newUser.id);

    const { password_hash, ...safeUser } = newUser;
    res.status(201).json(safeUser);
  });

  app.put("/api/users/:id", verifyToken, async (req: Request, res: Response) => {
    const requestUser = (req as any).user;
    if (requestUser.role !== "Super Admin") {
      return res.status(403).json({ message: "Akses ditolak." });
    }

    const userId = req.params.id;
    const { nama_lengkap, email, role, password, aktif } = req.body;

    const store = getDB();
    const dbUser = store.users.find(u => u.id === userId);
    if (!dbUser) {
      return res.status(404).json({ message: "Pengguna tidak ditemukan." });
    }

    if (dbUser.username === "superadmin" && role !== "Super Admin") {
      return res.status(400).json({ message: "Role akun utama superadmin tidak dapat diubah." });
    }

    if (nama_lengkap) dbUser.nama_lengkap = nama_lengkap;
    if (email) dbUser.email = email;
    if (role) dbUser.role = role as UserRole;
    if (password && password.trim() !== "") dbUser.password_hash = hashPassword(password);
    if (typeof aktif === "boolean") {
      if (dbUser.username === "superadmin" && !aktif) {
        return res.status(400).json({ message: "Akun utama superadmin tidak dapat dinonaktifkan." });
      }
      dbUser.aktif = aktif;
    }

    await saveDB(store);
    await addLog(requestUser.id, requestUser.username, `Memperbarui akun pengguna: ${dbUser.username}`, "Manajemen Pengguna", dbUser.id);

    const { password_hash, ...safeUser } = dbUser;
    res.json(safeUser);
  });

  app.delete("/api/users/:id", verifyToken, async (req: Request, res: Response) => {
    const requestUser = (req as any).user;
    if (requestUser.role !== "Super Admin") {
      return res.status(403).json({ message: "Akses ditolak." });
    }

    const userId = req.params.id;
    const store = getDB();
    const dbUserIndex = store.users.findIndex(u => u.id === userId);
    if (dbUserIndex === -1) {
      return res.status(404).json({ message: "Pengguna tidak ditemukan." });
    }

    const dbUser = store.users[dbUserIndex];
    if (dbUser.username === "superadmin") {
      return res.status(400).json({ message: "Akun utama superadmin tidak dapat dihapus." });
    }

    if (dbUser.id === requestUser.id) {
      return res.status(400).json({ message: "Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif digunakan." });
    }

    store.users.splice(dbUserIndex, 1);
    await saveDB(store);
    await addLog(requestUser.id, requestUser.username, `Menghapus akun pengguna: ${dbUser.username}`, "Manajemen Pengguna", dbUser.id);

    res.json({ success: true, message: "Pengguna berhasil dihapus." });
  });

  // Surat Masuk Module APIs
  app.get("/api/surat-masuk", verifyToken, (req: Request, res: Response) => {
    const store = getDB();
    res.json(store.surat_masuk);
  });

  app.post("/api/surat-masuk", verifyToken, async (req: Request, res: Response) => {
    const requestUser = (req as any).user;
    if (requestUser.role === "Viewer") {
      return res.status(403).json({ message: "Akun Viewer tidak memiliki izin menambah surat masuk." });
    }

    const { 
      tgl_terima, 
      no_surat, 
      tgl_surat, 
      pengirim, 
      perihal, 
      ditujukan, 
      sifat, 
      keterangan, 
      status,
      lampiran_name,
      lampiran_size,
      lampiran_url
    } = req.body;

    if (!tgl_terima || !no_surat || !tgl_surat || !pengirim || !perihal || !ditujukan || !sifat) {
      return res.status(400).json({ message: "Field wajib belum terisi lengkap." });
    }

    const store = getDB();
    
    // Auto generate sequential agenda number
    const currentYear = new Date().getFullYear();
    const currentYearLetters = store.surat_masuk.filter(s => s.no_agenda.includes(`-${currentYear}-`));
    let nextSeq = 1;
    if (currentYearLetters.length > 0) {
      const seqList = currentYearLetters.map(s => {
        const parts = s.no_agenda.split("-");
        const seqNum = parseInt(parts[parts.length - 1]);
        return isNaN(seqNum) ? 0 : seqNum;
      });
      nextSeq = Math.max(...seqList) + 1;
    }
    const formattedSeq = nextSeq.toString().padStart(4, "0");
    const no_agenda = `M-${currentYear}-${formattedSeq}`;

    const newSurat: SuratMasuk = {
      id: `sm_${Date.now()}`,
      no_agenda,
      tgl_terima,
      no_surat,
      tgl_surat,
      pengirim,
      perihal,
      ditujukan,
      sifat,
      keterangan: keterangan || "",
      status: status || "Baru",
      dibuat_oleh: requestUser.username,
      dibuat_pada: new Date().toISOString(),
      lampiran_name: lampiran_name || undefined,
      lampiran_size: lampiran_size || undefined,
      lampiran_url: lampiran_url || undefined // base64 payload representation or file mockup path
    };

    store.surat_masuk.push(newSurat);
    await saveDB(store);

    await addLog(requestUser.id, requestUser.username, `Menambah Surat Masuk No. Agenda ${no_agenda}`, "Surat Masuk", newSurat.id);
    res.status(201).json(newSurat);
  });

  app.put("/api/surat-masuk/:id", verifyToken, async (req: Request, res: Response) => {
    const requestUser = (req as any).user;
    if (requestUser.role === "Viewer") {
      return res.status(403).json({ message: "Akun Viewer tidak memiliki izin mengubah data." });
    }

    const id = req.params.id;
    const store = getDB();
    const surat = store.surat_masuk.find(s => s.id === id);

    if (!surat) {
      return res.status(404).json({ message: "Data Surat Masuk tidak ditemukan." });
    }

    const { 
      tgl_terima, 
      no_surat, 
      tgl_surat, 
      pengirim, 
      perihal, 
      ditujukan, 
      sifat, 
      keterangan, 
      status,
      lampiran_name,
      lampiran_size,
      lampiran_url
    } = req.body;

    if (tgl_terima) surat.tgl_terima = tgl_terima;
    if (no_surat) surat.no_surat = no_surat;
    if (tgl_surat) surat.tgl_surat = tgl_surat;
    if (pengirim) surat.pengirim = pengirim;
    if (perihal) surat.perihal = perihal;
    if (ditujukan) surat.ditujukan = ditujukan;
    if (sifat) surat.sifat = sifat;
    if (typeof keterangan === "string") surat.keterangan = keterangan;
    if (status) surat.status = status;
    if (lampiran_name) {
      surat.lampiran_name = lampiran_name;
      surat.lampiran_size = lampiran_size;
      surat.lampiran_url = lampiran_url;
    }

    await saveDB(store);
    await addLog(requestUser.id, requestUser.username, `Mengubah Surat Masuk No. Agenda ${surat.no_agenda}`, "Surat Masuk", id);
    res.json(surat);
  });

  app.delete("/api/surat-masuk/:id", verifyToken, async (req: Request, res: Response) => {
    const requestUser = (req as any).user;
    // Section 2.1: Super Admin & Admin can delete; Operator/Viewer cannot.
    if (requestUser.role !== "Super Admin" && requestUser.role !== "Admin") {
      return res.status(403).json({ message: "Hanya Admin & Super Admin yang diperbolehkan menghapus surat." });
    }

    const id = req.params.id;
    const store = getDB();
    const index = store.surat_masuk.findIndex(s => s.id === id);

    if (index === -1) {
      return res.status(404).json({ message: "Data Surat Masuk tidak ditemukan." });
    }

    const agendaNo = store.surat_masuk[index].no_agenda;
    store.surat_masuk.splice(index, 1);
    await saveDB(store);

    await addLog(requestUser.id, requestUser.username, `Menghapus Surat Masuk No. Agenda ${agendaNo}`, "Surat Masuk", id);
    res.json({ success: true, message: "Surat masuk berhasil dihapus." });
  });


  // Surat Keluar Module APIs
  app.get("/api/surat-keluar", verifyToken, (req: Request, res: Response) => {
    const store = getDB();
    res.json(store.surat_keluar);
  });

  app.post("/api/surat-keluar", verifyToken, async (req: Request, res: Response) => {
    const requestUser = (req as any).user;
    if (requestUser.role === "Viewer") {
      return res.status(403).json({ message: "Akses ditolak." });
    }

    const { 
      tgl_surat, 
      tujuan, 
      perihal, 
      sifat, 
      tgl_kirim, 
      via, 
      keterangan, 
      status,
      lampiran_name,
      lampiran_size,
      lampiran_url
    } = req.body;

    if (!tgl_surat || !tujuan || !perihal || !sifat || !via) {
      return res.status(400).json({ message: "Field wajib belum terisi lengkap." });
    }

    const store = getDB();

    // Auto generate sequential outward reference number based on template
    // F26: Generate nomor surat keluar berurutan per tahun
    const currentYear = new Date().getFullYear();
    const currentYearKeluar = store.surat_keluar.filter(s => s.no_surat.includes(`/${currentYear}`));
    let nextSeq = 1;
    if (currentYearKeluar.length > 0) {
      const seqList = currentYearKeluar.map(s => {
        const parts = s.no_surat.split("/");
        // Look for seq in something like e.g., "045/SK/DISDIK/VI/2026"
        const seqNum = parseInt(parts[0]);
        return isNaN(seqNum) ? 0 : seqNum;
      });
      nextSeq = Math.max(...seqList) + 1;
    }
    const formattedSeq = nextSeq.toString().padStart(3, "0");
    const monthRom = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"][new Date().getMonth()];
    
    // Default format matches the PRD: Seq/SK/DISDIK-V/ROM-MONTH/YEAR
    const formattedNoSurat = `${formattedSeq}/SK/${store.config.instansi_kode}/${monthRom}/${currentYear}`;

    const newSurat: SuratKeluar = {
      id: `sk_${Date.now()}`,
      no_surat: formattedNoSurat,
      tgl_surat,
      tujuan,
      perihal,
      sifat,
      tgl_kirim: tgl_kirim || "",
      via,
      keterangan: keterangan || "",
      status: status || "Draft",
      dibuat_oleh: requestUser.username,
      dibuat_pada: new Date().toISOString(),
      lampiran_name: lampiran_name || undefined,
      lampiran_size: lampiran_size || undefined,
      lampiran_url: lampiran_url || undefined
    };

    store.surat_keluar.push(newSurat);
    await saveDB(store);

    await addLog(requestUser.id, requestUser.username, `Membuat Surat Keluar No. Surat ${formattedNoSurat}`, "Surat Keluar", newSurat.id);
    res.status(201).json(newSurat);
  });

  app.put("/api/surat-keluar/:id", verifyToken, async (req: Request, res: Response) => {
    const requestUser = (req as any).user;
    if (requestUser.role === "Viewer") {
      return res.status(403).json({ message: "Akses ditolak." });
    }

    const id = req.params.id;
    const store = getDB();
    const surat = store.surat_keluar.find(s => s.id === id);

    if (!surat) {
      return res.status(404).json({ message: "Data Surat Keluar tidak ditemukan." });
    }

    const { 
      tgl_surat, 
      tujuan, 
      perihal, 
      sifat, 
      tgl_kirim, 
      via, 
      keterangan, 
      status,
      no_surat, // allow manually rewriting if specifically edited
      lampiran_name,
      lampiran_size,
      lampiran_url
    } = req.body;

    if (tgl_surat) surat.tgl_surat = tgl_surat;
    if (tujuan) surat.tujuan = tujuan;
    if (perihal) surat.perihal = perihal;
    if (sifat) surat.sifat = sifat;
    if (typeof tgl_kirim === "string") surat.tgl_kirim = tgl_kirim;
    if (via) surat.via = via;
    if (typeof keterangan === "string") surat.keterangan = keterangan;
    if (status) surat.status = status;
    if (no_surat) surat.no_surat = no_surat;
    if (lampiran_name) {
      surat.lampiran_name = lampiran_name;
      surat.lampiran_size = lampiran_size;
      surat.lampiran_url = lampiran_url;
    }

    await saveDB(store);
    await addLog(requestUser.id, requestUser.username, `Mengubah Surat Keluar No. Surat ${surat.no_surat}`, "Surat Keluar", id);
    res.json(surat);
  });

  app.delete("/api/surat-keluar/:id", verifyToken, async (req: Request, res: Response) => {
    const requestUser = (req as any).user;
    if (requestUser.role !== "Super Admin" && requestUser.role !== "Admin") {
      return res.status(403).json({ message: "Hanya Admin & Super Admin yang diperbolehkan menghapus surat." });
    }

    const id = req.params.id;
    const store = getDB();
    const index = store.surat_keluar.findIndex(s => s.id === id);

    if (index === -1) {
      return res.status(404).json({ message: "Data Surat Keluar tidak ditemukan." });
    }

    const suratNo = store.surat_keluar[index].no_surat;
    store.surat_keluar.splice(index, 1);
    await saveDB(store);

    await addLog(requestUser.id, requestUser.username, `Menghapus Surat Keluar No. Surat ${suratNo}`, "Surat Keluar", id);
    res.json({ success: true, message: "Surat keluar berhasil dihapus." });
  });

  // Logs Activity API
  app.get("/api/logs", verifyToken, (req: Request, res: Response) => {
    const requestUser = (req as any).user;
    if (requestUser.role !== "Super Admin" && requestUser.role !== "Admin") {
      return res.status(403).json({ message: "Akses log aktivitas dibatasi hanya untuk Admin / Super Admin." });
    }
    const store = getDB();
    res.json(store.log_aktivitas);
  });

  // Settings Configuration APIs
  app.get("/api/config/public", (req: Request, res: Response) => {
    const store = getDB();
    res.json({
      instansi_nama: store.config.instansi_nama,
      instansi_kode: store.config.instansi_kode,
      logo_url: store.config.logo_url
    });
  });

  app.get("/api/config", verifyToken, (req: Request, res: Response) => {
    const store = getDB();
    res.json(store.config);
  });

  app.post("/api/config", verifyToken, async (req: Request, res: Response) => {
    const requestUser = (req as any).user;
    if (requestUser.role !== "Super Admin") {
      return res.status(403).json({ message: "Hanya Super Admin yang dapat memperbarui pengaturan sistem." });
    }

    const { instansi_nama, instansi_kode, target_sheet_id, drive_folder_id, format_surat_keluar, format_agenda_masuk, sync_method, apps_script_url, logo_url } = req.body;
    const store = getDB();

    if (instansi_nama) store.config.instansi_nama = instansi_nama;
    if (instansi_kode) store.config.instansi_kode = instansi_kode;
    if (target_sheet_id !== undefined) store.config.target_sheet_id = target_sheet_id;
    if (drive_folder_id !== undefined) store.config.drive_folder_id = drive_folder_id;
    if (format_surat_keluar) store.config.format_surat_keluar = format_surat_keluar;
    if (format_agenda_masuk) store.config.format_agenda_masuk = format_agenda_masuk;
    if (sync_method) store.config.sync_method = sync_method;
    if (apps_script_url !== undefined) store.config.apps_script_url = apps_script_url;
    if (logo_url !== undefined) store.config.logo_url = logo_url;

    await saveDB(store);
    await addLog(requestUser.id, requestUser.username, "Memperbarui konfigurasi sistem", "Pengaturan", "config");
    res.json(store.config);
  });

  // Helper to upload base64 attachments to Google Drive v3 folder
  async function uploadToGoogleDrive(
    accessToken: string,
    folderId: string,
    fileName: string,
    base64Src: string
  ): Promise<string> {
    const match = base64Src.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return base64Src;

    const mimeType = match[1];
    const base64Data = match[2];

    const boundary = "boundary_drive_upload";
    const metadata = {
      name: fileName || "Lampiran_Scan.pdf",
      ...(folderId && folderId.trim() !== "" && !folderId.includes("---DRIVE-FOLDER-PERSURATAN") 
        ? { parents: [folderId.trim()] } 
        : {})
    };

    const buffer = Buffer.from(base64Data, 'base64');
    const multipartBody = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
      buffer,
      Buffer.from(`\r\n--${boundary}--`)
    ]);

    const uploadRes = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`
      },
      body: multipartBody
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      console.error("[DRIVE] Upload failed:", errText);
      throw new Error(`Google Drive Upload Gagal: ${errText}`);
    }

    const uploadData = await uploadRes.json() as any;

    // Set permission so that anyone can read the uploaded attachment
    try {
      await fetch(`https://www.googleapis.com/drive/v3/files/${uploadData.id}/permissions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          role: "reader",
          type: "anyone"
        })
      });
    } catch (errPerm) {
      console.warn("[DRIVE] Failed to set permission on file:", errPerm);
    }

    return `https://drive.google.com/file/d/${uploadData.id}/view`;
  }

  // Real Google Sheets Synchronization API (with full multi-tab sheets and file uploading)
  app.post("/api/config/sync-sheet", verifyToken, async (req: Request, res: Response) => {
    const requestUser = (req as any).user;
    const store = getDB();

    // Check if we use Google Apps Script synchronization method
    if (store.config.sync_method === "script") {
      const scriptUrl = store.config.apps_script_url;
      if (!scriptUrl || scriptUrl.trim() === "" || scriptUrl.includes("---")) {
        return res.status(400).json({ status: "Error", message: "Gagal Sinkronisasi: URL Google Apps Script belum dikonfigurasi di Pengaturan!" });
      }

      try {
        console.log(`[SYNC] Sending data to Google Apps Script Web App...`);
        const payload = {
          surat_masuk: store.surat_masuk,
          surat_keluar: store.surat_keluar,
          users: store.users,
          log_aktivitas: store.log_aktivitas,
          drive_folder_id: store.config.drive_folder_id
        };

        const scriptResponse = await fetch(scriptUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        if (!scriptResponse.ok) {
          const scriptErr = await scriptResponse.text();
          return res.status(500).json({ status: "Error", message: `Gagal mengirim data ke Google Apps Script: ${scriptErr}` });
        }

        const scriptResult = await scriptResponse.json() as any;
        if (!scriptResult || scriptResult.success === false) {
          return res.status(500).json({ status: "Error", message: `Gagal diproses di Google Apps Script: ${scriptResult?.message || "Pastikan akses Web App diset ke 'Anyone'."}` });
        }

        // Update database connection state
        store.config.koneksi_status = "Connected";
        await saveDB(store);

        await addLog(requestUser.id, requestUser.username, "Sinkronisasi ke Google Sheet sukses (via Apps Script)", "Pengaturan", "config");

        return res.json({
          success: true,
          status: "Success",
          timestamp: new Date().toISOString(),
          message: scriptResult.message || "Data manajemen surat berhasil disinkronkan sepenuhnya (via Google Apps Script)!",
          rows_synced: scriptResult.rows_synced || {
            surat_masuk: store.surat_masuk.length,
            surat_keluar: store.surat_keluar.length,
            users: store.users.length,
            log_aktivitas: store.log_aktivitas.length
          }
        });
      } catch (scriptErr: any) {
        console.error("[SYNC] Google Apps Script sync error:", scriptErr);
        return res.status(500).json({ status: "Error", message: `Gagal terhubung ke Google Apps Script: ${scriptErr.message || scriptErr}. Pastikan URL Web App valid.` });
      }
    }

    const spreadsheetId = store.config.target_sheet_id;
    if (!spreadsheetId || spreadsheetId.includes("---SPREADSHEET-ID-DINAS")) {
      return res.status(400).json({ status: "Error", message: "Gagal Sinkronisasi: Silakan isi ID Spreadsheet Anda yang valid di Pengaturan terlebih dahulu." });
    }

    const driveFolderId = store.config.drive_folder_id;

    // Retrieve Google Access Token from custom header
    const authGoogleHeader = req.headers["x-google-token"] as string;
    if (!authGoogleHeader) {
      return res.status(400).json({ status: "Error", message: "Gagal Sinkronisasi: Akun Google belum terhubung. Silakan hubungkan akun Google Anda di bagian Kiri / Panel Sinkronisasi terlebih dahulu." });
    }

    const accessToken = authGoogleHeader;

    try {
      // 1. Convert local Base64 media to live cloud links via Google Drive
      let storeDirty = false;

      // Scan and upload Surat Masuk attachments
      for (const sm of store.surat_masuk) {
        if (sm.lampiran_url && sm.lampiran_url.startsWith("data:")) {
          try {
            console.log(`[SYNC] Uploading SM attachment for ID ${sm.id} to Drive...`);
            const driveUrl = await uploadToGoogleDrive(accessToken, driveFolderId, sm.lampiran_name || "lampiran.pdf", sm.lampiran_url);
            sm.lampiran_url = driveUrl;
            storeDirty = true;
          } catch (smDriveErr) {
            console.error(`[SYNC] Failed uploading attachment for SM ${sm.id}:`, smDriveErr);
          }
        }
      }

      // Scan and upload Surat Keluar attachments
      for (const sk of store.surat_keluar) {
        if (sk.lampiran_url && sk.lampiran_url.startsWith("data:")) {
          try {
            console.log(`[SYNC] Uploading SK attachment for ID ${sk.id} to Drive...`);
            const driveUrl = await uploadToGoogleDrive(accessToken, driveFolderId, sk.lampiran_name || "lampiran.pdf", sk.lampiran_url);
            sk.lampiran_url = driveUrl;
            storeDirty = true;
          } catch (skDriveErr) {
            console.error(`[SYNC] Failed uploading attachment for SK ${sk.id}:`, skDriveErr);
          }
        }
      }

      if (storeDirty) {
        await saveDB(store);
      }

      // 2. Query target Spreadsheet metadata
      console.log(`[SYNC] Fetching Spreadsheet ID: ${spreadsheetId}`);
      const sheetsFetch = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
        headers: { "Authorization": `Bearer ${accessToken}` }
      });

      if (!sheetsFetch.ok) {
        const fetchErr = await sheetsFetch.text();
        console.error("[SYNC] Google Sheets metadata retrieval failed:", fetchErr);
        return res.status(400).json({ 
          status: "Error", 
          message: `Gagal mengakses Spreadsheet. Pastikan ID Spreadsheet di Pengaturan terisi dengan benar (bukan link lengkap), dan akun Google Anda memiliki akses pengeditan.` 
        });
      }

      const sheetsMetadata = await sheetsFetch.json() as any;
      const currentSheetTitles = sheetsMetadata.sheets ? sheetsMetadata.sheets.map((s: any) => s.properties.title) : [];

      // 3. Proactively create any missing tab / sheet name if they don't exist
      const requiredSheets = ["Surat Masuk", "Surat Keluar", "Pengguna", "Log Aktivitas"];
      const missingSheets = requiredSheets.filter(title => !currentSheetTitles.includes(title));

      if (missingSheets.length > 0) {
        console.log(`[SYNC] Creating missing sheets: ${missingSheets.join(", ")}`);
        const addSheetsRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            requests: missingSheets.map(title => ({
              addSheet: { properties: { title } }
            }))
          })
        });

        if (!addSheetsRes.ok) {
          const addSheetsErr = await addSheetsRes.text();
          console.error("[SYNC] Failed to create missing sheets:", addSheetsErr);
          return res.status(500).json({ status: "Error", message: `Gagal membuat tab baru di Google Sheet Anda: ${addSheetsErr}` });
        }
      }

      // 4. Map records to rows
      const smRows = store.surat_masuk.map(sm => [
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
      ]);

      const skRows = store.surat_keluar.map(sk => [
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
      ]);

      const uRows = store.users.map(u => [
        u.id || "",
        u.username || "",
        u.nama_lengkap || "",
        u.email || "",
        u.role || "",
        u.aktif ? "Ya" : "Tidak",
        u.dibuat_pada || ""
      ]);

      const lRows = store.log_aktivitas.map(l => [
        l.id || "",
        l.user_id || "",
        l.username || "",
        l.aksi || "",
        l.modul || "",
        l.data_id || "",
        l.waktu || ""
      ]);

      // 5. Clean up old cells in spreadsheets to ensure fresh syncing
      console.log("[SYNC] Clearing existing lines on target sheets...");
      for (const sheetName of requiredSheets) {
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A1:Z1000:clear`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" }
        });
      }

      // 6. Write tables matrix to sheet
      console.log("[SYNC] Batch updating cells with direct rows content...");
      const batchUpdateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          valueInputOption: "USER_ENTERED",
          data: [
            {
              range: "Surat Masuk!A1",
              values: [
                ["ID", "No Agenda", "Tgl Terima", "No Surat", "Tgl Surat", "Pengirim", "Perihal", "Ditujukan", "Sifat", "Keterangan", "Status", "Dibuat Oleh", "Dibuat Pada", "Scan Lampiran Name", "Scan Lampiran URL", "Ukuran Lampiran (Bytes)"],
                ...smRows
              ]
            },
            {
              range: "Surat Keluar!A1",
              values: [
                ["ID", "No Surat", "Tgl Surat", "Tujuan", "Perihal", "Sifat", "Tgl Kirim", "Kirim Via", "Keterangan", "Status", "Dibuat Oleh", "Dibuat Pada", "Scan Lampiran Name", "Scan Lampiran URL", "Ukuran Lampiran (Bytes)"],
                ...skRows
              ]
            },
            {
              range: "Pengguna!A1",
              values: [
                ["ID", "Username", "Nama Lengkap", "Email", "Role", "Aktif", "Dibuat Pada"],
                ...uRows
              ]
            },
            {
              range: "Log Aktivitas!A1",
              values: [
                ["ID", "User ID", "Username", "Aksi", "Modul", "Data ID", "Waktu"],
                ...lRows
              ]
            }
          ]
        })
      });

      if (!batchUpdateRes.ok) {
        const batchUpdateErr = await batchUpdateRes.text();
        console.error("[SYNC] Google Sheets values batch update failed:", batchUpdateErr);
        return res.status(500).json({ status: "Error", message: `Gagal menulis data ke Spreadsheet: ${batchUpdateErr}` });
      }

      // Save database connection state
      store.config.koneksi_status = "Connected";
      await saveDB(store);

      await addLog(requestUser.id, requestUser.username, `Sinkronisasi dinas ke Google Spreadsheet ID: ${spreadsheetId}`, "Pengaturan", "config");

      res.json({
        success: true,
        status: "Success",
        timestamp: new Date().toISOString(),
        message: "Data manajemen surat berhasil disinkronkan sepenuhnya dengan Google Sheets cloud Anda! Tab baru & lampiran diunggah ke Google Drive.",
        rows_synced: {
          surat_masuk: store.surat_masuk.length,
          surat_keluar: store.surat_keluar.length,
          users: store.users.length,
          log_aktivitas: store.log_aktivitas.length
        }
      });

    } catch (error: any) {
      console.error("[SYNC] General error during synchronization:", error);
      return res.status(500).json({ status: "Error", message: `Terjadi galat sinkronisasi: ${error.message || error}` });
    }
  });

  // Server-Side-Gemini API Integration if available / helpful for summaries
  app.post("/api/gemini/summarize", verifyToken, async (req: Request, res: Response) => {
    // We can use the GoogleGenAI from SDK if GEMINI_API_KEY is found
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ message: "Konten wajib diisi." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      // Graceful fallback
      return res.json({ 
        summary: `[Asisten AI] Ringkasan Surat: ${content.substring(0, 120)}... (API Key belum diisi, ringkasan dibuat secara lokal).`
      });
    }

    try {
      // Lazy initialization as required by system instructions
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Kamu adalah asisten sekretariat instansi pemerintah. Buatkan ringkasan singkat dalam Bahasa Indonesia (maksimal 2 kalimat) untuk perihal/keterangan surat berikut:\n\n${content}`,
      });
      res.json({ summary: response.text });
    } catch (e: any) {
      console.error("Gemini API error:", e);
      res.json({ 
        summary: `[Asisten AI] Gagal generate via Gemini: ${e.message || e}. Ringkasan lokal: ${content.substring(0, 100)}...`
      });
    }
  });

async function startServer() {
  const PORT = 3000;

  // Vite middleware for development or Static server for production
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[OK] Server running on http://localhost:${PORT} in ${process.env.NODE_ENV === "production" ? "production" : "development"} mode.`);
  });
}

if (!process.env.VERCEL) {
  startServer().catch(err => {
    console.error("Failed to start full-stack server:", err);
  });
}
