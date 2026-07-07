import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Trash2, Edit2, Check, X, FileText, Download, Upload, RefreshCw, 
  Settings, TrendingUp, DollarSign, Calendar, ShieldCheck, PieChart, 
  FileSpreadsheet, ClipboardList, AlertTriangle, ArrowUpRight, ArrowDownRight, Printer, Info
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line
} from 'recharts';

import { WorkbookState, BudgetItem, ChangeOrder, ActualCost, Milestone, ProgressBilling, ClientReceipt, HoldbackRelease } from './types';
import { initialWorkbookState } from './initialData';
import { 
  formatCurrency, 
  formatCurrencyCompact, 
  formatPercent, 
  formatDate, 
  addDays, 
  getOverdueDays, 
  calculateWorkbookState, 
  generateCashFlowTimeline, 
  parseCSV 
} from './utils';

export default function App() {
  // State initialization with localStorage fallback
  const [state, setState] = useState<WorkbookState>(() => {
    const saved = localStorage.getItem('cm_project_workbook_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.projectSetup && parsed.budget) {
          return parsed;
        }
      } catch (e) {
        console.error("Failed to parse local storage", e);
      }
    }
    return initialWorkbookState;
  });

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto-save logic
  useEffect(() => {
    const stateToSave = {
      ...state,
      lastSaved: new Date().toISOString()
    };
    localStorage.setItem('cm_project_workbook_state', JSON.stringify(stateToSave));
  }, [state]);

  // Toast message helpers
  const triggerSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };
  const triggerError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 4000);
  };

  // Reset Workbook State
  const handleResetData = () => {
    if (window.confirm("Are you sure you want to reset all workbook data back to the demo project? Any unsaved edits will be overwritten.")) {
      setState(initialWorkbookState);
      triggerSuccess("Workbook state restored to initial demo project!");
    }
  };

  // Export state as a backup JSON file
  const handleExportBackup = () => {
    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `${state.projectSetup.projectName.replace(/\s+/g, '_')}_backup_${dateStr}.json`;
    const jsonStr = JSON.stringify(state, null, 2);
    
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    triggerSuccess("Backup JSON file exported successfully!");
  };

  // Import state from a backup JSON file
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        
        // Validation check
        if (parsed.projectSetup && Array.isArray(parsed.budget) && Array.isArray(parsed.changeOrders)) {
          setState({
            ...parsed,
            lastSaved: new Date().toISOString()
          });
          triggerSuccess("Backup JSON state imported and applied successfully!");
        } else {
          triggerError("Invalid backup file structure. Please check the JSON format.");
        }
      } catch (err) {
        triggerError("Failed to parse file. Ensure it is a valid JSON backup file.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Bulk CSV Import helpers
  const [csvTarget, setCsvTarget] = useState<'actuals' | 'budget' | null>(null);
  const [csvText, setCsvText] = useState<string>('');
  
  const handleCSVImportSubmit = () => {
    if (!csvText.trim()) {
      triggerError("Please paste or load CSV content first.");
      return;
    }
    const rows = parseCSV(csvText);
    if (rows.length < 2) {
      triggerError("CSV file must contain a header and at least one data row.");
      return;
    }

    const headers = rows[0].map(h => h.toLowerCase());

    if (csvTarget === 'actuals') {
      // Expected headers: Date, Cost Code, Description, Amount
      const dateIdx = headers.findIndex(h => h.includes('date'));
      const codeIdx = headers.findIndex(h => h.includes('code') || h.includes('cost'));
      const descIdx = headers.findIndex(h => h.includes('desc'));
      const amtIdx = headers.findIndex(h => h.includes('amt') || h.includes('amount'));

      if (dateIdx === -1 || codeIdx === -1 || amtIdx === -1) {
        triggerError("CSV must contain columns matching 'Date', 'Cost Code' (or 'Code'), and 'Amount'.");
        return;
      }

      const importedActuals: ActualCost[] = [];
      let skippedCount = 0;

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < Math.max(dateIdx, codeIdx, amtIdx) + 1) {
          skippedCount++;
          continue;
        }

        const date = row[dateIdx];
        const costCode = row[codeIdx];
        const description = descIdx !== -1 ? row[descIdx] : "CSV Import Expense";
        const amount = parseFloat(row[amtIdx].replace(/[$,\s]/g, ''));

        if (!date || !costCode || isNaN(amount)) {
          skippedCount++;
          continue;
        }

        importedActuals.push({
          id: `AC-CSV-${Date.now()}-${i}`,
          date,
          costCode,
          description,
          amount
        });
      }

      setState(prev => ({
        ...prev,
        actualCosts: [...prev.actualCosts, ...importedActuals]
      }));
      triggerSuccess(`Successfully imported ${importedActuals.length} Actual Cost transactions! ${skippedCount > 0 ? `(Skipped ${skippedCount} invalid rows)` : ''}`);

    } else if (csvTarget === 'budget') {
      // Expected headers: Cost Code, Category, Original Budget
      const codeIdx = headers.findIndex(h => h.includes('code') || h.includes('cost'));
      const catIdx = headers.findIndex(h => h.includes('cat') || h.includes('name'));
      const budIdx = headers.findIndex(h => h.includes('bud') || h.includes('orig') || h.includes('amount'));

      if (codeIdx === -1 || catIdx === -1 || budIdx === -1) {
        triggerError("CSV must contain columns matching 'Cost Code', 'Category', and 'Original Budget'.");
        return;
      }

      const importedBudget: BudgetItem[] = [];
      let skippedCount = 0;

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < Math.max(codeIdx, catIdx, budIdx) + 1) {
          skippedCount++;
          continue;
        }

        const costCode = row[codeIdx];
        const category = row[catIdx];
        const originalBudget = parseFloat(row[budIdx].replace(/[$,\s]/g, ''));

        if (!costCode || !category || isNaN(originalBudget)) {
          skippedCount++;
          continue;
        }

        // Check if cost code already exists
        importedBudget.push({
          costCode,
          category,
          originalBudget
        });
      }

      // Merge or overwrite? Let's append, ignoring duplicate cost codes
      setState(prev => {
        const existingCodes = new Set(prev.budget.map(b => b.costCode));
        const nonDuplicateImports = importedBudget.filter(b => !existingCodes.has(b.costCode));
        const skippedDupes = importedBudget.length - nonDuplicateImports.length;
        
        if (skippedDupes > 0) {
          setTimeout(() => triggerSuccess(`Imported ${nonDuplicateImports.length} new categories. Skipped ${skippedDupes} existing cost codes.`), 50);
        }

        return {
          ...prev,
          budget: [...prev.budget, ...nonDuplicateImports]
        };
      });
    }

    setCsvText('');
    setCsvTarget(null);
  };

  // Re-run calculations on-the-fly
  const calculations = calculateWorkbookState(state);
  const cashFlowTimeline = generateCashFlowTimeline(state, calculations);

  // Sub-state managers for forms & dialog overlays
  // 1. Budget Adding
  const [newBudget, setNewBudget] = useState({ costCode: '', category: '', originalBudget: '' });
  const handleAddBudget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBudget.costCode.trim() || !newBudget.category.trim()) {
      triggerError("Please fill out Cost Code and Category.");
      return;
    }
    const alreadyExists = state.budget.some(b => b.costCode.toLowerCase() === newBudget.costCode.trim().toLowerCase());
    if (alreadyExists) {
      triggerError(`Cost Code ${newBudget.costCode} already exists.`);
      return;
    }
    const amount = parseFloat(newBudget.originalBudget) || 0;
    
    setState(prev => ({
      ...prev,
      budget: [...prev.budget, {
        costCode: newBudget.costCode.trim(),
        category: newBudget.category.trim(),
        originalBudget: amount
      }]
    }));
    setNewBudget({ costCode: '', category: '', originalBudget: '' });
    triggerSuccess("Budget category added successfully!");
  };

  const handleDeleteBudget = (costCode: string) => {
    // Check if there are active ties
    const hasActuals = state.actualCosts.some(ac => ac.costCode === costCode);
    const hasCO = state.changeOrders.some(co => co.costCode === costCode);
    if (hasActuals || hasCO) {
      if (!window.confirm(`Cost Code ${costCode} has linked Actual Costs or Change Orders. Deleting it will leave those transactions orphaned. Proceed?`)) {
        return;
      }
    }
    setState(prev => ({
      ...prev,
      budget: prev.budget.filter(b => b.costCode !== costCode)
    }));
    triggerSuccess(`Budget cost code ${costCode} removed.`);
  };

  // 2. Change Orders Management
  const [newCO, setNewCO] = useState({ id: '', costCode: '', description: '', amount: '', status: 'Pending', date: '' });
  const handleAddCO = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCO.id.trim() || !newCO.costCode || !newCO.description.trim()) {
      triggerError("ID, Cost Code selection, and Description are required.");
      return;
    }
    if (state.changeOrders.some(co => co.id.toLowerCase() === newCO.id.trim().toLowerCase())) {
      triggerError(`Change Order ID ${newCO.id} already exists.`);
      return;
    }
    setState(prev => ({
      ...prev,
      changeOrders: [...prev.changeOrders, {
        id: newCO.id.trim().toUpperCase(),
        costCode: newCO.costCode,
        description: newCO.description.trim(),
        amount: parseFloat(newCO.amount) || 0,
        status: newCO.status as 'Approved' | 'Pending' | 'Rejected',
        date: newCO.date || new Date().toISOString().slice(0, 10)
      }]
    }));
    setNewCO({ id: '', costCode: '', description: '', amount: '', status: 'Pending', date: '' });
    triggerSuccess("Change Order logged successfully!");
  };

  const handleUpdateCOStatus = (id: string, nextStatus: 'Approved' | 'Pending' | 'Rejected') => {
    setState(prev => ({
      ...prev,
      changeOrders: prev.changeOrders.map(co => co.id === id ? { ...co, status: nextStatus } : co)
    }));
    triggerSuccess(`Change Order ${id} status updated to ${nextStatus}.`);
  };

  const handleDeleteCO = (id: string) => {
    setState(prev => ({
      ...prev,
      changeOrders: prev.changeOrders.filter(co => co.id !== id)
    }));
    triggerSuccess(`Change order ${id} deleted.`);
  };

  // 3. Actual Costs Management
  const [newActual, setNewActual] = useState({ date: '', costCode: '', description: '', amount: '' });
  const handleAddActual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActual.date || !newActual.costCode || !newActual.description.trim() || !newActual.amount) {
      triggerError("Please fill out all actual cost fields.");
      return;
    }
    setState(prev => ({
      ...prev,
      actualCosts: [...prev.actualCosts, {
        id: `AC-${Date.now()}`,
        date: newActual.date,
        costCode: newActual.costCode,
        description: newActual.description.trim(),
        amount: parseFloat(newActual.amount) || 0
      }]
    }));
    setNewActual({ date: '', costCode: '', description: '', amount: '' });
    triggerSuccess("Actual expense record added.");
  };

  const handleDeleteActual = (id: string) => {
    setState(prev => ({
      ...prev,
      actualCosts: prev.actualCosts.filter(ac => ac.id !== id)
    }));
    triggerSuccess("Expense record deleted.");
  };

  // 4. Progress Billing Management
  const [newBilling, setNewBilling] = useState({ billingPeriod: '', cutOffDate: '', cumulativePercent: '' });
  const handleAddBilling = (e: React.FormEvent) => {
    e.preventDefault();
    const period = parseInt(newBilling.billingPeriod, 10);
    if (isNaN(period) || period <= 0 || !newBilling.cutOffDate || !newBilling.cumulativePercent) {
      triggerError("Please supply valid period, cutoff date, and progress % values.");
      return;
    }
    if (state.progressBilling.some(pb => pb.billingPeriod === period)) {
      triggerError(`Progress Billing for Period ${period} already exists.`);
      return;
    }
    
    const percentage = parseFloat(newBilling.cumulativePercent) / 100;
    
    setState(prev => {
      // Automatically generate a blank Client Receipt tracker record matching this invoice number
      const invoiceNo = `INV-${period.toString().padStart(2, '0')}`;
      const newInvoice: ClientReceipt = {
        invoiceNo,
        issueDate: newBilling.cutOffDate,
        amountReceived: 0
      };

      return {
        ...prev,
        progressBilling: [...prev.progressBilling, {
          billingPeriod: period,
          cutOffDate: newBilling.cutOffDate,
          cumulativePercent: percentage
        }],
        clientReceipts: [...prev.clientReceipts, newInvoice]
      };
    });

    setNewBilling({ billingPeriod: '', cutOffDate: '', cumulativePercent: '' });
    triggerSuccess(`Logged Billing Period ${period} & initialized Invoice INV-${period.toString().padStart(2, '0')}!`);
  };

  const handleDeleteBilling = (period: number) => {
    if (window.confirm(`Deleting Billing Period ${period} will also delete its matching Client Receipt record. Confirm?`)) {
      setState(prev => ({
        ...prev,
        progressBilling: prev.progressBilling.filter(pb => pb.billingPeriod !== period),
        clientReceipts: prev.clientReceipts.filter(cr => {
          const match = cr.invoiceNo.match(/\d+/);
          return match ? parseInt(match[0], 10) !== period : true;
        })
      }));
      triggerSuccess(`Billing Period ${period} deleted.`);
    }
  };

  // 5. Client Receipts Editing
  const handleUpdateReceiptPayment = (invoiceNo: string, amount: number) => {
    setState(prev => ({
      ...prev,
      clientReceipts: prev.clientReceipts.map(cr => cr.invoiceNo === invoiceNo ? { ...cr, amountReceived: amount } : cr)
    }));
  };

  // 6. Holdback release Management
  const [newRelease, setNewRelease] = useState({ date: '', description: '', amount: '' });
  const handleAddRelease = (e: React.FormEvent) => {
    e.preventDefault();
    const releaseAmount = parseFloat(newRelease.amount);
    if (!newRelease.date || !newRelease.description.trim() || isNaN(releaseAmount) || releaseAmount <= 0) {
      triggerError("Please enter release date, description, and positive amount.");
      return;
    }
    if (releaseAmount > calculations.holdbackSummary.currentBalance) {
      triggerError(`Release amount exceed current holdback account balance (${formatCurrency(calculations.holdbackSummary.currentBalance)})`);
      return;
    }

    setState(prev => ({
      ...prev,
      holdbackReleases: [...prev.holdbackReleases, {
        id: `HR-${Date.now()}`,
        date: newRelease.date,
        description: newRelease.description.trim(),
        amount: releaseAmount
      }]
    }));

    setNewRelease({ date: '', description: '', amount: '' });
    triggerSuccess("Holdback release transaction executed.");
  };

  const handleDeleteRelease = (id: string) => {
    setState(prev => ({
      ...prev,
      holdbackReleases: prev.holdbackReleases.filter(hr => hr.id !== id)
    }));
    triggerSuccess("Release transaction cancelled.");
  };

  // 7. Milestones Checklist Update
  const handleToggleMilestone = (id: string, status: 'Completed' | 'In Progress' | 'Pending') => {
    setState(prev => ({
      ...prev,
      milestones: prev.milestones.map(m => {
        if (m.id === id) {
          return {
            ...m,
            status,
            completedDate: status === 'Completed' ? new Date().toISOString().slice(0, 10) : undefined
          };
        }
        return m;
      })
    }));
  };

  const [newMilestone, setNewMilestone] = useState({ name: '', targetDate: '' });
  const handleAddMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilestone.name.trim() || !newMilestone.targetDate) {
      triggerError("Please enter both milestone name and target date.");
      return;
    }
    setState(prev => ({
      ...prev,
      milestones: [...prev.milestones, {
        id: `M-${Date.now()}`,
        name: newMilestone.name.trim(),
        targetDate: newMilestone.targetDate,
        status: 'Pending'
      }]
    }));
    setNewMilestone({ name: '', targetDate: '' });
    triggerSuccess("New project milestone tracked.");
  };

  const handleDeleteMilestone = (id: string) => {
    setState(prev => ({
      ...prev,
      milestones: prev.milestones.filter(m => m.id !== id)
    }));
    triggerSuccess("Milestone removed from timeline.");
  };

  // 8. Invoice Template Selection
  const [selectedInvoiceNo, setSelectedInvoiceNo] = useState<string>(() => {
    if (state.clientReceipts.length > 0) {
      return state.clientReceipts[0].invoiceNo;
    }
    return '';
  });

  // Sync invoice selection when clientReceipts change
  useEffect(() => {
    if (state.clientReceipts.length > 0 && !state.clientReceipts.some(cr => cr.invoiceNo === selectedInvoiceNo)) {
      setSelectedInvoiceNo(state.clientReceipts[0].invoiceNo);
    }
  }, [state.clientReceipts, selectedInvoiceNo]);

  return (
    <div className="min-h-screen bg-[#F5F5F2] flex flex-col font-body">
      
      {/* Dynamic Success / Error Toasts */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 bg-[#00C853] text-white px-5 py-3 rounded-lg shadow-apple-lg flex items-center gap-2 animate-fade-up">
          <Check size={18} className="stroke-[3]" />
          <span className="font-medium text-xs tracking-wide">{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="fixed top-4 right-4 z-50 bg-[#D32F2F] text-white px-5 py-3 rounded-lg shadow-apple-lg flex items-center gap-2 animate-fade-up">
          <AlertTriangle size={18} />
          <span className="font-medium text-xs tracking-wide">{errorMessage}</span>
        </div>
      )}

      {/* ── Sticky Nav Bar (56px) ── */}
      <header className="sticky top-0 z-40 bg-white h-[56px] border-b border-[#E8E8E6] shadow-apple-nav">
        <div className="max-w-[1400px] h-full mx-auto px-6 sm:px-10 flex items-center justify-between">
          
          {/* Brand Identity / Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-[#051C2C] flex items-center justify-center text-white">
              <FileSpreadsheet size={16} />
            </div>
            <div>
              <span className="font-heading-style text-lg font-bold tracking-tight text-[#051C2C]">
                Vertex Control Pro
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] tracking-wider uppercase font-semibold text-[#888888] border-l border-[#E8E8E6] pl-2">
                Project Control Center
              </span>
            </div>
          </div>

          {/* Navigation Tab selection */}
          <nav className="flex h-full items-center">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: PieChart },
              { id: 'setup', label: 'Setup', icon: Settings },
              { id: 'budget', label: 'Budget & Actuals', icon: DollarSign },
              { id: 'change-orders', label: 'Change Orders', icon: ClipboardList },
              { id: 'progress', label: 'Progress & Milestones', icon: Calendar },
              { id: 'receipts', label: 'Client Invoices', icon: FileText },
              { id: 'holdback', label: 'Holdback Account', icon: ShieldCheck },
              { id: 'cashflow', label: 'Cash Flow Timeline', icon: TrendingUp },
              { id: 'invoice', label: 'Voucher', icon: FileText },
            ].map((tab) => {
              const IconComp = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  id={`nav-tab-${tab.id}`}
                  className={`h-full px-3 md:px-4 flex items-center gap-1.5 border-b-2 text-[13px] font-medium tracking-wide transition-all duration-150 cursor-pointer ${
                    isActive 
                    ? 'border-[#2251FF] text-[#051C2C]' 
                    : 'border-transparent text-[#888888] hover:text-[#051C2C]'
                  }`}
                >
                  <IconComp size={14} className={isActive ? 'text-[#2251FF]' : 'text-[#888888]'} />
                  <span className="hidden md:inline">{tab.label}</span>
                </button>
              );
            })}
          </nav>

        </div>
      </header>

      {/* ── Sub-header Actions Toolbar (SaaS Utility Belt) ── */}
      <section className="bg-white border-b border-[#E8E8E6] py-3.5 px-6 sm:px-10">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#888888]">Active CM Environment</div>
            <h1 className="font-heading-style text-xl font-bold text-[#051C2C] tracking-tight">
              {state.projectSetup.projectName || "Unnamed Project"} <span className="font-normal text-slate-400">|</span> <span className="text-sm font-body text-slate-500 font-medium">{state.projectSetup.clientName}</span>
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Auto-saved notification */}
            <div className="text-right mr-2 hidden sm:block">
              <div className="text-[10px] text-[#888888] font-semibold tracking-wider uppercase">Persistence State</div>
              <div className="text-xs text-emerald-600 font-medium flex items-center gap-1 justify-end">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Last Auto-Saved: {new Date(state.lastSaved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
            </div>

            {/* Backups Upload triggers */}
            <button 
              onClick={handleExportBackup}
              title="Export complete system state backup file (.json)"
              className="px-3 py-1.5 rounded bg-[#051C2C] hover:bg-slate-800 text-white text-xs font-semibold tracking-wide flex items-center gap-1.5 shadow-apple-sm transition-all duration-150 active:scale-95"
            >
              <Download size={13} />
              <span>Export Backup</span>
            </button>

            <button 
              onClick={() => fileInputRef.current?.click()}
              title="Upload full system state JSON file"
              className="px-3 py-1.5 rounded border border-[#E8E8E6] hover:bg-slate-50 text-[#051C2C] text-xs font-semibold tracking-wide flex items-center gap-1.5 shadow-apple-sm transition-all duration-150 active:scale-95"
            >
              <Upload size={13} />
              <span>Import Backup</span>
              <input 
                ref={fileInputRef}
                type="file" 
                accept=".json" 
                onChange={handleImportBackup} 
                className="hidden" 
              />
            </button>

            {/* Bulk CSV Imports */}
            <button 
              onClick={() => setCsvTarget('actuals')}
              className="px-3 py-1.5 rounded border border-[#E8E8E6] hover:bg-slate-50 text-[#051C2C] text-xs font-semibold tracking-wide flex items-center gap-1.5 shadow-apple-sm transition-all"
            >
              <FileSpreadsheet size={13} className="text-[#2251FF]" />
              <span>Import CSV</span>
            </button>

            {/* System Factory Reset */}
            <button 
              onClick={handleResetData}
              title="Restore to pristine Vertex Construction demo workbook"
              className="p-1.5 rounded border border-rose-200 hover:bg-rose-50 text-[#D32F2F] text-xs font-semibold tracking-wide flex items-center gap-1.5 shadow-apple-sm transition-all duration-150 active:scale-95"
            >
              <RefreshCw size={13} />
              <span className="hidden lg:inline">Reset Data</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── Bulk CSV Import Modals/Banners ── */}
      {csvTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#051C2C]/50 backdrop-blur-md">
          <div className="bg-white w-full max-w-xl rounded-xl shadow-apple-lg p-6 animate-fade-up">
            <div className="flex justify-between items-center border-b border-[#E8E8E6] pb-3 mb-4">
              <h3 className="font-heading-style text-lg font-bold text-[#051C2C]">
                Bulk CSV Import - {csvTarget === 'actuals' ? 'Actual Costs' : 'Budget Categories'}
              </h3>
              <button onClick={() => setCsvTarget(null)} className="p-1 hover:bg-slate-100 rounded-full text-slate-500">
                <X size={18} />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-xs text-slate-600 mb-2">
                Paste raw comma-separated values (CSV) with headers. Below is the required structure:
              </p>
              {csvTarget === 'actuals' ? (
                <div className="bg-[#F5F5F2] p-2.5 rounded font-mono text-[10px] text-slate-700">
                  Date, Cost Code, Description, Amount<br/>
                  2026-02-15, 01-100, "PM Site Supervision M1", 10000<br/>
                  2026-02-22, 02-200, "Excavation and grading", 65000
                </div>
              ) : (
                <div className="bg-[#F5F5F2] p-2.5 rounded font-mono text-[10px] text-slate-700">
                  Cost Code, Category, Original Budget<br/>
                  09-100, Landscaping & Fencing, 45000<br/>
                  10-200, HVAC Installation Upgrade, 120000
                </div>
              )}
            </div>

            <textarea
              className="w-full h-44 p-3 rounded border border-[#E8E8E6] font-mono text-[11px] bg-[#FFFDE7] focus:outline-none focus:ring-1 focus:ring-[#2251FF] mb-4"
              placeholder="Paste comma-separated data here..."
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
            />

            <div className="flex justify-end gap-2.5">
              <button 
                onClick={() => { setCsvTarget(null); setCsvText(''); }}
                className="px-4 py-2 rounded border border-[#E8E8E6] hover:bg-slate-50 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button 
                onClick={handleCSVImportSubmit}
                className="px-4 py-2 rounded bg-[#2251FF] hover:bg-blue-700 text-white text-xs font-semibold shadow-apple-sm"
              >
                Parse & Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Application Stage ── */}
      <main className="flex-grow py-8 px-6 sm:px-10 max-w-[1400px] w-full mx-auto animate-fade-up">

        {/* =========================================================================
            TAB 1: EXECUTIVE DASHBOARD
            ========================================================================= */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            
            {/* KPI Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              
              <div className="bg-white p-5 rounded-xl shadow-apple-md hover:translate-y-[-2px] hover:shadow-apple-lg transition-all duration-200">
                <div className="flex items-center justify-between text-[#888888] text-[11px] uppercase tracking-wider font-bold mb-1">
                  <span>Current Project Progress</span>
                  <TrendingUp size={14} className="text-[#2251FF]" />
                </div>
                <div className="font-heading-style text-3xl font-bold text-[#051C2C] tracking-tight">
                  {state.progressBilling.length > 0 
                    ? formatPercent(Math.max(...state.progressBilling.map(pb => pb.cumulativePercent))) 
                    : "0.0%"}
                </div>
                <div className="text-xs text-[#888888] mt-1.5 flex items-center gap-1.5">
                  <span className="font-bold text-[#2251FF]">S-Curve Base</span>
                  <span>{state.progressBilling.length} billing milestones recorded</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl shadow-apple-md hover:translate-y-[-2px] hover:shadow-apple-lg transition-all duration-200">
                <div className="flex items-center justify-between text-[#888888] text-[11px] uppercase tracking-wider font-bold mb-1">
                  <span>Total Contract Sum (Revised)</span>
                  <DollarSign size={14} className="text-[#2251FF]" />
                </div>
                <div className="font-heading-style text-3xl font-bold text-[#051C2C] tracking-tight">
                  {formatCurrency(calculations.currentContractSum)}
                </div>
                <div className="text-xs text-[#888888] mt-1.5">
                  Original Base Contract: <span className="font-semibold text-[#051C2C]">{formatCurrency(state.projectSetup.originalContractSum)}</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl shadow-apple-md hover:translate-y-[-2px] hover:shadow-apple-lg transition-all duration-200">
                <div className="flex items-center justify-between text-[#888888] text-[11px] uppercase tracking-wider font-bold mb-1">
                  <span>Actual Expenses Incurred</span>
                  <TrendingUp size={14} className="text-[#888888]" />
                </div>
                <div className="font-heading-style text-3xl font-bold text-[#051C2C] tracking-tight">
                  {formatCurrency(calculations.totalActualIncurred)}
                </div>
                <div className="text-xs text-[#888888] mt-1.5">
                  Available Budget Pool: <span className="font-semibold text-emerald-600">{formatCurrency(calculations.totalRemainingBudget)}</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl shadow-apple-md hover:translate-y-[-2px] hover:shadow-apple-lg transition-all duration-200">
                <div className="flex items-center justify-between text-[#888888] text-[11px] uppercase tracking-wider font-bold mb-1">
                  <span>Active Holdback Account</span>
                  <ShieldCheck size={14} className="text-[#2251FF]" />
                </div>
                <div className="font-heading-style text-3xl font-bold text-[#051C2C] tracking-tight">
                  {formatCurrency(calculations.holdbackSummary.currentBalance)}
                </div>
                <div className="text-xs text-[#888888] mt-1.5">
                  Retained: <span className="font-semibold">{formatCurrency(calculations.holdbackSummary.totalRetained)}</span> <span className="text-slate-300">|</span> Released: <span className="font-semibold">{formatCurrency(calculations.holdbackSummary.totalReleased)}</span>
                </div>
              </div>

            </div>

            {/* Recommendation & Insights Panel */}
            <div className="bg-[#2251FF]/[0.04] border-l-4 border-[#2251FF] p-5 rounded-r-xl">
              <div className="flex items-start gap-3">
                <Info size={18} className="text-[#2251FF] mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-heading-style font-bold text-[#051C2C] text-sm tracking-wide uppercase">Operational Insights & Financial Recommendations</h4>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    The total project contract holds a revised sum of <span className="font-semibold text-[#051C2C]">{formatCurrency(calculations.currentContractSum)}</span>, incorporating <span className="font-semibold text-[#2251FF]">{formatCurrency(calculations.totalApprovedChanges)}</span> of approved client change requests. 
                    Site expenses currently consume <span className="font-semibold text-slate-800">{formatPercent(calculations.totalActualIncurred / calculations.totalRevisedBudget)}</span> of the aggregate target budget. 
                    {calculations.calculatedBudgetItems.some(b => b.statusWarning.includes('OVER')) ? (
                      <span className="text-[#D32F2F] font-semibold"> WARNING: Certain cost category accounts have broken over budget ceilings! Check Budget controls tab.</span>
                    ) : (
                      <span className="text-[#00C853] font-semibold"> Positive Trend: All cost centers remain within budget allocations.</span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Dashboard Visualizations Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Chart 1: Budget vs Actuals by Cost Code */}
              <div className="bg-white p-5 rounded-xl shadow-apple-md">
                <div className="border-b border-[#E8E8E6] pb-3 mb-4">
                  <h3 className="font-heading-style text-[15px] font-bold text-[#051C2C] uppercase tracking-wide">
                    Budget vs Actual Costs by Cost Code
                  </h3>
                </div>
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={calculations.calculatedBudgetItems}
                      margin={{ top: 20, right: 10, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E8E6" />
                      <XAxis dataKey="costCode" stroke="#888888" fontSize={11} tickLine={false} />
                      <YAxis stroke="#888888" fontSize={11} tickFormatter={(val) => formatCurrencyCompact(val)} tickLine={false} />
                      <Tooltip 
                        formatter={(val: number) => [formatCurrency(val), '']}
                        contentStyle={{ fontSize: 11, borderRadius: 8, borderColor: '#E8E8E6' }}
                      />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 11 }} />
                      <Bar name="Revised Budget" dataKey="revisedBudget" fill="#051C2C" radius={[4, 4, 0, 0]} />
                      <Bar name="Actual Incurred" dataKey="actualIncurred" fill="#2251FF" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: Cash Flow Timeline (Inflow, Outflow, Cumulative Balance) */}
              <div className="bg-white p-5 rounded-xl shadow-apple-md">
                <div className="border-b border-[#E8E8E6] pb-3 mb-4">
                  <h3 className="font-heading-style text-[15px] font-bold text-[#051C2C] uppercase tracking-wide">
                    12-Month Cumulative Cash Flow Timeline
                  </h3>
                </div>
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={cashFlowTimeline}
                      margin={{ top: 20, right: 15, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E8E6" />
                      <XAxis dataKey="monthLabel" stroke="#888888" fontSize={11} tickLine={false} />
                      <YAxis stroke="#888888" fontSize={11} tickFormatter={(val) => formatCurrencyCompact(val)} tickLine={false} />
                      <Tooltip 
                        formatter={(val: number) => [formatCurrency(val), '']}
                        contentStyle={{ fontSize: 11, borderRadius: 8, borderColor: '#E8E8E6' }}
                      />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 11 }} />
                      <Line type="monotone" name="Inflow" dataKey="inflow" stroke="#00C853" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      <Line type="monotone" name="Outflow" dataKey="outflow" stroke="#D32F2F" strokeWidth={2.5} dot={{ r: 4 }} />
                      <Line type="monotone" name="Cumulative Balance" dataKey="cumulative" stroke="#2251FF" strokeWidth={3.5} dot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

            {/* Visual Progress Billing S-Curve Chart and Recent Milestones Side-by-Side */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Progress Billing Completion Chart */}
              <div className="bg-white p-5 rounded-xl shadow-apple-md lg:col-span-2">
                <div className="border-b border-[#E8E8E6] pb-3 mb-4">
                  <h3 className="font-heading-style text-[15px] font-bold text-[#051C2C] uppercase tracking-wide">
                    Progress Billing Earned Value S-Curve
                  </h3>
                </div>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={calculations.calculatedProgressBilling}
                      margin={{ top: 15, right: 20, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E8E6" />
                      <XAxis dataKey="billingPeriod" label={{ value: "Billing Period", position: "insideBottom", offset: -5, fontSize: 11 }} stroke="#888888" fontSize={11} />
                      <YAxis stroke="#888888" fontSize={11} tickFormatter={(val) => formatCurrencyCompact(val)} />
                      <Tooltip formatter={(val: number) => [formatCurrency(val), '']} />
                      <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: 11 }} />
                      <Line type="monotone" name="Cumulative Gross Claimed" dataKey="cumulativeGross" stroke="#2251FF" strokeWidth={3} dot={{ r: 6 }} />
                      <Line type="monotone" name="Contract Ceiling" dataKey="contractSum" stroke="#051C2C" strokeDasharray="4 4" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Milestones At-a-Glance List */}
              <div className="bg-white p-5 rounded-xl shadow-apple-md">
                <div className="border-b border-[#E8E8E6] pb-3 mb-3">
                  <h3 className="font-heading-style text-[15px] font-bold text-[#051C2C] uppercase tracking-wide">
                    Milestone Completion
                  </h3>
                </div>
                <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                  {state.milestones.map((m) => (
                    <div key={m.id} className="flex items-start justify-between border-b border-[#F5F5F2] pb-2 text-xs">
                      <div>
                        <div className="font-semibold text-[#051C2C]">{m.name}</div>
                        <div className="text-[10px] text-[#888888]">Target: {formatDate(m.targetDate)}</div>
                      </div>
                      <div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          m.status === 'Completed' 
                            ? 'bg-emerald-50 text-[#00C853]' 
                            : m.status === 'In Progress' 
                              ? 'bg-blue-50 text-[#2251FF]' 
                              : 'bg-slate-100 text-[#888888]'
                        }`}>
                          {m.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* =========================================================================
            TAB 2: PROJECT PARAMETERS SETUP
            ========================================================================= */}
        {activeTab === 'setup' && (
          <div className="bg-white rounded-xl shadow-apple-md p-8 max-w-2xl mx-auto">
            <div className="border-b border-[#E8E8E6] pb-4 mb-6">
              <h2 className="font-heading-style text-2xl font-bold text-[#051C2C]">
                Project Parameters Configuration
              </h2>
              <p className="text-xs text-[#888888] mt-1">
                Establish the original baseline parameters of the contract. Any update dynamically alters global calculations.
              </p>
            </div>

            <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#051C2C] mb-1.5">Project Name</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 rounded border border-[#E8E8E6] text-xs bg-[#FFFDE7] focus:outline-none focus:ring-1 focus:ring-[#2251FF]"
                    value={state.projectSetup.projectName}
                    onChange={(e) => setState(prev => ({
                      ...prev,
                      projectSetup: { ...prev.projectSetup, projectName: e.target.value }
                    }))}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#051C2C] mb-1.5">Owner / Client Name</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 rounded border border-[#E8E8E6] text-xs bg-[#FFFDE7] focus:outline-none focus:ring-1 focus:ring-[#2251FF]"
                    value={state.projectSetup.clientName}
                    onChange={(e) => setState(prev => ({
                      ...prev,
                      projectSetup: { ...prev.projectSetup, clientName: e.target.value }
                    }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#051C2C] mb-1.5">Lead General Contractor</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 rounded border border-[#E8E8E6] text-xs bg-[#FFFDE7] focus:outline-none focus:ring-1 focus:ring-[#2251FF]"
                    value={state.projectSetup.contractorName}
                    onChange={(e) => setState(prev => ({
                      ...prev,
                      projectSetup: { ...prev.projectSetup, contractorName: e.target.value }
                    }))}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#051C2C] mb-1.5">Project Mobilization Date</label>
                  <input 
                    type="date" 
                    className="w-full px-3 py-2 rounded border border-[#E8E8E6] text-xs bg-[#FFFDE7] focus:outline-none focus:ring-1 focus:ring-[#2251FF]"
                    value={state.projectSetup.startDate}
                    onChange={(e) => setState(prev => ({
                      ...prev,
                      projectSetup: { ...prev.projectSetup, startDate: e.target.value }
                    }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 border-t border-[#F5F5F2] pt-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#051C2C] mb-1.5">Original Contract Value</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs text-slate-400 font-semibold">$</span>
                    <input 
                      type="number" 
                      step="0.01"
                      className="w-full pl-6 pr-3 py-2 rounded border border-[#E8E8E6] text-xs bg-[#FFFDE7] font-semibold text-[#051C2C] focus:outline-none focus:ring-1 focus:ring-[#2251FF]"
                      value={state.projectSetup.originalContractSum}
                      onChange={(e) => setState(prev => ({
                        ...prev,
                        projectSetup: { ...prev.projectSetup, originalContractSum: parseFloat(e.target.value) || 0 }
                      }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#051C2C] mb-1.5">Holdback (Retention) %</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      step="0.1"
                      min="0"
                      max="100"
                      className="w-full pr-7 pl-3 py-2 rounded border border-[#E8E8E6] text-xs bg-[#FFFDE7] focus:outline-none focus:ring-1 focus:ring-[#2251FF]"
                      value={state.projectSetup.holdbackRate * 100}
                      onChange={(e) => setState(prev => ({
                        ...prev,
                        projectSetup: { ...prev.projectSetup, holdbackRate: (parseFloat(e.target.value) || 0) / 100 }
                      }))}
                    />
                    <span className="absolute right-3 top-2 text-xs text-slate-400 font-semibold">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#051C2C] mb-1.5">Payment Term Days</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      className="w-full pr-12 pl-3 py-2 rounded border border-[#E8E8E6] text-xs bg-[#FFFDE7] focus:outline-none focus:ring-1 focus:ring-[#2251FF]"
                      value={state.projectSetup.paymentTermDays}
                      onChange={(e) => setState(prev => ({
                        ...prev,
                        projectSetup: { ...prev.projectSetup, paymentTermDays: parseInt(e.target.value, 10) || 0 }
                      }))}
                    />
                    <span className="absolute right-3 top-2 text-[10px] text-slate-400 font-semibold">Days</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#2251FF]/[0.03] border-l-2 border-[#2251FF] p-4 rounded text-xs text-[#051C2C]/75 space-y-1.5">
                <span className="font-bold uppercase text-[10px] tracking-wider text-[#051C2C] block">System Logic Notes:</span>
                <p>• The holdback rate dictates the percentage deducted from each Progress Billing certificate before paying net amount due.</p>
                <p>• Due date is automatically computed as <span className="font-semibold">Cutoff/Issue Date + Payment Term Days</span>.</p>
              </div>

            </form>
          </div>
        )}

        {/* =========================================================================
            TAB 3: BUDGET & ACTUAL COSTS
            ========================================================================= */}
        {activeTab === 'budget' && (
          <div className="space-y-8">
            
            {/* Budget Categories Control Panel */}
            <div className="bg-white rounded-xl shadow-apple-md p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-[#E8E8E6] pb-3 mb-5 gap-3">
                <div>
                  <h3 className="font-heading-style text-lg font-bold text-[#051C2C] uppercase tracking-wide">
                    Budget Control Sheet
                  </h3>
                  <p className="text-[11px] text-[#888888] font-medium">Approved Changes dynamic sums and Actual Costs automatically update totals.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setCsvTarget('budget')}
                    className="px-2.5 py-1.5 rounded border border-[#E8E8E6] hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1 shadow-apple-sm transition-all"
                  >
                    <FileSpreadsheet size={13} className="text-[#2251FF]" />
                    <span>Upload CSV</span>
                  </button>
                </div>
              </div>

              {/* Responsive Budget Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-[#051C2C]/10 text-[#051C2C] text-[11px] tracking-wider uppercase font-bold bg-[#051C2C]/[0.02]">
                      <th className="py-2.5 px-3">Cost Code</th>
                      <th className="py-2.5 px-3">Category Description</th>
                      <th className="py-2.5 px-3 text-right">Original Budget</th>
                      <th className="py-2.5 px-3 text-right">Approved COs</th>
                      <th className="py-2.5 px-3 text-right">Revised Budget</th>
                      <th className="py-2.5 px-3 text-right">Actual Spent</th>
                      <th className="py-2.5 px-3 text-right">Remaining Bal.</th>
                      <th className="py-2.5 px-3 text-center">Incurred bar</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculations.calculatedBudgetItems.map((item) => {
                      const spendRatio = item.revisedBudget > 0 ? (item.actualIncurred / item.revisedBudget) * 100 : 0;
                      return (
                        <tr key={item.costCode} className="border-b border-[#E8E8E6] hover:bg-slate-50/50 text-xs transition-colors">
                          <td className="py-3 px-3 font-mono font-bold text-[#051C2C]">{item.costCode}</td>
                          <td className="py-3 px-3 font-medium text-slate-800">{item.category}</td>
                          <td className="py-3 px-3 text-right font-mono font-medium">{formatCurrency(item.originalBudget)}</td>
                          <td className="py-3 px-3 text-right font-mono text-slate-600">{formatCurrency(item.approvedChanges)}</td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-[#051C2C]">{formatCurrency(item.revisedBudget)}</td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-[#2251FF]">{formatCurrency(item.actualIncurred)}</td>
                          <td className={`py-3 px-3 text-right font-mono font-bold ${item.remainingBudget < 0 ? 'text-[#D32F2F]' : 'text-slate-700'}`}>
                            {formatCurrency(item.remainingBudget)}
                          </td>
                          <td className="py-3 px-3">
                            {/* Inline Data Bar Fill accent track 10% */}
                            <div className="w-24 h-2 bg-[#2251FF]/10 rounded-full overflow-hidden mx-auto" title={`${spendRatio.toFixed(1)}% spent`}>
                              <div 
                                className="h-full bg-[#2251FF] transition-all duration-300" 
                                style={{ width: `${Math.min(100, spendRatio)}%` }}
                              />
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.statusWarning.includes('OK') 
                                ? 'bg-emerald-50 text-[#00C853]' 
                                : item.statusWarning.includes('TIGHT') 
                                  ? 'bg-[#FFFDE7] text-amber-600' 
                                  : 'bg-rose-50 text-[#D32F2F]'
                            }`}>
                              {item.statusWarning}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button 
                              onClick={() => handleDeleteBudget(item.costCode)}
                              className="text-[#D32F2F] hover:bg-rose-50 p-1 rounded transition-colors active:scale-95"
                              title="Delete Budget Line"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    
                    {/* Summary Totals Row */}
                    <tr className="bg-[#051C2C]/5 font-bold border-t-2 border-[#051C2C]/10 text-xs text-[#051C2C]">
                      <td className="py-3 px-3" colSpan={2}>TOTAL PROJECT WORKBOOK</td>
                      <td className="py-3 px-3 text-right font-mono">{formatCurrency(calculations.totalOriginalBudget)}</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600">{formatCurrency(calculations.totalApprovedChanges)}</td>
                      <td className="py-3 px-3 text-right font-mono font-extrabold">{formatCurrency(calculations.totalRevisedBudget)}</td>
                      <td className="py-3 px-3 text-right font-mono text-[#2251FF]">{formatCurrency(calculations.totalActualIncurred)}</td>
                      <td className="py-3 px-3 text-right font-mono">{formatCurrency(calculations.totalRemainingBudget)}</td>
                      <td className="py-3 px-3" colSpan={3}></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Form to Append New Cost Category */}
              <form onSubmit={handleAddBudget} className="mt-5 p-4 border border-[#E8E8E6] rounded-lg bg-slate-50 flex flex-wrap items-end gap-4">
                <div className="flex-grow min-w-[120px]">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#051C2C] mb-1">Cost Code</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 09-100" 
                    required
                    className="w-full px-2.5 py-1.5 text-xs bg-[#FFFDE7] border border-[#E8E8E6] rounded focus:outline-none"
                    value={newBudget.costCode}
                    onChange={(e) => setNewBudget(prev => ({ ...prev, costCode: e.target.value }))}
                  />
                </div>
                <div className="flex-grow min-w-[200px]">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#051C2C] mb-1">Category Description</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Landscaping & Site Finishes" 
                    required
                    className="w-full px-2.5 py-1.5 text-xs bg-[#FFFDE7] border border-[#E8E8E6] rounded focus:outline-none"
                    value={newBudget.category}
                    onChange={(e) => setNewBudget(prev => ({ ...prev, category: e.target.value }))}
                  />
                </div>
                <div className="w-[150px]">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#051C2C] mb-1">Original Budget</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 35000" 
                    className="w-full px-2.5 py-1.5 text-xs bg-[#FFFDE7] border border-[#E8E8E6] rounded focus:outline-none text-right"
                    value={newBudget.originalBudget}
                    onChange={(e) => setNewBudget(prev => ({ ...prev, originalBudget: e.target.value }))}
                  />
                </div>
                <button 
                  type="submit"
                  className="px-4 py-1.5 rounded bg-[#2251FF] hover:bg-blue-700 text-white text-xs font-semibold shadow-apple-sm flex items-center gap-1 transition-all"
                >
                  <Plus size={14} />
                  <span>Add Line</span>
                </button>
              </form>
            </div>

            {/* Actual Expenses Ledger Control Panel */}
            <div className="bg-white rounded-xl shadow-apple-md p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-[#E8E8E6] pb-3 mb-5 gap-3">
                <div>
                  <h3 className="font-heading-style text-lg font-bold text-[#051C2C] uppercase tracking-wide">
                    Actual Expense Ledger
                  </h3>
                  <p className="text-[11px] text-[#888888] font-medium">Record every payout to general contractors or material suppliers.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setCsvTarget('actuals')}
                    className="px-2.5 py-1.5 rounded border border-[#E8E8E6] hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1 shadow-apple-sm transition-all"
                  >
                    <FileSpreadsheet size={13} className="text-[#2251FF]" />
                    <span>Upload Expense CSV</span>
                  </button>
                </div>
              </div>

              {/* Actuals table */}
              <div className="overflow-x-auto max-h-[350px] overflow-y-auto pr-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-[#051C2C]/10 text-[#051C2C] text-[11px] tracking-wider uppercase font-bold bg-[#051C2C]/[0.02]">
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Cost Code</th>
                      <th className="py-2 px-3">Linked Cost Category</th>
                      <th className="py-2 px-3">Description</th>
                      <th className="py-2 px-3 text-right">Amount Outlay</th>
                      <th className="py-2 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.actualCosts.map((ac) => {
                      const matchedBudget = state.budget.find(b => b.costCode === ac.costCode);
                      return (
                        <tr key={ac.id} className="border-b border-[#E8E8E6] hover:bg-slate-50/50 text-xs">
                          <td className="py-2.5 px-3 font-mono">{formatDate(ac.date)}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-[#051C2C]">{ac.costCode}</td>
                          <td className="py-2.5 px-3 font-medium text-slate-500">{matchedBudget?.category || "Unknown Category"}</td>
                          <td className="py-2.5 px-3 text-slate-700">{ac.description}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-[#2251FF]">{formatCurrency(ac.amount)}</td>
                          <td className="py-2.5 px-3 text-center">
                            <button 
                              onClick={() => handleDeleteActual(ac.id)}
                              className="text-[#D32F2F] hover:bg-rose-50 p-1 rounded transition-colors active:scale-95"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {state.actualCosts.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-6 text-slate-400 text-xs italic">
                          No actual expenditures logged yet. Add details or import CSV above.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Form to Append New Actual Cost */}
              <form onSubmit={handleAddActual} className="mt-5 p-4 border border-[#E8E8E6] rounded-lg bg-slate-50 flex flex-wrap items-end gap-4">
                <div className="w-[140px]">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#051C2C] mb-1">Expense Date</label>
                  <input 
                    type="date" 
                    required
                    className="w-full px-2.5 py-1.5 text-xs bg-[#FFFDE7] border border-[#E8E8E6] rounded focus:outline-none"
                    value={newActual.date}
                    onChange={(e) => setNewActual(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
                <div className="w-[180px]">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#051C2C] mb-1">Linked Cost Code</label>
                  <select 
                    required
                    className="w-full px-2.5 py-1.5 text-xs bg-[#FFFDE7] border border-[#E8E8E6] rounded focus:outline-none"
                    value={newActual.costCode}
                    onChange={(e) => setNewActual(prev => ({ ...prev, costCode: e.target.value }))}
                  >
                    <option value="">-- Choose Code --</option>
                    {state.budget.map(b => (
                      <option key={b.costCode} value={b.costCode}>
                        {b.costCode} - {b.category.slice(0, 30)}...
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-grow min-w-[200px]">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#051C2C] mb-1">Description / Memo</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Concrete Pouring Stage 1 payment invoice" 
                    required
                    className="w-full px-2.5 py-1.5 text-xs bg-[#FFFDE7] border border-[#E8E8E6] rounded focus:outline-none"
                    value={newActual.description}
                    onChange={(e) => setNewActual(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div className="w-[130px]">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#051C2C] mb-1">Amount Paid</label>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="e.g. 14500.00" 
                    required
                    className="w-full px-2.5 py-1.5 text-xs bg-[#FFFDE7] border border-[#E8E8E6] rounded focus:outline-none text-right"
                    value={newActual.amount}
                    onChange={(e) => setNewActual(prev => ({ ...prev, amount: e.target.value }))}
                  />
                </div>
                <button 
                  type="submit"
                  className="px-4 py-1.5 rounded bg-[#2251FF] hover:bg-blue-700 text-white text-xs font-semibold shadow-apple-sm flex items-center gap-1 transition-all"
                >
                  <Plus size={14} />
                  <span>Log Expense</span>
                </button>
              </form>
            </div>

          </div>
        )}

        {/* =========================================================================
            TAB 4: CHANGE ORDERS
            ========================================================================= */}
        {activeTab === 'change-orders' && (
          <div className="bg-white rounded-xl shadow-apple-md p-6">
            <div className="border-b border-[#E8E8E6] pb-3 mb-5">
              <h3 className="font-heading-style text-lg font-bold text-[#051C2C] uppercase tracking-wide">
                Change Order Ledger (Contract Variations)
              </h3>
              <p className="text-[11px] text-[#888888] font-medium">Approved changes immediately expand the contract value and the linked revised budget lines.</p>
            </div>

            {/* List change orders */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-[#051C2C]/10 text-[#051C2C] text-[11px] tracking-wider uppercase font-bold bg-[#051C2C]/[0.02]">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">CO ID</th>
                    <th className="py-2.5 px-3 font-mono">Cost Code</th>
                    <th className="py-2.5 px-3">Description Variant</th>
                    <th className="py-2.5 px-3 text-right">Adjustment Sum</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {state.changeOrders.map((co) => {
                    return (
                      <tr key={co.id} className="border-b border-[#E8E8E6] hover:bg-slate-50/50 text-xs">
                        <td className="py-3 px-3 font-mono">{formatDate(co.date)}</td>
                        <td className="py-3 px-3 font-bold text-[#051C2C]">{co.id}</td>
                        <td className="py-3 px-3 font-mono font-semibold">{co.costCode}</td>
                        <td className="py-3 px-3 text-slate-700">{co.description}</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">{formatCurrency(co.amount)}</td>
                        <td className="py-3 px-3 text-center">
                          {/* Interactivity on hover */}
                          <div className="inline-flex rounded-md shadow-sm">
                            {(['Approved', 'Pending', 'Rejected'] as const).map((st) => (
                              <button
                                key={st}
                                onClick={() => handleUpdateCOStatus(co.id, st)}
                                className={`px-2 py-1 text-[10px] font-bold uppercase transition-all duration-150 cursor-pointer ${
                                  co.status === st 
                                    ? st === 'Approved' 
                                      ? 'bg-emerald-500 text-white' 
                                      : st === 'Pending' 
                                        ? 'bg-blue-500 text-white' 
                                        : 'bg-rose-500 text-white'
                                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                } first:rounded-l-md last:rounded-r-md border-r last:border-r-0 border-white`}
                              >
                                {st}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button 
                            onClick={() => handleDeleteCO(co.id)}
                            className="text-[#D32F2F] hover:bg-rose-50 p-1.5 rounded"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {state.changeOrders.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-6 text-slate-400 text-xs italic">No contract change orders logged.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Form to log new Change Order */}
            <form onSubmit={handleAddCO} className="mt-6 p-4 border border-[#E8E8E6] rounded-lg bg-slate-50 flex flex-wrap items-end gap-4">
              <div className="w-[100px]">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#051C2C] mb-1">CO ID</label>
                <input 
                  type="text" 
                  placeholder="e.g. CO-06" 
                  required
                  className="w-full px-2.5 py-1.5 text-xs bg-[#FFFDE7] border border-[#E8E8E6] rounded focus:outline-none"
                  value={newCO.id}
                  onChange={(e) => setNewCO(prev => ({ ...prev, id: e.target.value }))}
                />
              </div>
              <div className="w-[160px]">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#051C2C] mb-1">Impacted Cost Code</label>
                <select 
                  required
                  className="w-full px-2.5 py-1.5 text-xs bg-[#FFFDE7] border border-[#E8E8E6] rounded focus:outline-none"
                  value={newCO.costCode}
                  onChange={(e) => setNewCO(prev => ({ ...prev, costCode: e.target.value }))}
                >
                  <option value="">-- Choose Code --</option>
                  {state.budget.map(b => (
                    <option key={b.costCode} value={b.costCode}>
                      {b.costCode} - {b.category.slice(0, 25)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-grow min-w-[200px]">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#051C2C] mb-1">Variation Description</label>
                <input 
                  type="text" 
                  placeholder="e.g. Soil depth expansion adjustment" 
                  required
                  className="w-full px-2.5 py-1.5 text-xs bg-[#FFFDE7] border border-[#E8E8E6] rounded focus:outline-none"
                  value={newCO.description}
                  onChange={(e) => setNewCO(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div className="w-[120px]">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#051C2C] mb-1">Adjustment Amount</label>
                <input 
                  type="number" 
                  placeholder="e.g. 15000" 
                  required
                  className="w-full px-2.5 py-1.5 text-xs bg-[#FFFDE7] border border-[#E8E8E6] rounded focus:outline-none text-right"
                  value={newCO.amount}
                  onChange={(e) => setNewCO(prev => ({ ...prev, amount: e.target.value }))}
                />
              </div>
              <div className="w-[120px]">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#051C2C] mb-1">Status</label>
                <select 
                  className="w-full px-2.5 py-1.5 text-xs bg-[#FFFDE7] border border-[#E8E8E6] rounded focus:outline-none"
                  value={newCO.status}
                  onChange={(e) => setNewCO(prev => ({ ...prev, status: e.target.value }))}
                >
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
              <div className="w-[120px]">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#051C2C] mb-1">Date</label>
                <input 
                  type="date" 
                  className="w-full px-2.5 py-1.5 text-xs bg-[#FFFDE7] border border-[#E8E8E6] rounded focus:outline-none"
                  value={newCO.date}
                  onChange={(e) => setNewCO(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <button 
                type="submit"
                className="px-4 py-1.5 rounded bg-[#2251FF] hover:bg-blue-700 text-white text-xs font-semibold shadow-apple-sm flex items-center gap-1 transition-all"
              >
                <Plus size={14} />
                <span>Log Variation</span>
              </button>
            </form>
          </div>
        )}

        {/* =========================================================================
            TAB 5: PROGRESS BILLING & MILESTONES
            ========================================================================= */}
        {activeTab === 'progress' && (
          <div className="space-y-6">

            {/* Milestones Scheduler Panel */}
            <div className="bg-white rounded-xl shadow-apple-md p-6">
              <div className="border-b border-[#E8E8E6] pb-3 mb-4">
                <h3 className="font-heading-style text-lg font-bold text-[#051C2C] uppercase tracking-wide">
                  Project Milestone Tracking
                </h3>
                <p className="text-[11px] text-[#888888] font-medium">Establish key structural steps. Complete steps to update overall project momentum indicators.</p>
              </div>

              {/* Grid of milestones */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {state.milestones.map((m) => {
                  const isCompleted = m.status === 'Completed';
                  return (
                    <div 
                      key={m.id} 
                      className={`p-3.5 rounded-lg border transition-all duration-200 flex items-center justify-between ${
                        isCompleted 
                          ? 'border-[#00C853]/20 bg-emerald-50/20' 
                          : m.status === 'In Progress' 
                            ? 'border-[#2251FF]/20 bg-blue-50/10' 
                            : 'border-slate-100 bg-slate-50/40'
                      }`}
                    >
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold tracking-wider text-[#888888] uppercase">{m.id}</span>
                        <h4 className="font-semibold text-xs text-[#051C2C]">{m.name}</h4>
                        <div className="text-[10px] text-slate-500">
                          Target Date: <span className="font-medium text-[#051C2C]">{formatDate(m.targetDate)}</span>
                          {m.completedDate && (
                            <span className="text-emerald-600 font-semibold block mt-0.5">✔ Completed on {formatDate(m.completedDate)}</span>
                          )}
                        </div>
                      </div>

                      {/* Toggle Selector */}
                      <div className="flex flex-col gap-1">
                        {(['Pending', 'In Progress', 'Completed'] as const).map((status) => (
                          <button
                            key={status}
                            onClick={() => handleToggleMilestone(m.id, status)}
                            className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase transition-all duration-150 cursor-pointer ${
                              m.status === status
                                ? status === 'Completed'
                                  ? 'bg-[#00C853] text-white'
                                  : status === 'In Progress'
                                    ? 'bg-[#2251FF] text-white'
                                    : 'bg-slate-500 text-white'
                                : 'bg-white text-slate-400 hover:bg-slate-100 border border-slate-200'
                            }`}
                          >
                            {status}
                          </button>
                        ))}
                        <button 
                          onClick={() => handleDeleteMilestone(m.id)}
                          className="mt-1 text-center text-rose-500 hover:bg-rose-50 py-0.5 text-[9px] rounded-sm font-semibold uppercase"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Form to Append New Milestone */}
              <form onSubmit={handleAddMilestone} className="mt-5 p-4 border border-[#E8E8E6] rounded-lg bg-slate-50 flex flex-wrap items-end gap-4">
                <div className="flex-grow min-w-[200px]">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#051C2C] mb-1">New Milestone Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Drywall and core material inspections complete" 
                    required
                    className="w-full px-2.5 py-1.5 text-xs bg-[#FFFDE7] border border-[#E8E8E6] rounded focus:outline-none"
                    value={newMilestone.name}
                    onChange={(e) => setNewMilestone(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="w-[150px]">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#051C2C] mb-1">Target Date</label>
                  <input 
                    type="date" 
                    required
                    className="w-full px-2.5 py-1.5 text-xs bg-[#FFFDE7] border border-[#E8E8E6] rounded focus:outline-none"
                    value={newMilestone.targetDate}
                    onChange={(e) => setNewMilestone(prev => ({ ...prev, targetDate: e.target.value }))}
                  />
                </div>
                <button 
                  type="submit"
                  className="px-4 py-1.5 rounded bg-[#2251FF] hover:bg-blue-700 text-white text-xs font-semibold shadow-apple-sm flex items-center gap-1 transition-all"
                >
                  <Plus size={14} />
                  <span>Add Milestone</span>
                </button>
              </form>
            </div>

            {/* Progress Billing Table Sheet */}
            <div className="bg-white rounded-xl shadow-apple-md p-6">
              <div className="border-b border-[#E8E8E6] pb-3 mb-4">
                <h3 className="font-heading-style text-lg font-bold text-[#051C2C] uppercase tracking-wide">
                  Progress Billing Ledger (Earned Value Claims)
                </h3>
                <p className="text-[11px] text-[#888888] font-medium">Calculate cumulated claims. Every new period automatically sets up a matching Invoice record.</p>
              </div>

              {/* Progress billing list */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-[#051C2C]/10 text-[#051C2C] text-[11px] tracking-wider uppercase font-bold bg-[#051C2C]/[0.02]">
                      <th className="py-2.5 px-3 text-center">Period</th>
                      <th className="py-2.5 px-3">Cut-off Date</th>
                      <th className="py-2.5 px-3 text-right">Cumulative Complete %</th>
                      <th className="py-2.5 px-3 text-right">Contract Sum Base</th>
                      <th className="py-2.5 px-3 text-right">Cumulative Gross</th>
                      <th className="py-2.5 px-3 text-right">Previous Gross</th>
                      <th className="py-2.5 px-3 text-right">Current Gross (This Period)</th>
                      <th className="py-2.5 px-3 text-right text-amber-600">Holdback Retained ({formatPercent(state.projectSetup.holdbackRate)})</th>
                      <th className="py-2.5 px-3 text-right font-bold text-[#2251FF]">Current Net Due</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculations.calculatedProgressBilling.map((pb) => {
                      return (
                        <tr key={pb.billingPeriod} className="border-b border-[#E8E8E6] hover:bg-slate-50/50 text-xs">
                          <td className="py-3 px-3 text-center font-bold text-[#051C2C]">PB-{pb.billingPeriod}</td>
                          <td className="py-3 px-3 font-mono">{formatDate(pb.cutOffDate)}</td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-[#2251FF]">
                            {/* Simple editable Cumulative Percent or displayed directly */}
                            {formatPercent(pb.cumulativePercent)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-500">{formatCurrency(pb.contractSum)}</td>
                          <td className="py-3 px-3 text-right font-mono">{formatCurrency(pb.cumulativeGross)}</td>
                          <td className="py-3 px-3 text-right font-mono text-slate-400">{formatCurrency(pb.previousGross)}</td>
                          <td className="py-3 px-3 text-right font-mono font-semibold">{formatCurrency(pb.currentGross)}</td>
                          <td className="py-3 px-3 text-right font-mono text-amber-600">({formatCurrency(pb.holdbackRetained)})</td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-[#2251FF] bg-[#2251FF]/[0.01]">{formatCurrency(pb.currentNetDue)}</td>
                          <td className="py-3 px-3 text-center">
                            <button 
                              onClick={() => handleDeleteBilling(pb.billingPeriod)}
                              className="text-[#D32F2F] hover:bg-rose-50 p-1 rounded"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {state.progressBilling.length === 0 && (
                      <tr>
                        <td colSpan={10} className="text-center py-6 text-slate-400 text-xs italic">No progress claims created yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Form to log new Billing period */}
              <form onSubmit={handleAddBilling} className="mt-5 p-4 border border-[#E8E8E6] rounded-lg bg-slate-50 flex flex-wrap items-end gap-4">
                <div className="w-[100px]">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#051C2C] mb-1">Period #</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 6" 
                    required
                    className="w-full px-2.5 py-1.5 text-xs bg-[#FFFDE7] border border-[#E8E8E6] rounded focus:outline-none"
                    value={newBilling.billingPeriod}
                    onChange={(e) => setNewBilling(prev => ({ ...prev, billingPeriod: e.target.value }))}
                  />
                </div>
                <div className="w-[150px]">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#051C2C] mb-1">Cut-Off Date</label>
                  <input 
                    type="date" 
                    required
                    className="w-full px-2.5 py-1.5 text-xs bg-[#FFFDE7] border border-[#E8E8E6] rounded focus:outline-none"
                    value={newBilling.cutOffDate}
                    onChange={(e) => setNewBilling(prev => ({ ...prev, cutOffDate: e.target.value }))}
                  />
                </div>
                <div className="w-[180px]">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#051C2C] mb-1">Cumulative % Complete</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      step="0.01"
                      min="0"
                      max="100"
                      placeholder="e.g. 85.0" 
                      required
                      className="w-full pr-8 pl-3 py-1.5 text-xs bg-[#FFFDE7] border border-[#E8E8E6] rounded focus:outline-none text-right"
                      value={newBilling.cumulativePercent}
                      onChange={(e) => setNewBilling(prev => ({ ...prev, cumulativePercent: e.target.value }))}
                    />
                    <span className="absolute right-3 top-1.5 text-xs text-slate-400 font-semibold">%</span>
                  </div>
                </div>
                <button 
                  type="submit"
                  className="px-4 py-1.5 rounded bg-[#2251FF] hover:bg-blue-700 text-white text-xs font-semibold shadow-apple-sm flex items-center gap-1 transition-all"
                >
                  <Plus size={14} />
                  <span>Add Billing claim</span>
                </button>
              </form>
            </div>

          </div>
        )}

        {/* =========================================================================
            TAB 6: CLIENT RECEIPTS & AGING
            ========================================================================= */}
        {activeTab === 'receipts' && (
          <div className="bg-white rounded-xl shadow-apple-md p-6">
            <div className="border-b border-[#E8E8E6] pb-3 mb-5">
              <h3 className="font-heading-style text-lg font-bold text-[#051C2C] uppercase tracking-wide">
                Client Invoice Ledger & Accounts Receivable Aging
              </h3>
              <p className="text-[11px] text-[#888888] font-medium">Dynamic payment tracking, invoice amounts mapped directly from earned progress billings.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-[#051C2C]/10 text-[#051C2C] text-[11px] tracking-wider uppercase font-bold bg-[#051C2C]/[0.02]">
                    <th className="py-2.5 px-3">Invoice No</th>
                    <th className="py-2.5 px-3">Issue Date</th>
                    <th className="py-2.5 px-3">Client Payer</th>
                    <th className="py-2.5 px-3 text-right">Invoice Amount</th>
                    <th className="py-2.5 px-3">Due Date</th>
                    <th className="py-2.5 px-3 text-right">Amount Received</th>
                    <th className="py-2.5 px-3 text-right">Outstanding Balance</th>
                    <th className="py-2.5 px-3 text-center">Overdue Days</th>
                  </tr>
                </thead>
                <tbody>
                  {calculations.calculatedClientReceipts.map((cr) => {
                    const isFullyPaid = cr.outstanding <= 0;
                    const isOverdue = cr.overdueDays > 0;
                    return (
                      <tr key={cr.invoiceNo} className="border-b border-[#E8E8E6] hover:bg-slate-50/50 text-xs">
                        <td className="py-3 px-3 font-mono font-bold text-[#051C2C]">{cr.invoiceNo}</td>
                        <td className="py-3 px-3 font-mono">{formatDate(cr.issueDate)}</td>
                        <td className="py-3 px-3 font-medium text-slate-700">{cr.clientName}</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-[#051C2C]">{formatCurrency(cr.invoiceAmount)}</td>
                        <td className="py-3 px-3 font-mono text-slate-600">{formatDate(cr.dueDate)}</td>
                        <td className="py-3 px-3 text-right font-mono text-slate-800">
                          {/* Live interactive input inside cell to fulfill "即时传播" without submitting */}
                          <div className="relative inline-block w-36">
                            <span className="absolute left-2.5 top-1.5 text-[10px] text-slate-400 font-bold">$</span>
                            <input 
                              type="number" 
                              step="0.01"
                              className="w-full pl-5 pr-2 py-1 text-xs text-right font-semibold text-[#00C853] bg-[#FFFDE7] border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#2251FF]"
                              value={cr.amountReceived || ''}
                              onChange={(e) => handleUpdateReceiptPayment(cr.invoiceNo, parseFloat(e.target.value) || 0)}
                            />
                          </div>
                        </td>
                        <td className={`py-3 px-3 text-right font-mono font-bold ${isFullyPaid ? 'text-[#00C853]' : 'text-[#D32F2F]'}`}>
                          {formatCurrency(cr.outstanding)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {isFullyPaid ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-[#00C853]">Settled</span>
                          ) : isOverdue ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-50 text-[#D32F2F] animate-pulse">
                              {cr.overdueDays} Days Overdue
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-50 text-[#2251FF]">Current</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {state.clientReceipts.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-6 text-slate-400 text-xs italic">No customer invoicing logged. Add Progress Billing claim above first.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 7: HOLDBACK ACCOUNT RETENTION
            ========================================================================= */}
        {activeTab === 'holdback' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            
            {/* Holdback account stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="bg-white p-5 rounded-xl shadow-apple-md">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#888888] mb-1">Total Holdback Retained</div>
                <div className="font-heading-style text-2xl font-bold text-[#051C2C]">{formatCurrency(calculations.holdbackSummary.totalRetained)}</div>
                <div className="text-[10px] text-slate-400 mt-1">Deducted from progress claims to date</div>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-apple-md">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#888888] mb-1">Total Released / Returned</div>
                <div className="font-heading-style text-2xl font-bold text-[#2251FF]">{formatCurrency(calculations.holdbackSummary.totalReleased)}</div>
                <div className="text-[10px] text-slate-400 mt-1">Returned to general contractor ledger</div>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-apple-md">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#888888] mb-1">Outstanding Retained Balance</div>
                <div className="font-heading-style text-2xl font-bold text-amber-600">{formatCurrency(calculations.holdbackSummary.currentBalance)}</div>
                <div className="text-[10px] text-slate-400 mt-1">Held securely in client escrow account</div>
              </div>
            </div>

            {/* Holdback Ledger & Adding */}
            <div className="bg-white rounded-xl shadow-apple-md p-6">
              <div className="border-b border-[#E8E8E6] pb-3 mb-4">
                <h3 className="font-heading-style text-lg font-bold text-[#051C2C] uppercase tracking-wide">
                  Holdback Account Release Ledger
                </h3>
                <p className="text-[11px] text-[#888888] font-medium">Record milestones stage releases of retention funds back to general contractor.</p>
              </div>

              {/* Ledger list */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-[#051C2C]/10 text-[#051C2C] text-[11px] tracking-wider uppercase font-bold bg-[#051C2C]/[0.02]">
                      <th className="py-2 px-3">Release Date</th>
                      <th className="py-2 px-3">Description Transaction</th>
                      <th className="py-2 px-3 text-right">Amount Released</th>
                      <th className="py-2 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.holdbackReleases.map((hr) => (
                      <tr key={hr.id} className="border-b border-[#E8E8E6] hover:bg-slate-50/50 text-xs">
                        <td className="py-2.5 px-3 font-mono">{formatDate(hr.date)}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-700">{hr.description}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-[#00C853]">{formatCurrency(hr.amount)}</td>
                        <td className="py-2.5 px-3 text-center">
                          <button 
                            onClick={() => handleDeleteRelease(hr.id)}
                            className="text-[#D32F2F] hover:bg-rose-50 p-1 rounded"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {state.holdbackReleases.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center py-5 text-slate-400 italic">No holdback releases processed.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Form to log release */}
              <form onSubmit={handleAddRelease} className="mt-5 p-4 border border-[#E8E8E6] rounded-lg bg-slate-50 flex flex-wrap items-end gap-4">
                <div className="w-[140px]">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#051C2C] mb-1">Release Date</label>
                  <input 
                    type="date" 
                    required
                    className="w-full px-2.5 py-1.5 text-xs bg-[#FFFDE7] border border-[#E8E8E6] rounded focus:outline-none"
                    value={newRelease.date}
                    onChange={(e) => setNewRelease(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
                <div className="flex-grow min-w-[200px]">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#051C2C] mb-1">Release Description / Authority Code</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Stage 1 structural concrete holdback release signoff" 
                    required
                    className="w-full px-2.5 py-1.5 text-xs bg-[#FFFDE7] border border-[#E8E8E6] rounded focus:outline-none"
                    value={newRelease.description}
                    onChange={(e) => setNewRelease(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div className="w-[140px]">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#051C2C] mb-1">Release Amount</label>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="e.g. 25000.00" 
                    required
                    className="w-full px-2.5 py-1.5 text-xs bg-[#FFFDE7] border border-[#E8E8E6] rounded focus:outline-none text-right"
                    value={newRelease.amount}
                    onChange={(e) => setNewRelease(prev => ({ ...prev, amount: e.target.value }))}
                  />
                </div>
                <button 
                  type="submit"
                  className="px-4 py-1.5 rounded bg-[#2251FF] hover:bg-blue-700 text-white text-xs font-semibold shadow-apple-sm flex items-center gap-1 transition-all"
                >
                  <Plus size={14} />
                  <span>Process Release</span>
                </button>
              </form>
            </div>

          </div>
        )}

        {/* =========================================================================
            TAB 8: CASH FLOW TIMELINE (12 MONTHS)
            ========================================================================= */}
        {activeTab === 'cashflow' && (
          <div className="space-y-6">

            {/* Table Matrix */}
            <div className="bg-white rounded-xl shadow-apple-md p-6">
              <div className="border-b border-[#E8E8E6] pb-3 mb-4">
                <h3 className="font-heading-style text-lg font-bold text-[#051C2C] uppercase tracking-wide">
                  12-Month Project Cash Flow Forecast Matrix
                </h3>
                <p className="text-[11px] text-[#888888] font-medium">Inflows compiled from Client Receipts, Outflows compiled from Actual Costs incurred month-by-month.</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b-2 border-[#051C2C]/10 text-[#051C2C] text-[11px] tracking-wider uppercase font-bold bg-[#051C2C]/[0.02]">
                      <th className="py-2.5 px-3">Forecast Month</th>
                      {cashFlowTimeline.map((m) => (
                        <th key={m.monthKey} className="py-2.5 px-3 text-right font-mono font-bold">{m.monthLabel}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[#E8E8E6] text-xs">
                      <td className="py-3 px-3 font-semibold text-[#051C2C]">Inflows (Client Receipts)</td>
                      {cashFlowTimeline.map((m) => (
                        <td key={m.monthKey} className="py-3 px-3 text-right font-mono font-medium text-[#00C853]">
                          {m.inflow > 0 ? formatCurrency(m.inflow) : '-'}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-[#E8E8E6] text-xs">
                      <td className="py-3 px-3 font-semibold text-[#051C2C]">Outflows (Site Expenses)</td>
                      {cashFlowTimeline.map((m) => (
                        <td key={m.monthKey} className="py-3 px-3 text-right font-mono font-medium text-[#D32F2F]">
                          {m.outflow > 0 ? `(${formatCurrency(m.outflow)})` : '-'}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-[#E8E8E6] text-xs bg-slate-50 font-bold">
                      <td className="py-3 px-3 text-[#051C2C]">Monthly Net Cash Flow</td>
                      {cashFlowTimeline.map((m) => {
                        const isPositive = m.net >= 0;
                        return (
                          <td key={m.monthKey} className={`py-3 px-3 text-right font-mono ${isPositive ? 'text-slate-700' : 'text-[#D32F2F]'}`}>
                            {m.net === 0 ? '-' : (isPositive ? formatCurrency(m.net) : `(${formatCurrency(Math.abs(m.net))})`)}
                          </td>
                        );
                      })}
                    </tr>
                    <tr className="border-b-2 border-[#051C2C]/10 text-xs font-bold bg-[#2251FF]/5 text-[#2251FF]">
                      <td className="py-3 px-3">Cumulative Balance</td>
                      {cashFlowTimeline.map((m) => {
                        const isPositive = m.cumulative >= 0;
                        return (
                          <td key={m.monthKey} className={`py-3 px-3 text-right font-mono ${isPositive ? 'text-[#2251FF]' : 'text-[#D32F2F]'}`}>
                            {isPositive ? formatCurrency(m.cumulative) : `(${formatCurrency(Math.abs(m.cumulative))})`}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recharts Graphical Forecast */}
            <div className="bg-white p-6 rounded-xl shadow-apple-md">
              <div className="border-b border-[#E8E8E6] pb-3 mb-4">
                <h3 className="font-heading-style text-lg font-bold text-[#051C2C] uppercase tracking-wide">
                  Graphical Rolling Cash Flow Performance
                </h3>
              </div>
              <div className="h-[360px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={cashFlowTimeline}
                    margin={{ top: 20, right: 10, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E8E6" />
                    <XAxis dataKey="monthLabel" stroke="#888888" fontSize={11} tickLine={false} />
                    <YAxis stroke="#888888" fontSize={11} tickFormatter={(val) => formatCurrencyCompact(val)} tickLine={false} />
                    <Tooltip formatter={(val: number) => [formatCurrency(val), '']} />
                    <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 11 }} />
                    <Bar name="Cash Inflow" dataKey="inflow" fill="#00C853" radius={[3, 3, 0, 0]} />
                    <Bar name="Cash Outflow" dataKey="outflow" fill="#D32F2F" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        )}

        {/* =========================================================================
            TAB 9: INVOICE GENERATOR / VOUCHER RENDERER
            ========================================================================= */}
        {activeTab === 'invoice' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            
            {/* Control banner */}
            <div className="bg-white p-4 rounded-xl shadow-apple-md flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <label className="text-xs font-bold uppercase tracking-wider text-[#051C2C]">Select Billing Period:</label>
                <select 
                  className="px-3 py-1.5 rounded border border-[#E8E8E6] text-xs bg-[#FFFDE7] focus:outline-none"
                  value={selectedInvoiceNo}
                  onChange={(e) => setSelectedInvoiceNo(e.target.value)}
                >
                  {state.clientReceipts.map(cr => (
                    <option key={cr.invoiceNo} value={cr.invoiceNo}>
                      Period {cr.invoiceNo.match(/\d+/)?.[0]} ({cr.invoiceNo})
                    </option>
                  ))}
                </select>
              </div>

              <button 
                onClick={() => window.print()}
                className="px-4 py-1.5 rounded bg-[#051C2C] hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-apple-sm transition-all"
              >
                <Printer size={13} />
                <span>Print / Save PDF</span>
              </button>
            </div>

            {/* High-fidelity printable Invoice layout */}
            <div id="invoice-print-area" className="bg-white rounded-xl shadow-apple-md p-10 border border-[#E8E8E6] animate-fade-up">
              
              {/* Invoice Header */}
              <div className="flex justify-between items-start border-b-2 border-[#051C2C] pb-6 mb-6">
                <div>
                  <h1 className="font-heading-style text-3xl font-extrabold text-[#051C2C] tracking-tight">PROGRESS CLAIM VOUCHER</h1>
                  <p className="text-[10px] tracking-wider uppercase font-bold text-[#888888] mt-1">VERTEX BUILDERS GROUP LTD. • CONTRACTOR ACCOUNTING</p>
                </div>
                <div className="text-right text-xs">
                  <div className="font-bold text-sm text-[#051C2C]">{selectedInvoiceNo}</div>
                  <div className="text-slate-500">Date: {formatDate(state.clientReceipts.find(cr => cr.invoiceNo === selectedInvoiceNo)?.issueDate || '')}</div>
                  <div className="text-slate-500">Payment Due: {formatDate(addDays(state.clientReceipts.find(cr => cr.invoiceNo === selectedInvoiceNo)?.issueDate || '', state.projectSetup.paymentTermDays))}</div>
                </div>
              </div>

              {/* Stakeholders info */}
              <div className="grid grid-cols-2 gap-8 text-xs border-b border-[#E8E8E6] pb-6 mb-6">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#888888] mb-1">Bill To Client:</div>
                  <div className="font-bold text-sm text-[#051C2C]">{state.projectSetup.clientName}</div>
                  <div className="text-slate-500 mt-1">Apex Urban Developments & Partners</div>
                  <div className="text-slate-500">Project Reference: {state.projectSetup.projectName}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#888888] mb-1">From Contractor:</div>
                  <div className="font-bold text-sm text-[#051C2C]">{state.projectSetup.contractorName}</div>
                  <div className="text-slate-500 mt-1">VERTEX BUILDERS GROUP CORP.</div>
                  <div className="text-slate-500">CM Certificate Registry Service</div>
                </div>
              </div>

              {/* Progress calculation breakdown table */}
              <div className="space-y-4">
                <h3 className="font-heading-style text-[15px] font-bold text-[#051C2C] uppercase tracking-wide border-b border-slate-200 pb-1">
                  Valuation of Certified Works
                </h3>

                {(() => {
                  const periodNum = parseInt(selectedInvoiceNo.match(/\d+/)?.[0] || '1', 10);
                  const matchedPB = calculations.calculatedProgressBilling.find(pb => pb.billingPeriod === periodNum);
                  
                  if (!matchedPB) {
                    return <p className="text-xs text-slate-500 italic">No progress billing detail matching this invoice could be found.</p>;
                  }

                  return (
                    <div className="space-y-5">
                      
                      {/* Detailed billing rows */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-[#051C2C] font-semibold text-[#051C2C] bg-[#051C2C]/5">
                              <th className="py-2 px-3">Description of Stage Basis</th>
                              <th className="py-2 px-3 text-right">Contract Target Sum</th>
                              <th className="py-2 px-3 text-right">Completion Status %</th>
                              <th className="py-2 px-3 text-right">Cumulative Claims Gross</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b border-slate-200">
                              <td className="py-3 px-3 font-medium text-slate-800">
                                {state.projectSetup.projectName} - Base Core Work Certificate (Period {periodNum})
                              </td>
                              <td className="py-3 px-3 text-right font-mono">{formatCurrency(matchedPB.contractSum)}</td>
                              <td className="py-3 px-3 text-right font-mono font-bold text-[#2251FF]">{formatPercent(matchedPB.cumulativePercent)}</td>
                              <td className="py-3 px-3 text-right font-mono font-bold text-[#051C2C]">{formatCurrency(matchedPB.cumulativeGross)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Financial summary calculations box */}
                      <div className="w-full md:w-1/2 ml-auto space-y-2.5 text-xs border-t-2 border-[#E8E8E6] pt-4">
                        
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-semibold">Cumulative Gross Value Earned:</span>
                          <span className="font-mono font-bold">{formatCurrency(matchedPB.cumulativeGross)}</span>
                        </div>
                        
                        <div className="flex justify-between border-b border-[#E8E8E6] pb-2">
                          <span className="text-slate-500">Less Previous Cumulative Gross:</span>
                          <span className="font-mono text-slate-500">({formatCurrency(matchedPB.previousGross)})</span>
                        </div>

                        <div className="flex justify-between font-bold text-[#051C2C]">
                          <span>Current Period Gross Earned:</span>
                          <span className="font-mono">{formatCurrency(matchedPB.currentGross)}</span>
                        </div>

                        <div className="flex justify-between text-amber-600">
                          <span>Less Holdback Retained ({formatPercent(state.projectSetup.holdbackRate)}):</span>
                          <span className="font-mono">({formatCurrency(matchedPB.holdbackRetained)})</span>
                        </div>

                        <div className="flex justify-between border-t border-[#051C2C] pt-2 font-heading-style text-lg font-bold text-[#2251FF]">
                          <span>NET AMOUNT DUE:</span>
                          <span className="font-mono">{formatCurrency(matchedPB.currentNetDue)}</span>
                        </div>

                      </div>

                    </div>
                  );
                })()}

              </div>

              {/* Commercial disclaimer footer */}
              <div className="mt-12 border-t border-[#E8E8E6] pt-6 grid grid-cols-2 gap-8 text-[10px] text-slate-400">
                <div>
                  <div className="font-semibold text-slate-500 mb-1">CERTIFIED AUTHORIZATION</div>
                  <p className="leading-relaxed">
                    Vertex Builders Group confirms the above percentage of completions is a true and fair representation of site progress verified by the consulting engineering inspector.
                  </p>
                  <div className="mt-6 border-b border-slate-200 w-44"></div>
                  <div className="mt-1 font-semibold">CM Lead Engineer Sign-off</div>
                </div>
                <div>
                  <div className="font-semibold text-slate-500 mb-1">PAYMENT TERM CLAUSE</div>
                  <p className="leading-relaxed">
                    This Progress Claim is compiled under the statutory commercial terms of the active General Contract. Net payments are due in full within {state.projectSetup.paymentTermDays} days of invoice certification.
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}

      </main>

      {/* ── Footer Branding (Institutional Minimalism) ── */}
      <footer className="bg-white border-t border-[#E8E8E6] py-6 text-center text-slate-400 text-xs">
        <div className="max-w-[1400px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 Vertex Construction Management Systems Inc. All rights reserved.</p>
          <div className="flex gap-4">
            <span className="font-medium text-slate-500">Enterprise Edition</span>
            <span>•</span>
            <span className="font-medium text-[#2251FF]">Offline-First Local Workspace</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
