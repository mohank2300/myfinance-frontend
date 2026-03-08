import { useEffect, useState, useMemo, useRef } from "react";
import axios from "axios";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from "recharts";
import { useToast, ToastContainer } from "../components/Toast";

const PAGE_SIZE = 10;

const CATEGORIES = {
  Salary:       { icon: "💰", color: "#6fcf97", type: "INCOME" },
  Freelance:    { icon: "💻", color: "#56ccf2", type: "INCOME" },
  Investment:   { icon: "📈", color: "#e8c97e", type: "INCOME" },
  Gift:         { icon: "🎁", color: "#bb87fc", type: "INCOME" },
  Other_Income: { icon: "💵", color: "#27ae60", type: "INCOME" },
  Food:          { icon: "🍔", color: "#eb5757", type: "EXPENSE" },
  Rent:          { icon: "🏠", color: "#f2994a", type: "EXPENSE" },
  Transport:     { icon: "🚗", color: "#56ccf2", type: "EXPENSE" },
  Shopping:      { icon: "🛍️", color: "#bb87fc", type: "EXPENSE" },
  Health:        { icon: "💊", color: "#eb5757", type: "EXPENSE" },
  Education:     { icon: "📚", color: "#e8c97e", type: "EXPENSE" },
  Entertainment: { icon: "🎬", color: "#f2994a", type: "EXPENSE" },
  Utilities:     { icon: "💡", color: "#56ccf2", type: "EXPENSE" },
  Travel:        { icon: "✈️", color: "#27ae60", type: "EXPENSE" },
  Other:         { icon: "📦", color: "#555",    type: "EXPENSE" },
};

const getCategoryIcon = (name) => CATEGORIES[name]?.icon || "📦";

// Parse CSV text into array of objects
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map(line => {
    const cols = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQ = !inQ; }
      else if (line[i] === "," && !inQ) { cols.push(cur.trim()); cur = ""; }
      else { cur += line[i]; }
    }
    cols.push(cur.trim());
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (cols[i] || "").replace(/^"|"$/g, "").trim(); });
    return obj;
  }).filter(r => Object.values(r).some(v => v !== ""));
  return { headers, rows };
}

