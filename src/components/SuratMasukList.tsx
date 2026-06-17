/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { SuratMasuk, SifatSurat, StatusSuratMasuk, User } from "../types";
import { 
  Inbox, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  BookOpen, 
  FileSpreadsheet, 
  Printer, 
  Calendar, 
  Filter, 
  UploadCloud, 
  Download, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Sparkles,
  ArrowUpDown,
  BookMarked
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { summarizeWithAiApi } from "../lib/api";

interface SuratMasukProps {
  letters: SuratMasuk[];
  currentUser: Omit<User, 'password_hash'>;
  onAdd: (data: Partial<SuratMasuk>) => Promise<void>;
  onUpdate: (id: string, data: Partial<SuratMasuk>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function SuratMasukList({ 
  letters, 
  currentUser, 
  onAdd, 
  onUpdate, 
  onDelete 
}: SuratMasukProps) {
  
  // States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSifat, setFilterSifat] = useState<SifatSurat | "">("");
  const [filterStatus, setFilterStatus] = useState<StatusSuratMasuk | "">("");
  const [filterTglMulai, setFilterTglMulai] = useState("");
  const [filterTglSelesai, setFilterTglSelesai] = useState("");
  const [sortField, setSortField] = useState<keyof SuratMasuk>("no_agenda");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Active letter being viewed in modal
  const [selectedLetter, setSelectedLetter] = useState<SuratMasuk | null>(null);
  
  // AI summarization state
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Add/Edit Dialog state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingLetter, setEditingLetter] = useState<SuratMasuk | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [formTglTerima, setFormTglTerima] = useState(new Date().toISOString().split("T")[0]);
  const [formNoSurat, setFormNoSurat] = useState("");
  const [formTglSurat, setFormTglSurat] = useState(new Date().toISOString().split("T")[0]);
  const [formPengirim, setFormPengirim] = useState("");
  const [formPerihal, setFormPerihal] = useState("");
  const [formDitujukan, setFormDitujukan] = useState("");
  const [formSifat, setFormSifat] = useState<SifatSurat>("Biasa");
  const [formKeterangan, setFormKeterangan] = useState("");
  const [formStatus, setFormStatus] = useState<StatusSuratMasuk>("Baru");
  const [formLampiranSrc, setFormLampiranSrc] = useState<string | null>(null);
  const [formLampiranName, setFormLampiranName] = useState<string | null>(null);
  const [formLampiranSize, setFormLampiranSize] = useState<number | null>(null);

  // Delete confirm state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Reference for file input
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sort handler
  const handleSort = (field: keyof SuratMasuk) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Convert uploaded scan file to base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Gagal: Ukuran lampiran maksimal adalah 5MB sesuai panduan naskah.");
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

  // Open Form for Adding
  const handleOpenAdd = () => {
    setEditingLetter(null);
    setFormTglTerima(new Date().toISOString().split("T")[0]);
    setFormNoSurat("");
    setFormTglSurat(new Date().toISOString().split("T")[0]);
    setFormPengirim("");
    setFormPerihal("");
    setFormDitujukan("");
    setFormSifat("Biasa");
    setFormKeterangan("");
    setFormStatus("Baru");
    setFormLampiranSrc(null);
    setFormLampiranName(null);
    setFormLampiranSize(null);
    setShowFormModal(true);
  };

  // Open Form for Editing
  const handleOpenEdit = (letter: SuratMasuk) => {
    setEditingLetter(letter);
    setFormTglTerima(letter.tgl_terima);
    setFormNoSurat(letter.no_surat);
    setFormTglSurat(letter.tgl_surat);
    setFormPengirim(letter.pengirim);
    setFormPerihal(letter.perihal);
    setFormDitujukan(letter.ditujukan);
    setFormSifat(letter.sifat);
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
    if (!formNoSurat || !formPengirim || !formPerihal || !formDitujukan) {
      alert("Silakan lengkapi semua field wajib.");
      return;
    }

    setSubmitting(true);
    const payload: Partial<SuratMasuk> = {
      tgl_terima: formTglTerima,
      no_surat: formNoSurat.trim(),
      tgl_surat: formFormatedDate(formTglSurat),
      pengirim: formPengirim.trim(),
      perihal: formPerihal.trim(),
      ditujukan: formDitujukan.trim(),
      sifat: formSifat,
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
      alert(err.message || "Gagal menyimpan data.");
    } finally {
      setSubmitting(false);
    }
  };

  const formFormatedDate = (dateStr: string) => {
    return dateStr;
  };

  // AI execution tool
  const triggerAiSummarize = async (letter: SuratMasuk) => {
    setAiLoading(true);
    setAiSummary(null);
    try {
      const data = await summarizeWithAiApi(`${letter.perihal}\nKeterangan: ${letter.keterangan || "None"}\nPengirim: ${letter.pengirim}`);
      setAiSummary(data.summary);
    } catch (e) {
      setAiSummary("Koneksi gagal atau API tidak merespons.");
    } finally {
      setAiLoading(false);
    }
  };

  // Search and Advanced Filters logic
  const filteredLetters = letters.filter(letter => {
    // 1. Search filter
    const matchesSearch = 
      letter.no_surat.toLowerCase().includes(searchQuery.toLowerCase()) ||
      letter.no_agenda.toLowerCase().includes(searchQuery.toLowerCase()) ||
      letter.pengirim.toLowerCase().includes(searchQuery.toLowerCase()) ||
      letter.perihal.toLowerCase().includes(searchQuery.toLowerCase());
    
    // 2. Sifat filter
    const matchesSifat = filterSifat === "" || letter.sifat === filterSifat;

    // 3. Status filter
    const matchesStatus = filterStatus === "" || letter.status === filterStatus;

    // 4. Date range filter
    let matchesDate = true;
    if (filterTglMulai) {
      matchesDate = matchesDate && letter.tgl_terima >= filterTglMulai;
    }
    if (filterTglSelesai) {
      matchesDate = matchesDate && letter.tgl_terima <= filterTglSelesai;
    }

    return matchesSearch && matchesSifat && matchesStatus && matchesDate;
  });

  // Sort logic
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

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLetters = sortedLetters.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedLetters.length / itemsPerPage);

  // F34: Excel Export (.xlsx pseudo-XML format that Excel reads perfectly as clean worksheet)
  const handleExportExcel = () => {
    let xml = `<?xml version="1.0" encoding="utf-8"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="Surat Masuk">
    <Table>
      <Row>
        <Cell><Data ss:Type="String">No. Agenda</Data></Cell>
        <Cell><Data ss:Type="String">Tanggal Terima</Data></Cell>
        <Cell><Data ss:Type="String">Nomor Surat</Data></Cell>
        <Cell><Data ss:Type="String">Tanggal Surat</Data></Cell>
        <Cell><Data ss:Type="String">Asal/Pengirim</Data></Cell>
        <Cell><Data ss:Type="String">Perihal</Data></Cell>
        <Cell><Data ss:Type="String">Ditujukan</Data></Cell>
        <Cell><Data ss:Type="String">Sifat Surat</Data></Cell>
        <Cell><Data ss:Type="String">Status</Data></Cell>
        <Cell><Data ss:Type="String">Keterangan</Data></Cell>
        <Cell><Data ss:Type="String">Input Oleh</Data></Cell>
      </Row>`;

    sortedLetters.forEach(l => {
      xml += `
      <Row>
        <Cell><Data ss:Type="String">${l.no_agenda}</Data></Cell>
        <Cell><Data ss:Type="String">${l.tgl_terima}</Data></Cell>
        <Cell><Data ss:Type="String">${l.no_surat}</Data></Cell>
        <Cell><Data ss:Type="String">${l.tgl_surat}</Data></Cell>
        <Cell><Data ss:Type="String">${l.pengirim}</Data></Cell>
        <Cell><Data ss:Type="String">${l.perihal}</Data></Cell>
        <Cell><Data ss:Type="String">${l.ditujukan}</Data></Cell>
        <Cell><Data ss:Type="String">${l.sifat}</Data></Cell>
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
    a.download = `Data_Surat_Masuk_${new Date().toISOString().slice(0,10)}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Helper unit converter
  const formatBytes = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  // Trigger Print Friendly window
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Header operations */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
        <div>
          <h2 className="text-xl font-bold text-slate-800 font-display flex items-center gap-2">
            <Inbox className="h-6 w-6 text-blue-600" />
            Buku Agenda Surat Masuk
          </h2>
          <p className="text-xs text-slate-400 mt-1">Registrasi dan pengelolaan dokumentasi surat masuk instansi</p>
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
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="h-4.5 w-4.5" />
              Tambah Surat Masuk
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filter and Search Bar (no-print) */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4 no-print anim-fade-in">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Main Search input */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Cari surat berdasarkan no. agenda, nomor surat, pengirim atau perihal..."
              className="block w-full pl-10 pr-3 py-2.5 border border-slate-205 rounded-xl focus:outline-hidden focus:border-blue-600 focus:ring-0 text-xs text-slate-800 bg-slate-50/50 hover:bg-slate-50 focus:bg-white transition-all font-medium"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Sifat Filter */}
            <select
              value={filterSifat}
              onChange={(e) => { setFilterSifat(e.target.value as any); setCurrentPage(1); }}
              className="border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-600 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">Sifat: Semua</option>
              <option value="Biasa">Biasa</option>
              <option value="Penting">Penting</option>
              <option value="Rahasia">Rahasia</option>
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value as any); setCurrentPage(1); }}
              className="border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-600 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">Status: Semua</option>
              <option value="Baru">Baru</option>
              <option value="Proses">Diproses</option>
              <option value="Selesai">Selesai</option>
            </select>
          </div>
        </div>

        {/* Date Filters Expandable */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-50 text-xs">
          <span className="flex items-center gap-1 text-slate-400 font-semibold uppercase tracking-wider font-mono">
            <Filter className="h-3.5 w-3.5" /> Rentang Terima:
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

      {/* Main Mail Table Block */}
      <div className="bg-white rounded-2xl border border-slate-205 shadow-xs overflow-hidden anim-fade-in print:border-0 print:shadow-none">
        
        {/* Printable instansi header template shown only during browser printing */}
        <div className="hidden print:block mb-8 text-center border-b-4 border-double border-slate-950 pb-4">
          <h1 className="text-xl font-bold uppercase tracking-wide">Pemerintah Provinsi Jawa Barat</h1>
          <h2 className="text-lg font-bold uppercase">Dinas Pendidikan Pemuda &amp; Olahraga</h2>
          <p className="text-xs font-mono">Cabang Cabang Wilayah V Prov. Bandung • Telp 022-XXXXX</p>
          <div className="mt-4 text-center font-bold underline font-display uppercase tracking-widest text-sm">
            BUKU AGENDA REGISTRASI SURAT MASUK
          </div>
          {filterTglMulai && (
            <p className="text-[10px] font-mono mt-1">Periode: {filterTglMulai} s/d {filterTglSelesai || "Hari ini"}</p>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono print:bg-transparent">
                <th onClick={() => handleSort("no_agenda")} className="py-4 px-4 cursor-pointer hover:bg-slate-100 select-none print:px-2">
                  <span className="flex items-center gap-1 shrink-0">No Agenda <ArrowUpDown className="h-3 w-3" /></span>
                </th>
                <th onClick={() => handleSort("tgl_terima")} className="py-4 px-3 cursor-pointer hover:bg-slate-100 select-none">
                  <span className="flex items-center gap-1">Tgl Terima <ArrowUpDown className="h-3 w-3" /></span>
                </th>
                <th className="py-4 px-3">Nomor Surat / Tanggal</th>
                <th className="py-4 px-3">Asal Pengirim</th>
                <th className="py-4 px-3">Ringkasan Perihal</th>
                <th className="py-4 px-2 w-24">Sifat</th>
                <th className="py-4 px-2 w-24">Status</th>
                <th className="py-4 px-4 text-right no-print">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {currentLetters.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                    Tidak ditemukan kecocokan data agenda surat masuk.
                  </td>
                </tr>
              ) : (
                currentLetters.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/40 transition-colors duration-150 print:hover:bg-transparent">
                    <td className="py-3 px-4 font-bold font-mono text-blue-600 print:text-black print:px-2">{l.no_agenda}</td>
                    <td className="py-3 px-3 font-medium text-slate-500">{l.tgl_terima}</td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900 font-mono text-[11px] break-all">{l.no_surat}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{l.tgl_surat}</div>
                    </td>
                    <td className="py-3 px-3 max-w-[160px] truncate font-medium text-slate-800">{l.pengirim}</td>
                    <td className="py-3 px-3 max-w-[200px]">
                      <span className="font-semibold text-slate-800 block line-clamp-1">{l.perihal}</span>
                      <span className="text-[10px] text-slate-400 line-clamp-1">{l.ditujukan}</span>
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
                        l.status === "Selesai" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : 
                        l.status === "Proses" ? "bg-blue-50 text-blue-700 border border-blue-100" : 
                        "bg-amber-50 text-amber-700 border border-amber-100"
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          l.status === "Selesai" ? "bg-emerald-500" : 
                          l.status === "Proses" ? "bg-blue-500" : 
                          "bg-amber-500"
                        }`} />
                        {l.status === "Proses" ? "Diproses" : l.status}
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
                            title="Ubah Data"
                            className="p-1.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                        )}

                        {(currentUser.role === "Super Admin" || currentUser.role === "Admin") && (
                          <button
                            onClick={() => setDeleteConfirmId(l.id)}
                            title="Hapus"
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

        {/* Paginator block (no-print) */}
        {totalPages > 1 && (
          <div className="py-4 px-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between no-print text-xs">
            <span className="text-slate-500">
              Menampilkan <span className="font-bold">{indexOfFirstItem + 1}</span>-{Math.min(indexOfLastItem, sortedLetters.length)} dari <span className="font-bold">{sortedLetters.length}</span> agenda
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
                  className={`px-3 py-1.5 rounded-lg border font-bold cursor-pointer ${currentPage === num ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
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

      {/* Detail Letter View Modal Box */}
      <AnimatePresence>
        {selectedLetter && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-start justify-center p-4 bg-slate-900/40 backdrop-blur-xs font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden border border-slate-100 shadow-2xl relative my-auto"
            >
              {/* Box Top Head */}
              <div className="bg-slate-900/5 py-4 px-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookMarked className="h-5 w-5 text-blue-600" />
                  <span className="text-xs uppercase font-extrabold tracking-wider font-mono text-slate-500">Lembar Penelusuran Surat Masuk</span>
                </div>
                <button
                  onClick={() => { setSelectedLetter(null); setAiSummary(null); }}
                  className="p-1 rounded-full hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5 text-slate-500" />
                </button>
              </div>

              {/* Box body details */}
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">No. Registrasi Agenda</span>
                    <span className="text-lg font-extrabold text-slate-800 font-mono tracking-tight">{selectedLetter.no_agenda}</span>
                  </div>
                  <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Sifat Penerimaan</span>
                    <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-md mt-1 ${
                      selectedLetter.sifat === "Penting" ? "bg-red-100 text-red-800" :
                      selectedLetter.sifat === "Rahasia" ? "bg-purple-100 text-purple-800" :
                      "bg-slate-100 text-slate-600"
                    }`}>{selectedLetter.sifat}</span>
                  </div>
                </div>

                <div className="space-y-3.5 text-xs">
                  <div className="grid grid-cols-3 border-b border-slate-50 pb-2">
                    <span className="font-bold text-slate-400 uppercase tracking-widest font-mono text-[9px]">Asal Pengirim</span>
                    <span className="col-span-2 font-semibold text-slate-900">{selectedLetter.pengirim}</span>
                  </div>
                  <div className="grid grid-cols-3 border-b border-slate-50 pb-2">
                    <span className="font-bold text-slate-400 uppercase tracking-widest font-mono text-[9px]">Nomor Surat Asal</span>
                    <span className="col-span-2 font-mono font-bold text-slate-800">{selectedLetter.no_surat}</span>
                  </div>
                  <div className="grid grid-cols-3 border-b border-slate-50 pb-2">
                    <span className="font-bold text-slate-400 uppercase tracking-widest font-mono text-[9px]">Tanggal Dibuat</span>
                    <span className="col-span-2 text-slate-700">{selectedLetter.tgl_surat}</span>
                  </div>
                  <div className="grid grid-cols-3 border-b border-slate-50 pb-2">
                    <span className="font-bold text-slate-400 uppercase tracking-widest font-mono text-[9px]">Tanggal Diterima</span>
                    <span className="col-span-2 text-slate-700">{selectedLetter.tgl_terima}</span>
                  </div>
                  <div className="grid grid-cols-3 border-b border-slate-50 pb-2">
                    <span className="font-bold text-slate-400 uppercase tracking-widest font-mono text-[9px]">Tujuan Penerima</span>
                    <span className="col-span-2 text-slate-700 font-semibold">{selectedLetter.ditujukan}</span>
                  </div>
                  <div className="grid grid-cols-3 border-b border-slate-50 pb-2">
                    <span className="font-bold text-slate-400 uppercase tracking-widest font-mono text-[9px]">Isi Perihal</span>
                    <span className="col-span-2 text-slate-800 font-bold">{selectedLetter.perihal}</span>
                  </div>
                  <div className="grid grid-cols-3 border-b border-slate-50 pb-2">
                    <span className="font-bold text-slate-400 uppercase tracking-widest font-mono text-[9px]">Status Tindaklanjut</span>
                    <span className="col-span-2 font-bold text-blue-600">{selectedLetter.status}</span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="font-bold text-slate-400 uppercase tracking-widest font-mono text-[9px]">Catatan / Keterangan</span>
                    <span className="col-span-2 text-slate-600 whitespace-pre-line leading-relaxed">{selectedLetter.keterangan || "-"}</span>
                  </div>
                </div>

                {/* Simulated File Scanner Attachment Block */}
                {selectedLetter.lampiran_name && (
                  <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-amber-500 rounded-lg text-white">
                        <UploadCloud className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 truncate max-w-xs">{selectedLetter.lampiran_name}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{formatBytes(selectedLetter.lampiran_size)} • PDF Scan Dinas</p>
                      </div>
                    </div>
                    {/* Simulated Download with Data URI */}
                    <a
                      href={selectedLetter.lampiran_url || "#"}
                      download={selectedLetter.lampiran_name}
                      onClick={(e) => {
                        if (!selectedLetter.lampiran_url) {
                          e.preventDefault();
                          alert("Aplikasi Demo: Mengunduh file scan naskah elektronik...");
                        }
                      }}
                      className="px-3 py-1.5 bg-white border border-amber-200 text-amber-700 hover:bg-amber-100/50 font-bold rounded-lg flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5" /> Unduh
                    </a>
                  </div>
                )}

                {/* Gemini AI Summary Integrated Section */}
                <div className="p-5 rounded-2xl bg-blue-50 border border-blue-50 space-y-3.5 relative overflow-hidden">
                  <div className="absolute right-0 bottom-0 transform translate-x-3 translate-y-3 shrink-0 select-none opacity-5">
                    <Sparkles className="h-24 w-24 text-blue-600" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-blue-800 font-bold text-xs font-display">
                      <Sparkles className="h-4.5 w-4.5 text-blue-600 animate-pulse" />
                      Asisten AI Gemini Smart Summary
                    </div>
                    <button
                      type="button"
                      disabled={aiLoading}
                      onClick={() => triggerAiSummarize(selectedLetter)}
                      className="text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-700 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      {aiLoading ? "Mengoreksi..." : "Hasilkan Ringkasan"}
                    </button>
                  </div>
                  <div className="text-xs leading-relaxed text-blue-900/80">
                    {aiLoading ? (
                      <div className="flex items-center gap-2 py-1">
                        <span className="flex h-2 w-2 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        </span>
                        <span className="text-blue-700 font-semibold italic">Gemini sedang bekerja membaca isi perihal dinas...</span>
                      </div>
                    ) : aiSummary ? (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-semibold bg-white/70 p-3 rounded-xl border border-blue-100">
                        {aiSummary}
                      </motion.div>
                    ) : (
                      "Tekan tombol untuk merangkum secara otomatis menggunakan kognisi cerdas Gemini 2.5."
                    )}
                  </div>
                </div>
              </div>

              {/* Box Footer operations */}
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

      {/* Adding / Editing Modal Form box */}
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
                  {editingLetter ? "Ubah Registrasi Surat Masuk" : "Registrasi Surat Masuk Baru"}
                </h3>
                <button
                  onClick={() => setShowFormModal(false)}
                  className="p-1 rounded-full hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
                
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Tanggal Terima *</label>
                    <input
                      type="date"
                      required
                      value={formTglTerima}
                      onChange={(e) => setFormTglTerima(e.target.value)}
                      className="block w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Tanggal Surat *</label>
                    <input
                      type="date"
                      required
                      value={formTglSurat}
                      onChange={(e) => setFormTglSurat(e.target.value)}
                      className="block w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Penerbit Nomor Surat *</label>
                  <input
                    type="text"
                    required
                    value={formNoSurat}
                    onChange={(e) => setFormNoSurat(e.target.value)}
                    placeholder="Contoh: 100/SK/VI/2026 atau UND-119"
                    className="block w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Asal Pengirim / Dinas *</label>
                  <input
                    type="text"
                    required
                    value={formPengirim}
                    onChange={(e) => setFormPengirim(e.target.value)}
                    placeholder="Asal Instansi atau Nama Pengirim..."
                    className="block w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Sifat Surat</label>
                    <select
                      value={formSifat}
                      onChange={(e) => setFormSifat(e.target.value as SifatSurat)}
                      className="block w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-700"
                    >
                      <option value="Biasa">Biasa</option>
                      <option value="Penting">Penting</option>
                      <option value="Rahasia">Rahasia</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Status Disposisi</label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as StatusSuratMasuk)}
                      className="block w-full border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white text-slate-700"
                    >
                      <option value="Baru">Baru</option>
                      <option value="Proses">Diproses / Disposisi</option>
                      <option value="Selesai">Arsip Selesai</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Ditujukan Kepada *</label>
                  <input
                    type="text"
                    required
                    value={formDitujukan}
                    onChange={(e) => setFormDitujukan(e.target.value)}
                    placeholder="Contoh: Kepala Dinas, Bendahara, atau Sub Bagian TU"
                    className="block w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Isi Perihal / Subjek Surat *</label>
                  <input
                    type="text"
                    required
                    value={formPerihal}
                    onChange={(e) => setFormPerihal(e.target.value)}
                    placeholder="Uraian ringkas maksud naskah dinas..."
                    className="block w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Catatan Tambahan / Instruksi (Keterangan)</label>
                  <textarea
                    rows={2}
                    value={formKeterangan}
                    onChange={(e) => setFormKeterangan(e.target.value)}
                    placeholder="Instruksi pimpinan, tanggapan penelaah dinas..."
                    className="block w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 resize-none"
                  />
                </div>

                {/* Upload scan file with drag and drop wrapper */}
                <div className="space-y-1.5">
                  <label className="block text-slate-600 font-semibold">Dokumen Lampiran (Maks 5MB • PDF/JPG)</label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 rounded-xl p-3 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/20 transition-all"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                    />
                    {formLampiranName ? (
                      <div className="flex items-center justify-center gap-2 font-semibold text-blue-600 text-xs">
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
                        <p className="font-semibold text-[11px] text-slate-500">Klik atau seret berkas ke sini ke lampiran</p>
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
                    className="px-5 py-2 text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 font-bold rounded-xl flex items-center gap-1 cursor-pointer"
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

      {/* Delete Confirmation Box */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-sm p-6 border border-slate-100 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-2.5 text-red-600">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Trash2 className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-base font-display">Konfirmasi Hapus</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Apakah Anda yakin ingin menghapus data surat masuk ini secara permanen dari database? Aksi ini tidak dapat dibatalkan.
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
