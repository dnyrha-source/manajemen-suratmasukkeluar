/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { SuratKeluar, SifatSurat, StatusSuratKeluar, KirimVia, User } from "../types";
import { 
  Send, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  BookOpen, 
  FileSpreadsheet, 
  Printer, 
  Filter, 
  UploadCloud, 
  Download, 
  X, 
  ArrowUpDown,
  FileCheck,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { summarizeWithAiApi } from "../lib/api";

interface SuratKeluarProps {
  letters: SuratKeluar[];
  currentUser: Omit<User, 'password_hash'>;
  onAdd: (data: Partial<SuratKeluar>) => Promise<void>;
  onUpdate: (id: string, data: Partial<SuratKeluar>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  instansiKode: string;
}

export default function SuratKeluarList({ 
  letters, 
  currentUser, 
  onAdd, 
  onUpdate, 
  onDelete,
  instansiKode
}: SuratKeluarProps) {

  // States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSifat, setFilterSifat] = useState<SifatSurat | "">("");
  const [filterStatus, setFilterStatus] = useState<StatusSuratKeluar | "">("");
  const [filterTglMulai, setFilterTglMulai] = useState("");
  const [filterTglSelesai, setFilterTglSelesai] = useState("");
  const [sortField, setSortField] = useState<keyof SuratKeluar>("no_surat");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Active letter being viewed
  const [selectedLetter, setSelectedLetter] = useState<SuratKeluar | null>(null);

  // AI Summary
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Add/Edit Dialog modal
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingLetter, setEditingLetter] = useState<SuratKeluar | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [formNoSurat, setFormNoSurat] = useState("");
  const [formTglSurat, setFormTglSurat] = useState(new Date().toISOString().split("T")[0]);
  const [formTujuan, setFormTujuan] = useState("");
  const [formPerihal, setFormPerihal] = useState("");
  const [formSifat, setFormSifat] = useState<SifatSurat>("Biasa");
  const [formTglKirim, setFormTglKirim] = useState(""); // optional
  const [formVia, setFormVia] = useState<KirimVia>("Email");
  const [formKeterangan, setFormKeterangan] = useState("");
  const [formStatus, setFormStatus] = useState<StatusSuratKeluar>("Draft");
  const [formLampiranSrc, setFormLampiranSrc] = useState<string | null>(null);
  const [formLampiranName, setFormLampiranName] = useState<string | null>(null);
  const [formLampiranSize, setFormLampiranSize] = useState<number | null>(null);

  // Delete verify state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Files inputs reference
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sort helper
  const handleSort = (field: keyof SuratKeluar) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Upload scan files base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Gagal: Ukuran naskah lampiran maksimal 5MB sesuai standar.");
      return;
    }

    setFormLampiranName(file.name);
    setFormLampiranSize(file.size);

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setFormLampiranSrc(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // Open Form create
  const handleOpenAdd = () => {
    setEditingLetter(null);
    setFormTglSurat(new Date().toISOString().split("T")[0]);
    setFormTujuan("");
    setFormPerihal("");
    setFormSifat("Biasa");
    setFormTglKirim("");
    setFormVia("Email");
    setFormKeterangan("");
    setFormStatus("Draft");
    setFormLampiranSrc(null);
    setFormLampiranName(null);
    setFormLampiranSize(null);

    // Auto calculate provisional outward number
    const currentYear = new Date().getFullYear();
    const currentYearKeluar = letters.filter(s => s.no_surat.includes(`/${currentYear}`));
    let nextSeq = 1;
    if (currentYearKeluar.length > 0) {
      const seqList = currentYearKeluar.map(s => {
        const parts = s.no_surat.split("/");
        const seqNum = parseInt(parts[0]);
        return isNaN(seqNum) ? 0 : seqNum;
      });
      nextSeq = Math.max(...seqList) + 1;
    }
    const formattedSeq = nextSeq.toString().padStart(3, "0");
    const monthRom = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"][new Date().getMonth()];
    const placeholderNoSurat = `${formattedSeq}/SK/${instansiKode}/${monthRom}/${currentYear}`;
    
    setFormNoSurat(placeholderNoSurat);
    setShowFormModal(true);
  };

  // Open Form edit
  const handleOpenEdit = (letter: SuratKeluar) => {
    setEditingLetter(letter);
    setFormNoSurat(letter.no_surat);
    setFormTglSurat(letter.tgl_surat);
    setFormTujuan(letter.tujuan);
    setFormPerihal(letter.perihal);
    setFormSifat(letter.sifat);
    setFormTglKirim(letter.tgl_kirim || "");
    setFormVia(letter.via);
    setFormKeterangan(letter.keterangan);
    setFormStatus(letter.status);
    setFormLampiranSrc(letter.lampiran_url || null);
    setFormLampiranName(letter.lampiran_name || null);
    setFormLampiranSize(letter.lampiran_size || null);
    setShowFormModal(true);
  };

  // Save changes
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNoSurat || !formTujuan || !formPerihal) {
      alert("Silakan lengkapi semua field wajib.");
      return;
    }

    setSubmitting(true);
    const payload: Partial<SuratKeluar> = {
      no_surat: formNoSurat.trim(),
      tgl_surat: formTglSurat,
      tujuan: formTujuan.trim(),
      perihal: formPerihal.trim(),
      sifat: formSifat,
      tgl_kirim: formTglKirim,
      via: formVia,
      keterangan: formKeterangan.trim(),
      status: formStatus,
      lampiran_name: formLampiranName || undefined,
      lampiran_size: formLampiranSize || undefined,
      lampiran_url: formLampiranSrc || undefined
    };

    try {
      if (editingLetter) {
        await onUpdate(editingLetter.id, payload);
      } else {
        await onAdd(payload);
      }
      setShowFormModal(false);
    } catch (err: any) {
      alert(err.message || "Gagal menyimpan rincian surat keluar.");
    } finally {
      setSubmitting(false);
    }
  };

  const triggerAiSummarize = async (letter: SuratKeluar) => {
    setAiLoading(true);
    setAiSummary(null);
    try {
      const data = await summarizeWithAiApi(`${letter.perihal}\nKeterangan: ${letter.keterangan || "None"}\nTujuan: ${letter.tujuan}`);
      setAiSummary(data.summary);
    } catch (e) {
      setAiSummary("Koneksi gagal atau API tidak merespons.");
    } finally {
      setAiLoading(false);
    }
  };

  // Searching & Advanced Filter
  const filteredLetters = letters.filter(letter => {
    const matchesSearch = 
      letter.no_surat.toLowerCase().includes(searchQuery.toLowerCase()) ||
      letter.tujuan.toLowerCase().includes(searchQuery.toLowerCase()) ||
      letter.perihal.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSifat = filterSifat === "" || letter.sifat === filterSifat;
    const matchesStatus = filterStatus === "" || letter.status === filterStatus;

    let matchesDate = true;
    if (filterTglMulai) {
      matchesDate = matchesDate && letter.tgl_surat >= filterTglMulai;
    }
    if (filterTglSelesai) {
      matchesDate = matchesDate && letter.tgl_surat <= filterTglSelesai;
    }

    return matchesSearch && matchesSifat && matchesStatus && matchesDate;
  });

  // Sort
  const sortedLetters = [...filteredLetters].sort((a, b) => {
    let fieldA = a[sortField];
    let fieldB = b[sortField];

    if (!fieldA) return 1;
    if (!fieldB) return -1;

    if (typeof fieldA === "string" && typeof fieldB === "string") {
      return sortOrder === "asc"
        ? fieldA.localeCompare(fieldB)
        : fieldB.localeCompare(fieldA);
    }
    return 0;
  });

  // Pagination bounds
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLetters = sortedLetters.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedLetters.length / itemsPerPage);

  // F34: Excel Pseudo XML Export
  const handleExportExcel = () => {
    let xml = `<?xml version="1.0" encoding="utf-8"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="Surat Keluar">
    <Table>
      <Row>
        <Cell><Data ss:Type="String">Nomor Surat</Data></Cell>
        <Cell><Data ss:Type="String">Tanggal Pembuatan</Data></Cell>
        <Cell><Data ss:Type="String">Tujuan Penerima</Data></Cell>
        <Cell><Data ss:Type="String">Perihal</Data></Cell>
        <Cell><Data ss:Type="String">Sifat Surat</Data></Cell>
        <Cell><Data ss:Type="String">Tanggal Kirim</Data></Cell>
        <Cell><Data ss:Type="String">Dikirim Via</Data></Cell>
        <Cell><Data ss:Type="String">Status</Data></Cell>
        <Cell><Data ss:Type="String">Keterangan</Data></Cell>
        <Cell><Data ss:Type="String">Input Oleh</Data></Cell>
      </Row>`;

    sortedLetters.forEach(l => {
      xml += `
      <Row>
        <Cell><Data ss:Type="String">${l.no_surat}</Data></Cell>
        <Cell><Data ss:Type="String">${l.tgl_surat}</Data></Cell>
        <Cell><Data ss:Type="String">${l.tujuan}</Data></Cell>
        <Cell><Data ss:Type="String">${l.perihal}</Data></Cell>
        <Cell><Data ss:Type="String">${l.sifat}</Data></Cell>
        <Cell><Data ss:Type="String">${l.tgl_kirim || "-"}</Data></Cell>
        <Cell><Data ss:Type="String">${l.via}</Data></Cell>
        <Cell><Data ss:Type="String">${l.status}</Data></Cell>
        <Cell><Data ss:Type="String">${l.keterangan || "-"}</Data></Cell>
        <Cell><Data ss:Type="String">${l.dibuat_oleh}</Data></Cell>
      </Row>`;
    });

    xml += `
    </Table>
  </Worksheet>
</Workbook>`;

    const blob = new Blob([xml], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Data_Surat_Keluar_${new Date().toISOString().slice(0,10)}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
        <div>
          <h2 className="text-xl font-bold text-slate-800 font-display flex items-center gap-2">
            <Send className="h-6 w-6 text-indigo-600" />
            Buku Agenda Surat Keluar
          </h2>
          <p className="text-xs text-slate-400 mt-1">Registrasi dan arsip diseminasi surat dinas eksternal/internal</p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 rounded-xl transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Ekspor Excel
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            Cetak
          </button>

          {currentUser.role !== "Viewer" && (
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="h-4.5 w-4.5" />
              Buat Surat Keluar
            </button>
          )}
        </div>
      </div>

      {/* Advanced Search & Filtering (no-print) */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4 no-print anim-fade-in">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Cari surat berdasarkan nomor surat, tujuan penerima, perihal..."
              className="block w-full pl-10 pr-3 py-2.5 border border-slate-205 rounded-xl focus:outline-hidden focus:border-blue-600 focus:ring-0 text-xs text-slate-800 bg-slate-50/50 hover:bg-slate-50 focus:bg-white transition-all font-medium"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterSifat}
              onChange={(e) => { setFilterSifat(e.target.value as any); setCurrentPage(1); }}
              className="border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-600 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">Sifat: Semua</option>
              <option value="Biasa">Biasa</option>
              <option value="Penting">Penting</option>
              <option value="Rahasia">Rahasia</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value as any); setCurrentPage(1); }}
              className="border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-600 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">Status: Semua</option>
              <option value="Draft">Draft</option>
              <option value="Terkirim">Terkirim</option>
              <option value="Diterima">Diterima</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-50 text-xs">
          <span className="flex items-center gap-1 text-slate-400 font-semibold uppercase tracking-wider font-mono">
            <Filter className="h-3.5 w-3.5" /> Tanggal Pembuatan:
          </span>
          
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filterTglMulai}
              onChange={(e) => { setFilterTglMulai(e.target.value); setCurrentPage(1); }}
              className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-600"
            />
            <span className="text-slate-400">s/d</span>
            <input
              type="date"
              value={filterTglSelesai}
              onChange={(e) => { setFilterTglSelesai(e.target.value); setCurrentPage(1); }}
              className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-600"
            />

            {(filterTglMulai || filterTglSelesai || filterSifat || filterStatus || searchQuery) && (
              <button
                onClick={() => {
                  setFilterTglMulai("");
                  setFilterTglSelesai("");
                  setFilterSifat("");
                  setFilterStatus("");
                  setSearchQuery("");
                  setCurrentPage(1);
                }}
                className="text-red-500 hover:text-red-700 font-bold ml-2 hover:underline flex items-center gap-0.5"
              >
                Clear Filter
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Mail Table */}
      <div className="bg-white rounded-2xl border border-slate-205 shadow-xs overflow-hidden anim-fade-in print:border-0 print:shadow-none">
        
        {/* Printable instansi header shown only during browser printing */}
        <div className="hidden print:block mb-8 text-center border-b-4 border-double border-slate-950 pb-4">
          <h1 className="text-xl font-bold uppercase tracking-wide">Pemerintah Provinsi Jawa Barat</h1>
          <h2 className="text-lg font-bold uppercase">Dinas Pendidikan Pemuda &amp; Olahraga</h2>
          <p className="text-xs font-mono">Cabang Cabang Wilayah V Prov. Bandung • Telp 022-XXXXX</p>
          <div className="mt-4 text-center font-bold underline font-display uppercase tracking-widest text-sm">
            BUKU AGENDA REGISTRASI SURAT KELUAR
          </div>
          {filterTglMulai && (
            <p className="text-[10px] font-mono mt-1">Periode: {filterTglMulai} s/d {filterTglSelesai || "Hari ini"}</p>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono print:bg-transparent">
                <th onClick={() => handleSort("no_surat")} className="py-4 px-4 cursor-pointer hover:bg-slate-100 select-none print:px-2">
                  <span className="flex items-center gap-1 shrink-0">Nomor Surat <ArrowUpDown className="h-3 w-3" /></span>
                </th>
                <th onClick={() => handleSort("tgl_surat")} className="py-4 px-3 cursor-pointer hover:bg-slate-100 select-none">
                  <span className="flex items-center gap-1">Tgl Buat <ArrowUpDown className="h-3 w-3" /></span>
                </th>
                <th className="py-4 px-3">Tujuan Penerima</th>
                <th className="py-4 px-3">Isi Perihal</th>
                <th className="py-4 px-3">Tanggal Kirim / Via</th>
                <th className="py-4 px-2 w-24">Sifat</th>
                <th className="py-4 px-2 w-24">Status</th>
                <th className="py-4 px-4 text-right no-print">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {currentLetters.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                    Tidak ditemukan kecocokan data agenda surat keluar.
                  </td>
                </tr>
              ) : (
                currentLetters.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/40 transition-colors duration-150 print:hover:bg-transparent">
                    <td className="py-3 px-4 font-bold font-mono text-indigo-600 print:text-black print:px-2">{l.no_surat}</td>
                    <td className="py-3 px-3 font-medium text-slate-500">{l.tgl_surat}</td>
                    <td className="py-3 px-3 font-semibold text-slate-800 max-w-[160px] truncate">{l.tujuan}</td>
                    <td className="py-3 px-3 max-w-[200px] font-medium text-slate-700 truncate">{l.perihal}</td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-800">{l.tgl_kirim || "-"}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">Metode: {l.via}</div>
                    </td>
                    <td className="py-3 px-2">
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold select-none ${
                        l.sifat === "Penting" ? "bg-red-50 text-red-700 border border-red-100" : 
                        l.sifat === "Rahasia" ? "bg-purple-50 text-purple-700 border border-purple-100" : 
                        "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}>
                        {l.sifat}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold select-none flex items-center w-fit gap-1 ${
                        l.status === "Diterima" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : 
                        l.status === "Terkirim" ? "bg-blue-50 text-blue-700 border border-blue-100" : 
                        "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          l.status === "Diterima" ? "bg-emerald-500" : 
                          l.status === "Terkirim" ? "bg-blue-500" : 
                          "bg-slate-450"
                        }`} />
                        {l.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap no-print">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => { setSelectedLetter(l); setAiSummary(null); }}
                          title="Lihat Detail & Analisis AI"
                          className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <BookOpen className="h-4 w-4" />
                        </button>

                        {currentUser.role !== "Viewer" && (
                          <button
                            onClick={() => handleOpenEdit(l)}
                            title="Ubah Rincian"
                            className="p-1.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                        )}

                        {(currentUser.role === "Super Admin" || currentUser.role === "Admin") && (
                          <button
                            onClick={() => setDeleteConfirmId(l.id)}
                            title="Hapus Agenda"
                            className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginator block */}
        {totalPages > 1 && (
          <div className="py-4 px-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between no-print text-xs">
            <span className="text-slate-500">
              Menampilkan <span className="font-bold">{indexOfFirstItem + 1}</span>-{Math.min(indexOfLastItem, sortedLetters.length)} dari <span className="font-bold">{sortedLetters.length}</span> surat keluar
            </span>
            <div className="inline-flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 font-semibold cursor-pointer"
              >
                Kembali
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(num => (
                <button
                  key={num}
                  onClick={() => setCurrentPage(num)}
                  className={`px-3 py-1.5 rounded-lg border font-bold cursor-pointer ${currentPage === num ? 'bg-indigo-650 text-white border-indigo-650' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                >
                  {num}
                </button>
              ))}
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 font-semibold cursor-pointer"
              >
                Lanjut
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Letter Outward Box */}
      <AnimatePresence>
        {selectedLetter && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-start justify-center p-4 bg-slate-900/40 backdrop-blur-xs font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden border border-slate-100 shadow-2xl relative my-auto"
            >
              <div className="bg-slate-900/5 py-4 px-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5 text-indigo-600" />
                  <span className="text-xs uppercase font-extrabold tracking-wider font-mono text-slate-500">Lembar Penelusuran Surat Keluar</span>
                </div>
                <button
                  onClick={() => { setSelectedLetter(null); setAiSummary(null); }}
                  className="p-1 rounded-full hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5 text-slate-500" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Registrasi Nomor Surat</span>
                    <span className="text-sm font-extrabold text-slate-800 font-mono tracking-tight">{selectedLetter.no_surat}</span>
                  </div>
                  <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Klasifikasi Sifat</span>
                    <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-md mt-1 ${
                      selectedLetter.sifat === "Penting" ? "bg-red-100 text-red-800" :
                      selectedLetter.sifat === "Rahasia" ? "bg-purple-100 text-purple-800" :
                      "bg-slate-100 text-slate-600"
                    }`}>{selectedLetter.sifat}</span>
                  </div>
                </div>

                <div className="space-y-3.5 text-xs">
                  <div className="grid grid-cols-3 border-b border-slate-50 pb-2">
                    <span className="font-bold text-slate-400 uppercase tracking-widest font-mono text-[9px]">Tujuan Penerima</span>
                    <span className="col-span-2 font-semibold text-slate-900">{selectedLetter.tujuan}</span>
                  </div>
                  <div className="grid grid-cols-3 border-b border-slate-50 pb-2">
                    <span className="font-bold text-slate-400 uppercase tracking-widest font-mono text-[9px]">Tanggal Pembuatan</span>
                    <span className="col-span-2 text-slate-700 font-mono">{selectedLetter.tgl_surat}</span>
                  </div>
                  <div className="grid grid-cols-3 border-b border-slate-50 pb-2">
                    <span className="font-bold text-slate-400 uppercase tracking-widest font-mono text-[9px]">Tanggal Kirim</span>
                    <span className="col-span-2 text-slate-700 font-mono">{selectedLetter.tgl_kirim || "Belum dikirim (Draft)"}</span>
                  </div>
                  <div className="grid grid-cols-3 border-b border-slate-50 pb-2">
                    <span className="font-bold text-slate-400 uppercase tracking-widest font-mono text-[9px]">Dikirim Melalui (Via)</span>
                    <span className="col-span-2 text-slate-700 font-semibold">{selectedLetter.via}</span>
                  </div>
                  <div className="grid grid-cols-3 border-b border-slate-50 pb-2">
                    <span className="font-bold text-slate-400 uppercase tracking-widest font-mono text-[9px]">Uraian Perihal</span>
                    <span className="col-span-2 text-slate-800 font-bold">{selectedLetter.perihal}</span>
                  </div>
                  <div className="grid grid-cols-3 border-b border-slate-50 pb-2">
                    <span className="font-bold text-slate-400 uppercase tracking-widest font-mono text-[9px]">Status Dokumen</span>
                    <span className="col-span-2 font-bold text-blue-600">{selectedLetter.status}</span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="font-bold text-slate-400 uppercase tracking-widest font-mono text-[9px]">Catatan / Lampiran Informasi</span>
                    <span className="col-span-2 text-slate-600 whitespace-pre-line leading-relaxed">{selectedLetter.keterangan || "-"}</span>
                  </div>
                </div>

                {/* Uploaded Physical Sign Verification Scan (F25) */}
                {selectedLetter.lampiran_name && (
                  <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-amber-500 rounded-lg text-white">
                        <UploadCloud className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 truncate max-w-xs">{selectedLetter.lampiran_name}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{formatBytes(selectedLetter.lampiran_size)} • Naskah bertandatangan</p>
                      </div>
                    </div>
                    <a
                      href={selectedLetter.lampiran_url || "#"}
                      download={selectedLetter.lampiran_name}
                      onClick={(e) => {
                        if (!selectedLetter.lampiran_url) {
                          e.preventDefault();
                          alert("Aplikasi Demo: Mengunduh draf naskah basah...");
                        }
                      }}
                      className="px-3 py-1.5 bg-white border border-amber-200 text-amber-700 hover:bg-amber-100/50 font-bold rounded-lg flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5" /> Unduh
                    </a>
                  </div>
                )}

                {/* AI Summary Block */}
                <div className="p-5 rounded-2xl bg-indigo-50 border border-indigo-50 space-y-3.5 relative overflow-hidden">
                  <div className="absolute right-0 bottom-0 transform translate-x-3 translate-y-3 shrink-0 select-none opacity-5">
                    <Sparkles className="h-24 w-24 text-indigo-600" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-indigo-800 font-bold text-xs font-display">
                      <Sparkles className="h-4.5 w-4.5 text-indigo-600 animate-pulse" />
                      Asisten AI Gemini Smart Summary
                    </div>
                    <button
                      type="button"
                      disabled={aiLoading}
                      onClick={() => triggerAiSummarize(selectedLetter)}
                      className="text-[10px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      {aiLoading ? "Mengoreksi..." : "Hasilkan Ringkasan"}
                    </button>
                  </div>
                  <div className="text-xs leading-relaxed text-indigo-900/80">
                    {aiLoading ? (
                      <div className="flex items-center gap-2 py-1">
                        <span className="flex h-2 w-2 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-505"></span>
                        </span>
                        <span className="text-indigo-700 font-semibold italic">Gemini sedang menstruktur draf naskah rujukan keluar...</span>
                      </div>
                    ) : aiSummary ? (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-semibold bg-white/70 p-3 rounded-xl border border-indigo-150">
                        {aiSummary}
                      </motion.div>
                    ) : (
                      "Tekan tombol untuk merangkum naskah keluar secara otomatis menggunakan kecerdasan kognitif Gemini."
                    )}
                  </div>
                </div>
              </div>

              <div className="py-4 px-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="text-slate-400">
                  <p>Daftar oleh: <strong className="text-slate-600">@{selectedLetter.dibuat_oleh}</strong></p>
                  <p>Daftar pada: {new Date(selectedLetter.dibuat_pada).toLocaleDateString()}</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setSelectedLetter(null); setAiSummary(null); }}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-350 text-slate-800 font-bold rounded-xl transition-colors cursor-pointer text-xs"
                >
                  Tutup / Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Form Add/Edit box */}
      <AnimatePresence>
        {showFormModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-start justify-center p-4 bg-slate-900/40 backdrop-blur-xs font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-xl overflow-hidden border border-slate-100 shadow-2xl my-auto"
            >
              <div className="bg-slate-900/5 py-4 px-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 font-display">
                  {editingLetter ? "Ubah Registrasi Surat Keluar" : "Buat Nomor/Registrasi Surat Keluar"}
                </h3>
                <button
                  onClick={() => setShowFormModal(false)}
                  className="p-1 rounded-full hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
                
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Registrasi Nomor Surat Keluar (Generated) *</label>
                  <input
                    type="text"
                    required
                    value={formNoSurat}
                    onChange={(e) => setFormNoSurat(e.target.value)}
                    placeholder="Contoh: 001/SK/DISDIK-V/VI/2026"
                    className="block w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500/20 font-mono font-bold"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Sistem menyarankan nomor berdasarkan pola urutan instansi. Anda bisa mengubahnya manual.</p>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Tanggal Surat *</label>
                    <input
                      type="date"
                      required
                      value={formTglSurat}
                      onChange={(e) => setFormTglSurat(e.target.value)}
                      className="block w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Tanggal Pengiriman (Opsional)</label>
                    <input
                      type="date"
                      value={formTglKirim}
                      onChange={(e) => setFormTglKirim(e.target.value)}
                      className="block w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Tujuan Penerima / Instansi *</label>
                  <input
                    type="text"
                    required
                    value={formTujuan}
                    onChange={(e) => setFormTujuan(e.target.value)}
                    placeholder="Dinas, Perusahaan, atau Nama Penerima Surat..."
                    className="block w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500/20 font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Sifat Klasifikasi</label>
                    <select
                      value={formSifat}
                      onChange={(e) => setFormSifat(e.target.value as SifatSurat)}
                      className="block w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-700 font-medium"
                    >
                      <option value="Biasa">Biasa</option>
                      <option value="Penting">Penting</option>
                      <option value="Rahasia">Rahasia</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Kirim Melalui (Via) *</label>
                    <select
                      value={formVia}
                      onChange={(e) => setFormVia(e.target.value as KirimVia)}
                      className="block w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-700 font-medium"
                    >
                      <option value="Email">Email Elektronik</option>
                      <option value="Pos">Kurir Pos Logistik</option>
                      <option value="Kurir">Kurir Internal Instansi</option>
                      <option value="Langsung">Diserahkan Langsung</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Isi Perihal / Jenis Naskah *</label>
                  <input
                    type="text"
                    required
                    value={formPerihal}
                    onChange={(e) => setFormPerihal(e.target.value)}
                    placeholder="Contoh: Permohonan Server, Undangan Rapat Evaluasi..."
                    className="block w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500/20 font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Status Naskah</label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as StatusSuratKeluar)}
                      className="block w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-700 font-medium"
                    >
                      <option value="Draft">Draft (Dalam Konsep)</option>
                      <option value="Terkirim">Terkirim (Sudah Ekspedisi)</option>
                      <option value="Diterima">Diterima (Tanda Terima Selesai)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Uraian / Keterangan</label>
                    <input
                      type="text"
                      value={formKeterangan}
                      onChange={(e) => setFormKeterangan(e.target.value)}
                      placeholder="Uraian disposisi rincian rujukan..."
                      className="block w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                {/* Upload scan file verified (F25) */}
                <div className="space-y-1.5">
                  <label className="block text-slate-600 font-semibold">Lampirkan Dokumen Basah / Signed (Maks 5MB • PDF/JPG)</label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 rounded-xl p-3 text-center cursor-pointer hover:border-indigo-500 hover:bg-slate-50 transition-all"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                    />
                    {formLampiranName ? (
                      <div className="flex items-center justify-center gap-2 font-semibold text-indigo-600 text-xs">
                        <UploadCloud className="h-5 w-5 shrink-0" />
                        <span className="truncate max-w-[240px]">{formLampiranName}</span>
                        <span className="text-slate-400 font-mono">({formatBytes(formLampiranSize || 0)})</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFormLampiranName(null);
                            setFormLampiranSrc(null);
                            setFormLampiranSize(null);
                          }}
                          className="p-1 hover:bg-slate-200 rounded-full text-red-500"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1 text-slate-500">
                        <div className="flex justify-center"><UploadCloud className="h-6 w-6 text-slate-400" /></div>
                        <p className="font-semibold text-[11px] text-slate-500">Klik untuk menyematkan salinan dokumen PDF keluar yang bertandatangan</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowFormModal(false)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-100 font-semibold cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 font-bold rounded-xl flex items-center gap-1 cursor-pointer"
                  >
                    {submitting ? (
                      <span className="flex items-center gap-1.5">
                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Menyimpan...
                      </span>
                    ) : (
                      "Simpan Agenda"
                    )}
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Verify Alert */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-sm p-6 border border-slate-100 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-2.5 text-red-650">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Trash2 className="h-5 w-5 text-red-650" />
                </div>
                <h3 className="font-bold text-base font-display text-slate-850">Konfirmasi Hapus</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Apakah Anda benar-benar ingin mendisposisikan penghapusan permanen naskah keluar ini? Catatan riwayat ini akan hilang.
              </p>
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-4 py-1.5 border border-slate-200 rounded-xl text-slate-500 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const id = deleteConfirmId;
                    setDeleteConfirmId(null);
                    try {
                      await onDelete(id);
                    } catch (e: any) {
                      alert(e.message || "Gagal menghapus data.");
                    }
                  }}
                  className="px-4 py-1.5 text-white bg-red-600 hover:bg-red-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Hapus Permanen
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