function Dashboard() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [form, setForm] = useState({ category: "", description: "", amountCents: "", type: "EXPENSE" });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [activeTab, setActiveTab] = useState("transactions");
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportForm, setReportForm] = useState({ email: "", period: "THIS_MONTH" });
  const [sendingReport, setSendingReport] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // CSV/PDF Import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importMode, setImportMode] = useState("csv"); // csv | pdf
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvRows, setCsvRows] = useState([]);
  const [colMap, setColMap] = useState({ description: "", debit: "", credit: "", category: "" });
  const [importStep, setImportStep] = useState("upload"); // upload | map | preview
  const [importing, setImporting] = useState(false);
  const [pdfRows, setPdfRows] = useState([]);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const fileInputRef = useRef(null);
  const pdfInputRef = useRef(null);

  const { toasts, showToast } = useToast();
  const token = localStorage.getItem("token");

  useEffect(() => { fetchTransactions(); }, []);
  useEffect(() => { setSelectedIds(new Set()); }, [page, filterType, search, dateFrom, dateTo]);

  const fetchTransactions = async () => {
    try {
      const res = await axios.get("http://localhost:8080/api/transactions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTransactions(res.data);
    } catch (err) {
      console.error(err);
      showToast("Failed to load transactions", "error");
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return transactions
      .filter(t => filterType === "ALL" || t.type === filterType)
      .filter(t => {
        const q = search.toLowerCase();
        return (
          t.category.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q))
        );
      })
      .filter(t => {
        const date = new Date(t.createdAt);
        if (dateFrom && date < new Date(dateFrom)) return false;
        if (dateTo && date > new Date(dateTo + "T23:59:59")) return false;
        return true;
      });
  }, [transactions, filterType, search, dateFrom, dateTo]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const pieData = useMemo(() => {
    const map = {};
    transactions.filter(t => t.type === "EXPENSE").forEach(t => {
      map[t.category] = (map[t.category] || 0) + t.amountCents;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value: value / 100 }));
  }, [transactions]);

  const barData = useMemo(() => {
    const map = {};
    transactions.forEach(t => {
      const date = new Date(t.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!map[key]) map[key] = { month: key, Income: 0, Expenses: 0 };
      if (t.type === "INCOME") map[key].Income += t.amountCents / 100;
      else map[key].Expenses += t.amountCents / 100;
    });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
  }, [transactions]);

  const PIE_COLORS = ["#e8c97e", "#6fcf97", "#eb5757", "#56ccf2", "#bb87fc", "#f2994a", "#27ae60", "#2f80ed"];

  const openAddModal = () => {
    setEditingTransaction(null);
    setForm({ category: "", description: "", amountCents: "", type: "EXPENSE" });
    setShowModal(true);
  };

  const openEditModal = (t) => {
    setEditingTransaction(t);
    setForm({
      category: t.category,
      description: t.description || "",
      amountCents: (t.amountCents / 100).toFixed(2),
      type: t.type,
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      category: form.category,
      description: form.description,
      amountCents: Math.round(parseFloat(form.amountCents) * 100),
      type: form.type,
    };
    try {
      if (editingTransaction) {
        await axios.put(`http://localhost:8080/api/transactions/${editingTransaction.id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
        showToast("Transaction updated successfully", "success");
      } else {
        await axios.post("http://localhost:8080/api/transactions", payload, { headers: { Authorization: `Bearer ${token}` } });
        showToast("Transaction added successfully", "success");
      }
      setShowModal(false);
      setEditingTransaction(null);
      setForm({ category: "", description: "", amountCents: "", type: "EXPENSE" });
      fetchTransactions();
    } catch (err) {
      console.error(err);
      showToast("Failed to save transaction", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this transaction?")) return;
    setDeletingId(id);
    try {
      await axios.delete(`http://localhost:8080/api/transactions/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      showToast("Transaction deleted", "info");
      fetchTransactions();
    } catch (err) {
      console.error(err);
      showToast("Failed to delete transaction", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginated.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginated.map(t => t.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.size} selected transaction${selectedIds.size !== 1 ? "s" : ""}?`)) return;
    setBulkDeleting(true);
    let success = 0, failed = 0;
    for (const id of selectedIds) {
      try {
        await axios.delete(`http://localhost:8080/api/transactions/${id}`, { headers: { Authorization: `Bearer ${token}` } });
        success++;
      } catch { failed++; }
    }
    setBulkDeleting(false);
    setSelectedIds(new Set());
    fetchTransactions();
    showToast(`Deleted ${success} transaction${success !== 1 ? "s" : ""}${failed > 0 ? `, ${failed} failed` : ""}`, success > 0 ? "success" : "error");
  };

  const handleSendReport = async () => {
    setSendingReport(true);
    try {
      await axios.post("http://localhost:8080/api/report/send", reportForm, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast("Report sent to " + reportForm.email, "success");
      setShowReportModal(false);
    } catch (err) {
      showToast("Failed to send report", "error");
    } finally {
      setSendingReport(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  const formatAmount = (cents) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

  const totalIncome = transactions.filter(t => t.type === "INCOME").reduce((s, t) => s + t.amountCents, 0);
  const totalExpense = transactions.filter(t => t.type === "EXPENSE").reduce((s, t) => s + t.amountCents, 0);
  const net = totalIncome - totalExpense;

  // CSV Import handlers
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const { headers, rows } = parseCSV(ev.target.result);
      if (headers.length === 0) { showToast("Could not parse CSV file", "error"); return; }
      setCsvHeaders(headers);
      setCsvRows(rows);
      // Auto-detect common column names
      const find = (keywords) => headers.find(h => keywords.some(k => h.toLowerCase().includes(k))) || "";
      setColMap({
        description: find(["desc", "narration", "particular", "detail", "remark", "memo"]),
        debit:       find(["debit", "withdrawal", "dr", "expense", "paid"]),
        credit:      find(["credit", "deposit", "cr", "income", "received"]),
        category:    find(["category", "type", "tag"]),
      });
      setImportStep("map");
    };
    reader.readAsText(file);
  };

  const previewRows = useMemo(() => {
    if (importStep !== "preview") return [];
    return csvRows.map(row => {
      const debitVal  = parseFloat((row[colMap.debit]  || "0").replace(/[^0-9.]/g, "")) || 0;
      const creditVal = parseFloat((row[colMap.credit] || "0").replace(/[^0-9.]/g, "")) || 0;
      const type = creditVal > 0 ? "INCOME" : "EXPENSE";
      const amount = creditVal > 0 ? creditVal : debitVal;
      const desc = colMap.description ? row[colMap.description] : "";
      const cat  = colMap.category && row[colMap.category] && CATEGORIES[row[colMap.category]] ? row[colMap.category] : (type === "INCOME" ? "Other_Income" : "Other");
      return { type, amount, amountCents: Math.round(amount * 100), description: desc, category: cat, _raw: row };
    }).filter(r => r.amountCents > 0);
  }, [importStep, csvRows, colMap]);

  const handlePdfChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPdf(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await axios.post("http://localhost:8080/api/import/pdf", formData, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
      });
      const rows = res.data;
      if (!rows || rows.length === 0) { showToast("No transactions found in PDF", "error"); setUploadingPdf(false); return; }
      setPdfRows(rows.map(r => ({
        type: r.type,
        amount: r.amount,
        amountCents: Math.round(r.amount * 100),
        description: r.description,
        category: r.type === "INCOME" ? "Other_Income" : "Other",
      })));
      setImportStep("preview");
    } catch (err) {
      showToast("Failed to parse PDF — " + (err.response?.data || err.message), "error");
    } finally {
      setUploadingPdf(false);
    }
  };

  const activePreviewRows = importMode === "pdf" ? pdfRows : previewRows;

  const handleImportAll = async () => {
    setImporting(true);
    let success = 0, failed = 0;
    for (const row of activePreviewRows) {
      try {
        await axios.post("http://localhost:8080/api/transactions", {
          category: row.category,
          description: row.description,
          amountCents: row.amountCents,
          type: row.type,
        }, { headers: { Authorization: `Bearer ${token}` } });
        success++;
      } catch { failed++; }
    }
    setImporting(false);
    setShowImportModal(false);
    setImportStep("upload");
    setCsvHeaders([]); setCsvRows([]); setPdfRows([]);
    fetchTransactions();
    showToast(`Imported ${success} transactions${failed > 0 ? `, ${failed} failed` : ""}`, success > 0 ? "success" : "error");
  };

  const resetImport = () => {
    setShowImportModal(false);
    setImportStep("upload");
    setCsvHeaders([]); setCsvRows([]); setPdfRows([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (pdfInputRef.current) pdfInputRef.current.value = "";
  };

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0a0a !important; color: #f0ede6; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; min-height: 100vh; display: block !important; place-items: unset !important; }
        .page { min-height: 100vh; background: #0a0a0a; }

        /* NAVBAR */
        .navbar { display: flex; align-items: center; justify-content: space-between; padding: 16px 40px; border-bottom: 1px solid #161616; position: sticky; top: 0; background: #0a0a0a; z-index: 50; }
        .nav-logo { font-size: 1.3rem; font-weight: 800; color: #e8c97e; }
        .nav-right { display: flex; align-items: center; gap: 12px; }
        .nav-badge { background: #161616; border: 1px solid #222; border-radius: 20px; padding: 5px 14px; font-size: 0.75rem; color: #555; }
        .logout-btn { background: none; border: 1px solid #222; color: #555; font-family: inherit; font-size: 0.78rem; letter-spacing: 0.08em; text-transform: uppercase; padding: 7px 16px; border-radius: 6px; cursor: pointer; transition: all 0.2s; }
        .logout-btn:hover { border-color: #e8c97e; color: #e8c97e; }
        .hamburger { display: none; background: none; border: 1px solid #222; color: #555; width: 36px; height: 36px; border-radius: 6px; cursor: pointer; font-size: 1.1rem; align-items: center; justify-content: center; transition: all 0.2s; }
        .hamburger:hover { border-color: #e8c97e; color: #e8c97e; }
        .mobile-menu { display: none; flex-direction: column; gap: 8px; padding: 16px 20px; border-bottom: 1px solid #161616; background: #0d0d0d; }
        .mobile-menu.open { display: flex; }
        .mobile-menu-btn { background: none; border: 1px solid #222; color: #666; font-family: inherit; font-size: 0.82rem; padding: 10px 16px; border-radius: 8px; cursor: pointer; text-align: left; transition: all 0.2s; }
        .mobile-menu-btn:hover { border-color: #e8c97e; color: #e8c97e; }

        /* HEADER */
        .header { padding: 32px 40px 28px; border-bottom: 1px solid #111; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
        .header-left h1 { font-size: 2rem; font-weight: 800; color: #f0ede6; letter-spacing: -0.5px; }
        .header-left h1 span { color: #e8c97e; }
        .header-left p { margin-top: 6px; color: #3a3a3a; font-size: 0.85rem; }
        .header-actions { display: flex; gap: 10px; flex-shrink: 0; }
        .add-btn { background: #e8c97e; color: #0a0a0a; border: none; border-radius: 8px; padding: 12px 22px; font-size: 0.88rem; font-weight: 700; font-family: inherit; cursor: pointer; transition: opacity 0.2s; white-space: nowrap; }
        .add-btn:hover { opacity: 0.85; }
        .import-btn { background: none; border: 1px solid #333; color: #666; border-radius: 8px; padding: 12px 18px; font-size: 0.88rem; font-family: inherit; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
        .import-btn:hover { border-color: #e8c97e; color: #e8c97e; }

        /* STATS */
        .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: #111; border-bottom: 1px solid #111; }
        .stat { background: #0a0a0a; padding: 24px 40px; }
        .stat-label { font-size: 0.7rem; letter-spacing: 0.12em; text-transform: uppercase; color: #3a3a3a; margin-bottom: 8px; font-weight: 600; }
        .stat-value { font-size: 1.9rem; font-weight: 800; letter-spacing: -1px; }
        .stat-value.green { color: #6fcf97; }
        .stat-value.red { color: #eb5757; }
        .stat-value.gold { color: #e8c97e; }
        .stat-sub { margin-top: 4px; font-size: 0.75rem; color: #2a2a2a; }

        /* TABS */
        .page-tabs { display: flex; gap: 0; border-bottom: 1px solid #111; padding: 0 40px; }
        .page-tab { background: none; border: none; border-bottom: 2px solid transparent; color: #444; font-family: inherit; font-size: 0.82rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; padding: 16px 20px; cursor: pointer; transition: all 0.2s; margin-bottom: -1px; }
        .page-tab:hover { color: #888; }
        .page-tab.active { border-bottom-color: #e8c97e; color: #e8c97e; }

        /* CONTENT */
        .content { padding: 28px 40px; }
        .filter-bar { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
        .search-input { flex: 1; min-width: 180px; background: #111; border: 1px solid #1e1e1e; border-radius: 8px; padding: 10px 16px; font-size: 0.88rem; color: #f0ede6; font-family: inherit; outline: none; transition: border-color 0.2s; }
        .search-input:focus { border-color: #e8c97e; }
        .search-input::placeholder { color: #333; }
        .filter-tabs { display: flex; gap: 6px; }
        .filter-tab { background: #111; border: 1px solid #1e1e1e; border-radius: 6px; padding: 8px 14px; font-size: 0.75rem; font-family: inherit; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #444; cursor: pointer; transition: all 0.2s; }
        .filter-tab:hover { color: #888; border-color: #333; }
        .filter-tab.active-all { border-color: #e8c97e; color: #e8c97e; background: #1a1608; }
        .filter-tab.active-income { border-color: #6fcf97; color: #6fcf97; background: #0b2318; }
        .filter-tab.active-expense { border-color: #eb5757; color: #eb5757; background: #230b0b; }
        .results-info { font-size: 0.72rem; color: #333; white-space: nowrap; }
        .date-range { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .date-sep { color: #333; font-size: 0.8rem; }
        .date-input { background: #111; border: 1px solid #1e1e1e; border-radius: 8px; padding: 8px 12px; font-size: 0.82rem; color: #555; font-family: inherit; outline: none; transition: border-color 0.2s; color-scheme: dark; }
        .date-input::-webkit-calendar-picker-indicator { filter: invert(0.3); cursor: pointer; }
        .clear-date-btn { background: none; border: 1px solid #222; color: #555; font-family: inherit; font-size: 0.72rem; padding: 6px 12px; border-radius: 6px; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
        .clear-date-btn:hover { border-color: #eb5757; color: #eb5757; }

        /* TABLE */
        .table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        table { width: 100%; border-collapse: collapse; min-width: 520px; }
        thead th { font-size: 0.68rem; letter-spacing: 0.1em; text-transform: uppercase; color: #2a2a2a; font-weight: 600; text-align: left; padding: 0 16px 12px 0; border-bottom: 1px solid #111; white-space: nowrap; }
        tbody tr { border-bottom: 1px solid #0f0f0f; transition: background 0.12s; }
        tbody tr:hover { background: #0d0d0d; }
        tbody td { padding: 14px 16px 14px 0; font-size: 0.875rem; color: #888; }
        .cat-cell { color: #ccc; font-weight: 500; white-space: nowrap; }
        .desc-cell { color: #444; font-size: 0.8rem; }
        .badge { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 20px; font-size: 0.68rem; letter-spacing: 0.06em; text-transform: uppercase; font-weight: 700; white-space: nowrap; }
        .badge.INCOME { background: #0b2318; color: #6fcf97; }
        .badge.EXPENSE { background: #230b0b; color: #eb5757; }
        .badge::before { content: ''; width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
        .amt { font-weight: 700; font-size: 0.9rem; letter-spacing: -0.3px; white-space: nowrap; }
        .amt.INCOME { color: #6fcf97; }
        .amt.EXPENSE { color: #eb5757; }
        .actions-cell { display: flex; gap: 8px; }
        .edit-btn { background: none; border: 1px solid #222; color: #555; font-family: inherit; font-size: 0.72rem; padding: 5px 12px; border-radius: 6px; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
        .edit-btn:hover { border-color: #e8c97e; color: #e8c97e; }
        .del-btn { background: none; border: 1px solid #222; color: #555; font-family: inherit; font-size: 0.72rem; padding: 5px 12px; border-radius: 6px; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
        .del-btn:hover { border-color: #eb5757; color: #eb5757; }
        .del-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        /* MOBILE CARDS */
        .tx-cards { display: none; flex-direction: column; gap: 10px; }
        .tx-card { background: #111; border: 1px solid #1a1a1a; border-radius: 12px; padding: 16px; }
        .tx-card-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
        .tx-card-cat { display: flex; align-items: center; gap: 8px; font-size: 0.9rem; font-weight: 600; color: #ccc; }
        .tx-card-amt { font-weight: 800; font-size: 1rem; }
        .tx-card-amt.INCOME { color: #6fcf97; }
        .tx-card-amt.EXPENSE { color: #eb5757; }
        .tx-card-bot { display: flex; align-items: center; justify-content: space-between; }
        .tx-card-desc { font-size: 0.78rem; color: #444; }
        .tx-card-actions { display: flex; gap: 8px; }

        /* PAGINATION */
        .center-msg { display: flex; flex-direction: column; align-items: center; padding: 80px 0; gap: 12px; color: #2a2a2a; }
        .spinner { width: 28px; height: 28px; border: 2px solid #1a1a1a; border-top-color: #e8c97e; border-radius: 50%; animation: spin 0.75s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .pagination { display: flex; align-items: center; gap: 8px; margin-top: 24px; flex-wrap: wrap; }
        .page-btn { background: #111; border: 1px solid #1e1e1e; color: #555; font-family: inherit; font-size: 0.78rem; padding: 7px 14px; border-radius: 6px; cursor: pointer; transition: all 0.2s; }
        .page-btn:hover:not(:disabled) { border-color: #e8c97e; color: #e8c97e; }
        .page-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .page-numbers { display: flex; gap: 4px; }
        .page-num { background: #111; border: 1px solid #1e1e1e; color: #555; font-family: inherit; font-size: 0.78rem; width: 32px; height: 32px; border-radius: 6px; cursor: pointer; transition: all 0.2s; }
        .page-num:hover { border-color: #333; color: #888; }
        .page-num.active { background: #1a1608; border-color: #e8c97e; color: #e8c97e; font-weight: 700; }
        .page-dots { color: #333; font-size: 0.78rem; padding: 0 4px; display: flex; align-items: center; }
        .page-info { font-size: 0.72rem; color: #333; margin-left: 8px; }

        /* CHARTS */
        .charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .chart-card { background: #111; border: 1px solid #1a1a1a; border-radius: 12px; padding: 28px; }
        .chart-title { font-size: 0.72rem; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: #3a3a3a; margin-bottom: 24px; }
        .chart-empty { display: flex; align-items: center; justify-content: center; height: 200px; color: #2a2a2a; font-size: 0.85rem; }
        .pie-legend { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 20px; }
        .pie-legend-item { display: flex; align-items: center; gap: 6px; font-size: 0.75rem; color: #555; }
        .pie-legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

        /* MODAL */
        .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.75); display: flex; align-items: center; justify-content: center; z-index: 100; backdrop-filter: blur(4px); padding: 16px; }
        .modal { background: #111; border: 1px solid #1e1e1e; border-radius: 16px; padding: 32px; width: 100%; max-width: 460px; max-height: 90vh; overflow-y: auto; }
        .modal-wide { max-width: 720px; }
        .modal-title { font-size: 1.2rem; font-weight: 800; color: #f0ede6; margin-bottom: 6px; }
        .modal-sub { font-size: 0.82rem; color: #3a3a3a; margin-bottom: 28px; }
        .field-label { display: block; font-size: 0.72rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #555; margin-bottom: 7px; }
        .field-input { width: 100%; background: #0a0a0a; border: 1px solid #222; border-radius: 8px; padding: 11px 14px; font-size: 0.9rem; color: #f0ede6; font-family: inherit; outline: none; transition: border-color 0.2s; margin-bottom: 18px; }
        .field-input:focus { border-color: #e8c97e; }
        .field-input::placeholder { color: #333; }
        select.field-input { cursor: pointer; }
        select.field-input option { background: #1a1a1a; color: #f0ede6; }
        .type-toggle { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 18px; }
        .type-btn { padding: 10px; border-radius: 8px; border: 1px solid #222; background: #0a0a0a; color: #555; font-family: inherit; font-size: 0.82rem; font-weight: 600; cursor: pointer; transition: all 0.2s; text-transform: uppercase; letter-spacing: 0.06em; }
        .type-btn.active-income { background: #0b2318; border-color: #6fcf97; color: #6fcf97; }
        .type-btn.active-expense { background: #230b0b; border-color: #eb5757; color: #eb5757; }
        .modal-actions { display: flex; gap: 10px; margin-top: 8px; }
        .save-btn { flex: 1; background: #e8c97e; color: #0a0a0a; border: none; border-radius: 8px; padding: 12px; font-size: 0.9rem; font-weight: 700; font-family: inherit; cursor: pointer; transition: opacity 0.2s; }
        .save-btn:hover { opacity: 0.85; }
        .save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .cancel-btn { flex: 1; background: none; border: 1px solid #222; color: #555; border-radius: 8px; padding: 12px; font-size: 0.9rem; font-family: inherit; cursor: pointer; transition: all 0.2s; }
        .cancel-btn:hover { border-color: #444; color: #888; }

        /* CSV IMPORT STYLES */
        .upload-zone { border: 2px dashed #222; border-radius: 12px; padding: 48px 24px; text-align: center; cursor: pointer; transition: all 0.2s; margin-bottom: 20px; }
        .upload-zone:hover { border-color: #e8c97e; background: #0f0f0a; }
        .upload-zone-icon { font-size: 2.5rem; margin-bottom: 12px; }
        .upload-zone-title { font-size: 1rem; font-weight: 700; color: #ccc; margin-bottom: 6px; }
        .upload-zone-sub { font-size: 0.8rem; color: #444; }
        .col-map-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
        .col-map-item label { display: block; font-size: 0.68rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #555; margin-bottom: 6px; }
        .col-map-item select { width: 100%; background: #0a0a0a; border: 1px solid #222; border-radius: 8px; padding: 9px 12px; font-size: 0.85rem; color: #f0ede6; font-family: inherit; outline: none; cursor: pointer; }
        .col-map-item select option { background: #1a1a1a; }
        .preview-table-wrap { overflow-x: auto; max-height: 320px; overflow-y: auto; margin-bottom: 20px; border: 1px solid #1a1a1a; border-radius: 10px; }
        .preview-table { width: 100%; border-collapse: collapse; min-width: 480px; }
        .preview-table thead th { font-size: 0.65rem; letter-spacing: 0.1em; text-transform: uppercase; color: #333; font-weight: 600; padding: 10px 14px; border-bottom: 1px solid #1a1a1a; text-align: left; background: #0d0d0d; position: sticky; top: 0; }
        .preview-table tbody tr { border-bottom: 1px solid #141414; }
        .preview-table tbody tr:hover { background: #0d0d0d; }
        .preview-table tbody td { padding: 10px 14px; font-size: 0.82rem; color: #888; }
        .import-steps { display: flex; gap: 8px; margin-bottom: 24px; }
        .import-step { font-size: 0.7rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; padding: 4px 12px; border-radius: 20px; background: #1a1a1a; color: #333; }
        .import-step.active { background: #1a1608; color: #e8c97e; border: 1px solid #e8c97e44; }
        .import-step.done { background: #0b2318; color: #6fcf97; }
        .preview-count { font-size: 0.78rem; color: #555; margin-bottom: 12px; }

        /* BULK DELETE BAR */
        .bulk-bar { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: #1a1a1a; border: 1px solid #333; border-radius: 40px; padding: 12px 20px; display: flex; align-items: center; gap: 14px; z-index: 60; box-shadow: 0 8px 32px rgba(0,0,0,0.5); animation: slideUp 0.2s ease; }
        @keyframes slideUp { from { opacity: 0; transform: translateX(-50%) translateY(12px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        .bulk-bar-count { font-size: 0.82rem; color: #888; white-space: nowrap; }
        .bulk-bar-count strong { color: #e8c97e; }
        .bulk-deselect { background: none; border: 1px solid #333; color: #555; font-family: inherit; font-size: 0.75rem; padding: 6px 12px; border-radius: 20px; cursor: pointer; transition: all 0.2s; }
        .bulk-deselect:hover { border-color: #555; color: #888; }
        .bulk-delete-btn { background: #eb5757; color: #fff; border: none; font-family: inherit; font-size: 0.82rem; font-weight: 700; padding: 8px 18px; border-radius: 20px; cursor: pointer; transition: opacity 0.2s; white-space: nowrap; }
        .bulk-delete-btn:hover { opacity: 0.85; }
        .bulk-delete-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        /* CHECKBOX */
        .row-check { width: 16px; height: 16px; accent-color: #e8c97e; cursor: pointer; flex-shrink: 0; }
        .tx-card-check { display: flex; align-items: flex-start; gap: 12px; }
        tr.selected-row { background: #141208 !important; }
        .tx-card.selected-card { border-color: #e8c97e44; background: #141208; }

        /* FAB */
        .fab { display: none; position: fixed; bottom: 24px; right: 24px; width: 56px; height: 56px; border-radius: 50%; background: #e8c97e; color: #0a0a0a; border: none; font-size: 1.6rem; font-weight: 700; cursor: pointer; z-index: 40; box-shadow: 0 4px 20px rgba(232,201,126,0.3); align-items: center; justify-content: center; transition: opacity 0.2s; }
        .fab:hover { opacity: 0.85; }

        /* RESPONSIVE */
        @media (max-width: 768px) {
          .navbar { padding: 14px 20px; }
          .nav-right .logout-btn, .nav-right .nav-badge { display: none; }
          .hamburger { display: flex; }
          .header { padding: 20px 20px 16px; }
          .header-left h1 { font-size: 1.5rem; }
          .header-actions { display: none; }
          .fab { display: flex; }
          .stats { grid-template-columns: 1fr; gap: 1px; }
          .stat { padding: 18px 20px; display: flex; align-items: center; justify-content: space-between; }
          .stat-value { font-size: 1.4rem; }
          .page-tabs { padding: 0 20px; }
          .page-tab { padding: 14px 14px; font-size: 0.75rem; }
          .content { padding: 20px; }
          .filter-bar { gap: 8px; }
          .search-input { min-width: 100%; }
          .date-range { width: 100%; }
          .date-input { flex: 1; min-width: 0; }
          .table-wrap { display: none; }
          .tx-cards { display: flex; }
          .charts-grid { grid-template-columns: 1fr; }
          .chart-card { padding: 20px; }
          .pagination { justify-content: center; }
          .page-numbers { display: none; }
          .page-info { margin-left: 0; }
          .col-map-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 480px) {
          .filter-tabs { width: 100%; }
          .filter-tab { flex: 1; text-align: center; padding: 8px 6px; font-size: 0.7rem; }
          .modal { padding: 24px 20px; border-radius: 12px; }
          .modal-title { font-size: 1.1rem; }
        }
      `}</style>

      <div className="page">
        {/* NAVBAR */}
        <nav className="navbar">
          <div className="nav-logo">MyFinance</div>
          <div className="nav-right">
            <span className="nav-badge">{transactions.length} transactions</span>
            <button className="logout-btn" onClick={() => { setReportForm({ email: "", period: "THIS_MONTH" }); setShowReportModal(true); }}>📧 Report</button>
            <button className="logout-btn" onClick={() => window.location.href = "/profile"}>Profile</button>
            <button className="logout-btn" onClick={handleLogout}>Logout</button>
            <button className="hamburger" onClick={() => setMenuOpen(o => !o)}>{menuOpen ? "✕" : "☰"}</button>
          </div>
        </nav>

        {/* MOBILE MENU */}
        <div className={`mobile-menu ${menuOpen ? "open" : ""}`}>
          <button className="mobile-menu-btn" onClick={() => { setMenuOpen(false); setShowImportModal(true); setImportStep("upload"); }}>📂 Import CSV</button>
          <button className="mobile-menu-btn" onClick={() => { setMenuOpen(false); setReportForm({ email: "", period: "THIS_MONTH" }); setShowReportModal(true); }}>📧 Email Report</button>
          <button className="mobile-menu-btn" onClick={() => { setMenuOpen(false); window.location.href = "/profile"; }}>👤 Profile</button>
          <button className="mobile-menu-btn" onClick={handleLogout}>🚪 Logout</button>
        </div>

        {/* HEADER */}
        <div className="header">
          <div className="header-left">
            <h1>Your <span>Overview</span></h1>
            <p>Track your income and expenses in one place</p>
          </div>
          <div className="header-actions">
            <button className="import-btn" onClick={() => { setShowImportModal(true); setImportStep("upload"); }}>📂 Import CSV</button>
            <button className="add-btn" onClick={openAddModal}>+ Add Transaction</button>
          </div>
        </div>

        {/* STATS */}
        {!loading && (
          <div className="stats">
            <div className="stat">
              <div><div className="stat-label">Total Income</div><div className="stat-sub">{transactions.filter(t => t.type === "INCOME").length} entries</div></div>
              <div className="stat-value green">{formatAmount(totalIncome)}</div>
            </div>
            <div className="stat">
              <div><div className="stat-label">Total Expenses</div><div className="stat-sub">{transactions.filter(t => t.type === "EXPENSE").length} entries</div></div>
              <div className="stat-value red">{formatAmount(totalExpense)}</div>
            </div>
            <div className="stat">
              <div><div className="stat-label">Net Balance</div><div className="stat-sub">{net >= 0 ? "You're in the green" : "Spending exceeds income"}</div></div>
              <div className={`stat-value ${net >= 0 ? "gold" : "red"}`}>{formatAmount(net)}</div>
            </div>
          </div>
        )}

        {/* PAGE TABS */}
        <div className="page-tabs">
          <button className={`page-tab ${activeTab === "transactions" ? "active" : ""}`} onClick={() => setActiveTab("transactions")}>Transactions</button>
          <button className={`page-tab ${activeTab === "analytics" ? "active" : ""}`} onClick={() => setActiveTab("analytics")}>Analytics</button>
        </div>

        <div className="content">
          {activeTab === "transactions" && (
            <>
              <div className="filter-bar">
                <input className="search-input" type="text" placeholder="Search by category or description..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
                <div className="filter-tabs">
                  <button className={`filter-tab ${filterType === "ALL" ? "active-all" : ""}`} onClick={() => { setFilterType("ALL"); setPage(1); }}>All</button>
                  <button className={`filter-tab ${filterType === "INCOME" ? "active-income" : ""}`} onClick={() => { setFilterType("INCOME"); setPage(1); }}>Income</button>
                  <button className={`filter-tab ${filterType === "EXPENSE" ? "active-expense" : ""}`} onClick={() => { setFilterType("EXPENSE"); setPage(1); }}>Expense</button>
                </div>
                <div className="date-range">
                  <input className="date-input" type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} />
                  <span className="date-sep">→</span>
                  <input className="date-input" type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} />
                  {(dateFrom || dateTo) && (<button className="clear-date-btn" onClick={() => { setDateFrom(""); setDateTo(""); setPage(1); }}>✕ Clear</button>)}
                </div>
                {(search || filterType !== "ALL" || dateFrom || dateTo) && (
                  <span className="results-info">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
                )}
              </div>

              {loading ? (
                <div className="center-msg"><div className="spinner" /><span>Loading…</span></div>
              ) : filtered.length === 0 ? (
                <div className="center-msg"><span>{transactions.length === 0 ? "No transactions yet — add your first one!" : "No results found"}</span></div>
              ) : (
                <>
                  <div className="table-wrap">
                    <table>
                      <thead><tr>
                          <th style={{width:32}}><input type="checkbox" className="row-check" checked={paginated.length > 0 && selectedIds.size === paginated.length} onChange={toggleSelectAll} /></th>
                          <th>Category</th><th>Description</th><th>Type</th><th>Amount</th><th>Actions</th>
                        </tr></thead>
                      <tbody>
                        {paginated.map((t) => (
                          <tr key={t.id} className={selectedIds.has(t.id) ? "selected-row" : ""}>
                            <td><input type="checkbox" className="row-check" checked={selectedIds.has(t.id)} onChange={() => toggleSelect(t.id)} /></td>
                            <td className="cat-cell"><span style={{ marginRight: 8 }}>{getCategoryIcon(t.category)}</span>{t.category.replace("_", " ")}</td>
                            <td className="desc-cell">{t.description || "—"}</td>
                            <td><span className={`badge ${t.type}`}>{t.type}</span></td>
                            <td className={`amt ${t.type}`}>{t.type === "EXPENSE" ? "−" : "+"}{formatAmount(t.amountCents)}</td>
                            <td>
                              <div className="actions-cell">
                                <button className="edit-btn" onClick={() => openEditModal(t)}>Edit</button>
                                <button className="del-btn" onClick={() => handleDelete(t.id)} disabled={deletingId === t.id}>{deletingId === t.id ? "…" : "Delete"}</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="tx-cards">
                    {paginated.map((t) => (
                      <div className={`tx-card ${selectedIds.has(t.id) ? "selected-card" : ""}`} key={t.id}>
                        <div className="tx-card-check">
                          <input type="checkbox" className="row-check" style={{marginTop:3}} checked={selectedIds.has(t.id)} onChange={() => toggleSelect(t.id)} />
                          <div style={{flex:1}}>
                            <div className="tx-card-top">
                              <div className="tx-card-cat"><span>{getCategoryIcon(t.category)}</span>{t.category.replace("_", " ")}<span className={`badge ${t.type}`}>{t.type}</span></div>
                              <div className={`tx-card-amt ${t.type}`}>{t.type === "EXPENSE" ? "−" : "+"}{formatAmount(t.amountCents)}</div>
                            </div>
                            <div className="tx-card-bot">
                              <div className="tx-card-desc">{t.description || "—"}</div>
                              <div className="tx-card-actions">
                                <button className="edit-btn" onClick={() => openEditModal(t)}>Edit</button>
                                <button className="del-btn" onClick={() => handleDelete(t.id)} disabled={deletingId === t.id}>{deletingId === t.id ? "…" : "Delete"}</button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <div className="pagination">
                      <button className="page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
                      <div className="page-numbers">
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                          .reduce((acc, n, i, arr) => { if (i > 0 && n - arr[i - 1] > 1) acc.push("..."); acc.push(n); return acc; }, [])
                          .map((n, i) => n === "..." ? <span key={`d-${i}`} className="page-dots">…</span> : <button key={n} className={`page-num ${page === n ? "active" : ""}`} onClick={() => setPage(n)}>{n}</button>)}
                      </div>
                      <button className="page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next →</button>
                      <span className="page-info">{((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {activeTab === "analytics" && (
            <div className="charts-grid">
              <div className="chart-card">
                <div className="chart-title">Spending by Category</div>
                {pieData.length === 0 ? <div className="chart-empty">No expense data yet</div> : (
                  <>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                          {pieData.map((_, i) => (<Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />))}
                        </Pie>
                        <Tooltip formatter={(val) => [`$${val.toFixed(2)}`, "Amount"]} contentStyle={{ background: "#111", border: "1px solid #222", borderRadius: "8px", color: "#f0ede6" }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pie-legend">
                      {pieData.map((entry, i) => (
                        <div className="pie-legend-item" key={i}>
                          <div className="pie-legend-dot" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span>{getCategoryIcon(entry.name)}</span>
                          {entry.name.replace("_", " ")}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <div className="chart-card">
                <div className="chart-title">Income vs Expenses by Month</div>
                {barData.length === 0 ? <div className="chart-empty">No data yet</div> : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={barData} barCategoryGap="30%">
                      <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                      <XAxis dataKey="month" tick={{ fill: "#444", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#444", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                      <Tooltip formatter={(val) => [`$${val.toFixed(2)}`]} contentStyle={{ background: "#111", border: "1px solid #222", borderRadius: "8px", color: "#f0ede6" }} />
                      <Legend wrapperStyle={{ fontSize: "0.75rem", color: "#555" }} />
                      <Bar dataKey="Income" fill="#6fcf97" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Expenses" fill="#eb5757" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* BULK DELETE BAR */}
      {selectedIds.size > 0 && (
        <div className="bulk-bar">
          <span className="bulk-bar-count"><strong>{selectedIds.size}</strong> selected</span>
          <button className="bulk-deselect" onClick={() => setSelectedIds(new Set())}>✕ Deselect</button>
          <button className="bulk-delete-btn" onClick={handleBulkDelete} disabled={bulkDeleting}>
            {bulkDeleting ? "Deleting…" : `🗑 Delete ${selectedIds.size}`}
          </button>
        </div>
      )}

      {/* FAB */}
      <button className="fab" onClick={openAddModal}>+</button>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">{editingTransaction ? "Edit Transaction" : "Add Transaction"}</div>
            <div className="modal-sub">{editingTransaction ? "Update the details below" : "Enter the details below"}</div>
            <form onSubmit={handleSave}>
              <label className="field-label">Type</label>
              <div className="type-toggle">
                <button type="button" className={`type-btn ${form.type === "INCOME" ? "active-income" : ""}`} onClick={() => setForm({ ...form, type: "INCOME", category: "" })}>Income</button>
                <button type="button" className={`type-btn ${form.type === "EXPENSE" ? "active-expense" : ""}`} onClick={() => setForm({ ...form, type: "EXPENSE", category: "" })}>Expense</button>
              </div>
              <label className="field-label">Category</label>
              <select className="field-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required>
                <option value="">Select a category...</option>
                {Object.entries(CATEGORIES).filter(([, v]) => v.type === form.type).map(([name, { icon }]) => (
                  <option key={name} value={name}>{icon} {name.replace("_", " ")}</option>
                ))}
              </select>
              <label className="field-label">Amount ($)</label>
              <input className="field-input" type="number" step="0.01" min="0.01" placeholder="0.00" value={form.amountCents} onChange={(e) => setForm({ ...form, amountCents: e.target.value })} required />
              <label className="field-label">Description (optional)</label>
              <input className="field-input" type="text" placeholder="Add a note..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="save-btn" disabled={saving}>{saving ? "Saving…" : editingTransaction ? "Update" : "Save Transaction"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="overlay" onClick={() => setShowReportModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">📧 Email Report</div>
            <div className="modal-sub">Send a financial summary to your inbox</div>
            <label className="field-label">Period</label>
            <div className="type-toggle" style={{ gridTemplateColumns: "1fr 1fr 1fr", marginBottom: 18 }}>
              <button type="button" className={`type-btn ${reportForm.period === "THIS_MONTH" ? "active-income" : ""}`} onClick={() => setReportForm({ ...reportForm, period: "THIS_MONTH" })}>This Month</button>
              <button type="button" className={`type-btn ${reportForm.period === "LAST_30" ? "active-income" : ""}`} onClick={() => setReportForm({ ...reportForm, period: "LAST_30" })}>Last 30 Days</button>
              <button type="button" className={`type-btn ${reportForm.period === "ALL_TIME" ? "active-income" : ""}`} onClick={() => setReportForm({ ...reportForm, period: "ALL_TIME" })}>All Time</button>
            </div>
            <label className="field-label">Send to Email</label>
            <input className="field-input" type="email" placeholder="you@example.com" value={reportForm.email} onChange={(e) => setReportForm({ ...reportForm, email: e.target.value })} />
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowReportModal(false)}>Cancel</button>
              <button className="save-btn" onClick={handleSendReport} disabled={sendingReport || !reportForm.email}>{sendingReport ? "Sending…" : "Send Report"}</button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showImportModal && (
        <div className="overlay" onClick={resetImport}>
          <div className={`modal modal-wide`} onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">📂 Import Statement</div>
            <div className="modal-sub">Import transactions from your bank statement</div>

            {/* File type toggle — only show on upload step */}
            {importStep === "upload" && (
              <div className="type-toggle" style={{ marginBottom: 20 }}>
                <button type="button" className={`type-btn ${importMode === "csv" ? "active-income" : ""}`}
                  onClick={() => setImportMode("csv")}>📄 CSV File</button>
                <button type="button" className={`type-btn ${importMode === "pdf" ? "active-income" : ""}`}
                  onClick={() => setImportMode("pdf")}>📑 PDF Statement</button>
              </div>
            )}

            {/* Steps indicator */}
            <div className="import-steps">
              <span className={`import-step ${importStep === "upload" ? "active" : importStep !== "upload" ? "done" : ""}`}>1. Upload</span>
              {importMode === "csv" && (
                <span className={`import-step ${importStep === "map" ? "active" : importStep === "preview" ? "done" : ""}`}>2. Map Columns</span>
              )}
              <span className={`import-step ${importStep === "preview" ? "active" : ""}`}>{importMode === "csv" ? "3." : "2."} Preview & Import</span>
            </div>

            {/* Step 1: Upload */}
            {importStep === "upload" && (
              <>
                {importMode === "csv" ? (
                  <>
                    <div className="upload-zone" onClick={() => fileInputRef.current?.click()}>
                      <div className="upload-zone-icon">📄</div>
                      <div className="upload-zone-title">Click to upload a CSV file</div>
                      <div className="upload-zone-sub">Supports any bank CSV export with comma-separated values</div>
                    </div>
                    <input ref={fileInputRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleFileChange} />
                  </>
                ) : (
                  <>
                    <div className="upload-zone" onClick={() => !uploadingPdf && pdfInputRef.current?.click()}
                      style={{ opacity: uploadingPdf ? 0.6 : 1, cursor: uploadingPdf ? "not-allowed" : "pointer" }}>
                      <div className="upload-zone-icon">{uploadingPdf ? "⏳" : "📑"}</div>
                      <div className="upload-zone-title">{uploadingPdf ? "Parsing PDF…" : "Click to upload a Chase PDF statement"}</div>
                      <div className="upload-zone-sub">{uploadingPdf ? "Extracting transactions, please wait" : "Chase bank statement PDF — no password required"}</div>
                    </div>
                    <input ref={pdfInputRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={handlePdfChange} />
                  </>
                )}
                <div className="modal-actions">
                  <button className="cancel-btn" onClick={resetImport}>Cancel</button>
                </div>
              </>
            )}

            {/* Step 2: Map Columns (CSV only) */}
            {importStep === "map" && importMode === "csv" && (
              <>
                <p style={{ fontSize: "0.82rem", color: "#555", marginBottom: 16 }}>
                  Found <strong style={{ color: "#ccc" }}>{csvRows.length} rows</strong> and <strong style={{ color: "#ccc" }}>{csvHeaders.length} columns</strong>. Map your CSV columns below.
                </p>
                <div className="col-map-grid">
                  {[
                    { key: "description", label: "Description column" },
                    { key: "debit",       label: "Debit / Withdrawal column" },
                    { key: "credit",      label: "Credit / Deposit column" },
                    { key: "category",    label: "Category column (optional)" },
                  ].map(({ key, label }) => (
                    <div className="col-map-item" key={key}>
                      <label>{label}</label>
                      <select value={colMap[key]} onChange={(e) => setColMap(m => ({ ...m, [key]: e.target.value }))}>
                        <option value="">— not mapped —</option>
                        {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
                <div className="modal-actions">
                  <button className="cancel-btn" onClick={() => setImportStep("upload")}>← Back</button>
                  <button className="save-btn" disabled={!colMap.debit && !colMap.credit} onClick={() => setImportStep("preview")}>Preview →</button>
                </div>
              </>
            )}

            {/* Step 3: Preview */}
            {importStep === "preview" && (
              <>
                <p className="preview-count">{activePreviewRows.length} transactions ready to import</p>
                <div className="preview-table-wrap">
                  <table className="preview-table">
                    <thead>
                      <tr><th>Type</th><th>Category</th><th>Description</th><th>Amount</th></tr>
                    </thead>
                    <tbody>
                      {activePreviewRows.map((r, i) => (
                        <tr key={i}>
                          <td><span className={`badge ${r.type}`}>{r.type}</span></td>
                          <td style={{ color: "#ccc" }}>{getCategoryIcon(r.category)} {r.category.replace("_", " ")}</td>
                          <td style={{ color: "#444", fontSize: "0.78rem" }}>{r.description || "—"}</td>
                          <td className={`amt ${r.type}`}>{r.type === "EXPENSE" ? "−" : "+"}{formatAmount(r.amountCents)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="modal-actions">
                  <button className="cancel-btn" onClick={() => setImportStep(importMode === "csv" ? "map" : "upload")}>← Back</button>
                  <button className="save-btn" disabled={importing || activePreviewRows.length === 0} onClick={handleImportAll}>
                    {importing ? "Importing…" : `Import ${activePreviewRows.length} Transactions`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} />
    </>
  );
}

export default Dashboard;
