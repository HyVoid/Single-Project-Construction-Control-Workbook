import { WorkbookState, BudgetItem, ChangeOrder, ActualCost, ProgressBilling, ClientReceipt } from './types';

// Standard currency formatter
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

// Compact currency formatter for charts or small labels
export function formatCurrencyCompact(value: number): string {
  if (Math.abs(value) >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  } else if (Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(0)}k`;
  }
  return formatCurrency(value);
}

// Percentage formatter
export function formatPercent(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

// Date helper: Format YYYY-MM-DD into a clean human-readable date
export function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const date = new Date(year, month, day);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

// Date helper: Add days to YYYY-MM-DD
export function addDays(dateStr: string, days: number): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return '';
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const date = new Date(year, month, day);
  date.setDate(date.getDate() + days);
  
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Date helper: Calculate days difference from today (YYYY-MM-DD)
export function getOverdueDays(dueDateStr: string): number {
  if (!dueDateStr) return 0;
  const parts = dueDateStr.split('-');
  if (parts.length !== 3) return 0;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  
  const dueDate = new Date(year, month, day);
  const today = new Date();
  
  // Set times to midnight to calculate pure days
  dueDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  
  const diffTime = today.getTime() - dueDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

// Date helper: Get month label from YYYY-MM-DD
export function getMonthLabel(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length < 2) return '';
  const year = parts[0];
  const monthInt = parseInt(parts[1], 10) - 1;
  const date = new Date(parseInt(year, 10), monthInt, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

// Compute dynamic fields from the current state
export interface CalculatedState {
  totalOriginalBudget: number;
  totalApprovedChanges: number;
  totalRevisedBudget: number;
  totalActualIncurred: number;
  totalRemainingBudget: number;
  currentContractSum: number;
  
  calculatedBudgetItems: Array<BudgetItem & {
    approvedChanges: number;
    revisedBudget: number;
    actualIncurred: number;
    remainingBudget: number;
    statusWarning: string;
  }>;
  
  calculatedProgressBilling: Array<ProgressBilling & {
    contractSum: number;
    cumulativeGross: number;
    previousGross: number;
    currentGross: number;
    holdbackRetained: number;
    currentNetDue: number;
  }>;
  
  calculatedClientReceipts: Array<ClientReceipt & {
    issueDate: string;
    clientName: string;
    invoiceAmount: number;
    dueDate: string;
    outstanding: number;
    overdueDays: number;
  }>;

  holdbackSummary: {
    totalRetained: number;
    totalReleased: number;
    currentBalance: number;
  };
}

export function calculateWorkbookState(state: WorkbookState): CalculatedState {
  const { projectSetup, budget, changeOrders, actualCosts, progressBilling, clientReceipts, holdbackReleases } = state;
  
  // 1. Budget item specifics
  const calculatedBudgetItems = budget.map(item => {
    // Approved Change Orders for this cost code
    const approvedChanges = changeOrders
      .filter(co => co.costCode === item.costCode && co.status === 'Approved')
      .reduce((sum, co) => sum + co.amount, 0);
      
    const revisedBudget = item.originalBudget + approvedChanges;
    
    // Actual costs incurred for this cost code
    const actualIncurred = actualCosts
      .filter(ac => ac.costCode === item.costCode)
      .reduce((sum, ac) => sum + ac.amount, 0);
      
    const remainingBudget = revisedBudget - actualIncurred;
    
    let statusWarning = '🟢 OK';
    if (remainingBudget < 0) {
      statusWarning = '🔴 OVER BUDGET';
    } else if (revisedBudget > 0 && (remainingBudget / revisedBudget) <= 0.1) {
      statusWarning = '⚠️ TIGHT';
    }
    
    return {
      ...item,
      approvedChanges,
      revisedBudget,
      actualIncurred,
      remainingBudget,
      statusWarning
    };
  });
  
  // Totals
  const totalOriginalBudget = budget.reduce((sum, item) => sum + item.originalBudget, 0);
  const totalApprovedChanges = changeOrders
    .filter(co => co.status === 'Approved')
    .reduce((sum, co) => sum + co.amount, 0);
  const totalRevisedBudget = totalOriginalBudget + totalApprovedChanges;
  const totalActualIncurred = actualCosts.reduce((sum, ac) => sum + ac.amount, 0);
  const totalRemainingBudget = totalRevisedBudget - totalActualIncurred;
  
  const currentContractSum = projectSetup.originalContractSum + totalApprovedChanges;
  
  // 2. Progress Billing calculations
  const sortedBilling = [...progressBilling].sort((a, b) => a.billingPeriod - b.billingPeriod);
  
  const calculatedProgressBilling = sortedBilling.map((pb, index, arr) => {
    // Contract Sum at this cut-off date: Original Contract Sum + Change Orders approved on/before cut-off date
    const coAtCutOff = changeOrders
      .filter(co => co.status === 'Approved' && (!co.date || co.date <= pb.cutOffDate))
      .reduce((sum, co) => sum + co.amount, 0);
      
    const contractSum = projectSetup.originalContractSum + coAtCutOff;
    const cumulativeGross = contractSum * pb.cumulativePercent;
    
    // Previous Gross from previous period
    let previousGross = 0;
    if (index > 0) {
      // Find the previous one by sorting order (arr[index-1] is the previous sorted billing)
      const prevItem = arr[index - 1];
      const prevCoAtCutOff = changeOrders
        .filter(co => co.status === 'Approved' && (!co.date || co.date <= prevItem.cutOffDate))
        .reduce((sum, co) => sum + co.amount, 0);
      const prevContractSum = projectSetup.originalContractSum + prevCoAtCutOff;
      previousGross = prevContractSum * prevItem.cumulativePercent;
    }
    
    const currentGross = Math.max(0, cumulativeGross - previousGross);
    const holdbackRetained = currentGross * projectSetup.holdbackRate;
    const currentNetDue = Math.max(0, currentGross - holdbackRetained);
    
    return {
      ...pb,
      contractSum,
      cumulativeGross,
      previousGross,
      currentGross,
      holdbackRetained,
      currentNetDue
    };
  });
  
  // 3. Client Receipts calculations
  const calculatedClientReceipts = clientReceipts.map(cr => {
    // Parse period from Invoice No (e.g., INV-01, INV-1, or matches by number)
    const periodMatch = cr.invoiceNo.match(/\d+/);
    const periodNum = periodMatch ? parseInt(periodMatch[0], 10) : 1;
    
    // Find the net due from the corresponding progress billing
    const matchedPB = calculatedProgressBilling.find(pb => pb.billingPeriod === periodNum);
    const invoiceAmount = matchedPB ? matchedPB.currentNetDue : 0;
    
    const dueDate = addDays(cr.issueDate, projectSetup.paymentTermDays);
    const outstanding = Math.max(0, invoiceAmount - cr.amountReceived);
    const overdueDays = outstanding <= 0 ? 0 : getOverdueDays(dueDate);
    
    return {
      ...cr,
      issueDate: cr.issueDate || '',
      clientName: projectSetup.clientName,
      invoiceAmount,
      dueDate,
      outstanding,
      overdueDays
    };
  });
  
  // 4. Holdback Summary
  const totalRetained = calculatedProgressBilling.reduce((sum, pb) => sum + pb.holdbackRetained, 0);
  const totalReleased = holdbackReleases.reduce((sum, hr) => sum + hr.amount, 0);
  const currentBalance = totalRetained - totalReleased;
  
  return {
    totalOriginalBudget,
    totalApprovedChanges,
    totalRevisedBudget,
    totalActualIncurred,
    totalRemainingBudget,
    currentContractSum,
    calculatedBudgetItems,
    calculatedProgressBilling,
    calculatedClientReceipts,
    holdbackSummary: {
      totalRetained,
      totalReleased,
      currentBalance
    }
  };
}

// Generate Cash Flow Timeline data (12 Months starting from Start Date)
export interface CashFlowMonth {
  monthKey: string; // "YYYY-MM"
  monthLabel: string; // "Feb 2026"
  inflow: number;
  outflow: number;
  net: number;
  cumulative: number;
}

export function generateCashFlowTimeline(state: WorkbookState, calcState: CalculatedState): CashFlowMonth[] {
  const { projectSetup, actualCosts } = state;
  const { calculatedClientReceipts } = calcState;
  
  const startDateStr = projectSetup.startDate || "2026-01-01";
  const [startYearStr, startMonthStr] = startDateStr.split('-');
  const startYear = parseInt(startYearStr, 10);
  const startMonth = parseInt(startMonthStr, 10) - 1; // 0-indexed
  
  const monthsList: CashFlowMonth[] = [];
  let runningCumulative = 0;
  
  for (let i = 0; i < 12; i++) {
    const d = new Date(startYear, startMonth + i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const monthKey = `${y}-${m}`;
    const monthLabel = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    
    // Inflow: Sum of amountReceived in clientReceipts where issueDate is in this month
    const inflow = calculatedClientReceipts
      .filter(cr => cr.issueDate && cr.issueDate.startsWith(monthKey))
      .reduce((sum, cr) => sum + cr.amountReceived, 0);
      
    // Outflow: Sum of actual costs in this month
    const outflow = actualCosts
      .filter(ac => ac.date && ac.date.startsWith(monthKey))
      .reduce((sum, ac) => sum + ac.amount, 0);
      
    const net = inflow - outflow;
    runningCumulative += net;
    
    monthsList.push({
      monthKey,
      monthLabel,
      inflow,
      outflow,
      net,
      cumulative: runningCumulative
    });
  }
  
  return monthsList;
}

// Simple CSV parser
export function parseCSV(text: string): string[][] {
  const lines = text.split(/\r?\n/);
  return lines
    .map(line => {
      // Very basic quote-aware split
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    })
    .filter(row => row.length > 0 && row.some(cell => cell !== ''));
}
