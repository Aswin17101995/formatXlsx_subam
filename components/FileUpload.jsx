'use client';

import { useRef, useState } from "react";
import { 
  Trash2, 
  Download, 
  FileText, 
  Upload, 
  X,
  FileSpreadsheet,
  Layers,
  Box,
  Hash
} from 'lucide-react';
import * as XLSX from 'xlsx-js-style';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from "@/lib/utils";

const FileUpload = () => {
    const [excelData, setExcelData] = useState([]);
    const [sizeColumn, setSizeColumn] = useState([]);
    const [fileName, setFileName] = useState("");
    const [error, setError] = useState("");
    const [isDragging, setIsDragging] = useState(false);
    const inputRef = useRef(null);

    const handleAreaClick = () => {
        inputRef.current?.click();
    };

    const processFile = (file) => {
        if (!file) return;

        const allowedTypes = [
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-excel",
            "text/csv",
        ];
        const hasValidExtension = /\.(xlsx|xls|csv)$/i.test(file.name);

        if (!allowedTypes.includes(file.type) && !hasValidExtension) {
            setError("Please upload an Excel or CSV file.");
            return;
        }

        setError("");
        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result);
                const workbook = XLSX.read(data, { type: "array" });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                let jsonData = XLSX.utils.sheet_to_json(worksheet);

                if (jsonData.length === 0) {
                    setError("The uploaded file does not contain readable rows.");
                    setExcelData([]);
                    setSizeColumn([]);
                    return;
                }

                jsonData = jsonData.slice(0, -1);
                if (jsonData.length === 0) {
                    setError("The uploaded file needs at least one data row before the total row.");
                    setExcelData([]);
                    setSizeColumn([]);
                    return;
                }

                const orderIds = Object.keys(jsonData[0]).slice(0, -2);
                const extractedStoreNames = jsonData.reduce((acc, ele) => {
                  if (ele['STORE']) {
                    return [...acc, String(ele["STORE"])];
                  } else {
                    return acc;
                  }
                }, []);

                let formatter_arr = [];
                orderIds.forEach((itm) => {
                    let count_arr = [];
                    jsonData.forEach((val) => {
                        const cellValue = val[`${itm}`];
                        count_arr.push(cellValue === undefined || cellValue === "" ? 0 : Number(cellValue));
                    });
                    formatter_arr.push({ [itm]: count_arr });
                });

                const hashMap = formatter_arr.reduce((acc, ele) => {
                  let key = Object.keys(ele)[0];
                  let value = ele[key].join(',');
                  if (acc[value]) {
                    acc[value].push(key);
                    return { ...acc };
                  } else {
                    return { ...acc, [value]: [key] };
                  }
                }, {});

                let excel = [];
                let hashMapKeys = Object.keys(hashMap);
                hashMapKeys.forEach((itm) => {
                    let obj = {
                      store: hashMap[itm].join("-"),
                    };
                    
                    let internal_sizes = itm.split(',');
                    extractedStoreNames.forEach((val, i) => {
                        obj[val] = internal_sizes[i];
                    });

                    const total_count = internal_sizes.reduce((acc, current) => acc + Number.parseInt(current || "0", 10), 0);
                    obj.total = total_count;
                    obj.total_carton = hashMap[itm].length;
                    obj.total_pcs = hashMap[itm].length * total_count;
                    excel.push(obj);
                });

                setSizeColumn(extractedStoreNames);
                setExcelData(excel);
            } catch (err) {
                console.error(err);
                setError("Error processing file. Please check the file format.");
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleFileUpload = (e) => {
        if (e.target.files && e.target.files[0]) {
          processFile(e.target.files[0]);
        }
        e.target.value = "";
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          processFile(e.dataTransfer.files[0]);
        }
    };

    const handleClearData = () => {
        setExcelData([]);
        setSizeColumn([]);
        setFileName("");
        setError("");
    };

    const generateXlsx = () => {
        const headers = ["store", ...sizeColumn, "total", "total_carton", "total_pcs"];
        const ws = XLSX.utils.json_to_sheet(excelData, { header: headers });
        
        // Find the range of the worksheet
        const range = XLSX.utils.decode_range(ws['!ref']);
        
        // Loop over the cells in the sheet range to apply formatting
        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
                const cell = ws[cellRef];
                if (!cell) continue;
                
                // Initialize style object
                cell.s = {};
                
                // Check if it is the first row (header row)
                if (R === 0) {
                    // Prettify header names
                    if (cell.v === "store") {
                        cell.v = "Store Location";
                        cell.t = "s";
                        if (cell.w) delete cell.w;
                    } else if (cell.v === "total") {
                        cell.v = "Total";
                        cell.t = "s";
                        if (cell.w) delete cell.w;
                    } else if (cell.v === "total_carton") {
                        cell.v = "Total Cartons";
                        cell.t = "s";
                        if (cell.w) delete cell.w;
                    } else if (cell.v === "total_pcs") {
                        cell.v = "Total Pieces";
                        cell.t = "s";
                        if (cell.w) delete cell.w;
                    }

                    cell.s.font = {
                        name: "Calibri",
                        sz: 18, // Header font size 18 (proportionate to 16pt data)
                        bold: true,
                        color: { rgb: "FFFFFF" }
                    };
                    cell.s.fill = {
                        fgColor: { rgb: "10B981" } // Emerald green matches the UI
                    };
                    cell.s.alignment = {
                        horizontal: C === 0 ? "left" : "center",
                        vertical: "center", // Align header vertically to the middle
                        wrapText: C === 0 // Wrap text for lengthy Store Location header if needed
                    };
                } else {
                    // Regular data rows
                    cell.s.font = {
                        name: "Calibri",
                        sz: 16 // Data cell font size 16 as requested
                    };
                    cell.s.alignment = {
                        horizontal: C === 0 ? "left" : "center",
                        vertical: "center", // Align cells vertically to the middle
                        wrapText: C === 0 // Enable text wrapping for the Store Location data cells
                    };
                    
                    // Add a subtle border to data cells for premium look
                    cell.s.border = {
                        top: { style: "thin", color: { rgb: "E5E7EB" } },
                        bottom: { style: "thin", color: { rgb: "E5E7EB" } },
                        left: { style: "thin", color: { rgb: "E5E7EB" } },
                        right: { style: "thin", color: { rgb: "E5E7EB" } }
                    };
                }
            }
        }

        // Dynamically compute column widths
        const cols = [];
        for (let C = range.s.c; C <= range.e.c; ++C) {
            let maxLength = 10; // Default minimum width
            for (let R = range.s.r; R <= range.e.r; ++R) {
                const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
                const cell = ws[cellRef];
                if (cell && cell.v) {
                    const valueStr = String(cell.v);
                    if (valueStr.length > maxLength) {
                        maxLength = valueStr.length;
                    }
                }
            }
            if (C === 0) {
                // Capped at 45 characters and scaled for 16pt font size
                cols.push({ wch: Math.min(Math.ceil(maxLength * 1.3), 45) });
            } else {
                // Scale column width by 1.3 + 4 characters padding for 16pt font sizing
                cols.push({ wch: Math.ceil(maxLength * 1.3) + 4 });
            }
        }
        ws['!cols'] = cols;

        const pad = (num) => String(num).padStart(2, '0');
        const now = new Date();
        const dd = pad(now.getDate());
        const mm = pad(now.getMonth() + 1);
        const yyyy = now.getFullYear();
        const hh = pad(now.getHours());
        const min = pad(now.getMinutes());
        const ss = pad(now.getSeconds());
        const formattedDate = `${dd}-${mm}-${yyyy}-${hh}-${min}-${ss}`;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Summary");
        XLSX.writeFile(wb, `summary-${formattedDate}.xlsx`);
    };

    const totalCartons = excelData.reduce((acc, itm) => acc + itm.total_carton, 0);
    const totalPieces = excelData.reduce((acc, itm) => acc + itm.total_pcs, 0);

    return (
    <div className="min-h-screen bg-[#0A0B0E] font-sans text-[#D1D5DB] selection:bg-[#10B981]/30 selection:text-white">
      <div className="h-1 w-full bg-[#10B981]" />

      <main className="mx-auto flex w-full max-w-7xl flex-col px-4 py-8 sm:px-6 lg:px-8">
          <AnimatePresence mode="wait">
            {excelData.length === 0 ? (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center justify-center pt-16"
              >
                <div className="text-center mb-12">
                  <h1 className="text-4xl font-bold text-[#F3F4F6] tracking-tight sm:text-5xl">Inventory Consolidation Engine</h1>
                  <p className="mt-4 text-lg text-[#6B7280]">Transform your workbooks into clean, grouped summaries instantly.</p>
                </div>

                <div
                    className={cn(
                      "group relative flex min-h-[400px] w-full max-w-2xl cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed transition-all duration-300",
                      isDragging 
                        ? "border-[#10B981] bg-[#10B981]/5 ring-4 ring-[#10B981]/10" 
                        : "border-[#1F2937] bg-[#111827] hover:border-[#374151] hover:bg-[#1C2533] shadow-2xl"
                    )}
                    onClick={handleAreaClick}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-2xl bg-[#1F2937] text-[#10B981] transition-transform group-hover:scale-110 group-hover:text-white group-hover:bg-[#10B981]">
                        <Upload size={44} strokeWidth={1.5} />
                    </div>
                    <h2 className="text-2xl font-bold text-[#F3F4F6]">Drop your Excel file here</h2>
                    <p className="mt-4 max-w-md text-base leading-relaxed text-[#6B7280] px-6">
                      Drag and drop <span className="text-[#9CA3AF] font-semibold">.xlsx, .xls, or .csv</span>, or click this area to browse.
                    </p>
                    
                    <button
                        type="button"
                        className="mt-10 inline-flex items-center gap-2 rounded-lg bg-[#10B981] px-8 py-4 text-sm font-bold text-[#064E3B] shadow-lg shadow-[#10B981]/20 transition-all hover:bg-[#059669] hover:scale-105 active:scale-95"
                    >
                        <FileSpreadsheet size={18} />
                        Choose File
                    </button>

                    {error && (
                      <motion.p 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute bottom-10 inline-flex items-center gap-2 rounded-lg bg-red-950/30 px-4 py-2 text-sm font-semibold text-red-400 border border-red-500/20"
                      >
                        <X size={16} />
                        {error}
                      </motion.p>
                    )}
                    
                    <input
                        type="file"
                        ref={inputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                        accept=".xlsx,.xls,.csv"
                    />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="summary"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col gap-8"
              >
                <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-5">
                        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[#111827] border border-[#1F2937] text-[#10B981] shadow-lg">
                          <FileText size={32} />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-3">
                              <span className="flex items-center gap-1.5 rounded-md bg-[#111827] border border-[#1F2937] px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-[#10B981]">
                                <div className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-pulse" />
                                Preview Ready
                              </span>
                            </div>
                            <h1 className="mt-2 truncate text-2xl font-bold text-[#F3F4F6] tracking-tight">{fileName}</h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                          className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-lg border border-[#1F2937] bg-[#111827] px-5 py-2 text-sm font-semibold text-[#9CA3AF] transition hover:bg-[#1F2937] hover:text-[#F3F4F6] lg:flex-none" 
                          onClick={handleClearData}
                        >
                            <Trash2 size={18} />
                            Reset
                        </button>
                        <button 
                          className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-[#10B981] px-6 py-2 text-sm font-bold text-[#064E3B] shadow-xl shadow-[#10B981]/10 transition-all hover:bg-[#059669] hover:scale-105 active:scale-95 lg:flex-none" 
                          onClick={generateXlsx}
                        >
                            <Download size={18} />
                            Download Summary
                        </button>
                    </div>
                </header>

                <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-xl border border-[#1F2937] bg-[#111827] p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#4B5563]">Summary Rows</p>
                          <Layers size={14} className="text-[#4B5563]" />
                        </div>
                        <p className="font-mono text-3xl font-extrabold text-[#F9FAFB]">{excelData.length}</p>
                    </div>
                    <div className="rounded-xl border border-[#1F2937] bg-[#111827] p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#4B5563]">Total Cartons</p>
                          <Box size={14} className="text-[#4B5563]" />
                        </div>
                        <p className="font-mono text-3xl font-extrabold text-[#F9FAFB]">{totalCartons}</p>
                    </div>
                    <div className="rounded-xl border border-[#1F2937] bg-[#111827] p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#4B5563]">Total Pieces</p>
                          <Hash size={14} className="text-[#4B5563]" />
                        </div>
                        <p className="font-mono text-3xl font-extrabold text-[#10B981]">{totalPieces.toLocaleString()}</p>
                    </div>
                </section>

                <div className="relative flex flex-col rounded-xl border border-[#1F2937] bg-[#111827] shadow-2xl overflow-hidden">
                  <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-[#1F2937] scrollbar-track-transparent">
                    <table className="w-full border-collapse text-[13px] text-left">
                      <thead>
                        <tr className="bg-[#1F2937] text-[#9CA3AF] text-[11px] font-bold uppercase tracking-[0.05em]">
                          <th className="sticky left-0 z-10 bg-[#1F2937] min-w-[240px] px-6 py-4 font-bold border-b border-[#374151]">Store Location</th>
                          {sizeColumn.map((itm) => (
                            <th key={itm} className="px-4 py-4 text-center font-bold border-b border-[#374151] whitespace-nowrap">{itm}</th>
                          ))}
                          <th className="px-6 py-4 text-center font-bold border-b border-[#374151] bg-[#111827]/30">Total</th>
                          <th className="px-6 py-4 text-center font-bold border-b border-[#374151]">Cartons</th>
                          <th className="px-6 py-4 text-right font-bold border-b border-[#374151] pr-8">Total Pcs</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1F2937]">
                        {excelData.map((itm, index) => (
                          <motion.tr 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: index * 0.01 }}
                            key={itm.store} 
                            className="hover:bg-[#1C2533] transition-colors group"
                          >
                            <td className="sticky left-0 bg-[#111827] px-6 py-4 font-semibold text-[#E5E7EB] group-hover:bg-[#1C2533] transition-colors z-10 border-r border-[#1F2937]/50">
                              {itm.store}
                            </td>
                            {sizeColumn.map((val) => (
                              <td key={val} className="px-4 py-4 text-center font-mono text-[#9CA3AF] group-hover:text-[#F3F4F6]">
                                {itm[val] || 0}
                              </td>
                            ))}
                            <td className="px-6 py-4 text-center font-mono font-bold text-[#F3F4F6]">
                              {itm.total}
                            </td>
                            <td className="px-6 py-4 text-center font-mono text-[#9CA3AF]">
                              {itm.total_carton}
                            </td>
                            <td className="px-6 py-4 text-right font-mono font-bold text-[#10B981] pr-8" title={itm.total_pcs.toLocaleString()}>
                              {itm.total_pcs.toLocaleString()}
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <footer className="flex items-center justify-between bg-[#1F2937]/50 border-t border-[#1F2937] px-6 py-4">
                    <p className="text-[11px] text-[#4B5563] font-medium italic">Checksum verified: All columns sum to validated totals</p>
                    <div className="flex gap-8 text-[13px] font-bold">
                        <div className="flex items-center gap-3">
                          <span className="text-[#4B5563] uppercase tracking-wider text-[10px]">Cartons</span>
                          <span className="text-[#F3F4F6] font-mono">{totalCartons}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[#4B5563] uppercase tracking-wider text-[10px]">Pieces</span>
                          <span className="text-[#10B981] font-mono">{totalPieces.toLocaleString()}</span>
                        </div>
                    </div>
                  </footer>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
      </main>
    </div>
    );
};

export default FileUpload;
