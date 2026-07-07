export interface ProjectSetup {
  projectName: string;
  clientName: string;
  contractorName: string;
  startDate: string;
  originalContractSum: number;
  holdbackRate: number; // e.g. 0.10 for 10%
  paymentTermDays: number; // e.g. 30 days
}

export interface BudgetItem {
  costCode: string; // e.g. "01-100"
  category: string; // e.g. "Site Work"
  originalBudget: number;
}

export interface ChangeOrder {
  id: string; // e.g. "CO-01"
  costCode: string;
  description: string;
  amount: number;
  status: 'Approved' | 'Pending' | 'Rejected';
  date: string;
}

export interface ActualCost {
  id: string;
  date: string;
  costCode: string;
  description: string;
  amount: number;
}

export interface Milestone {
  id: string;
  name: string;
  targetDate: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  completedDate?: string;
}

export interface ProgressBilling {
  billingPeriod: number; // e.g. 1, 2, 3
  cutOffDate: string;
  cumulativePercent: number; // e.g. 0.10 (10%)
}

export interface ClientReceipt {
  invoiceNo: string; // e.g. "INV-01", matches billingPeriod 1
  issueDate: string;
  amountReceived: number;
}

export interface HoldbackRelease {
  id: string;
  date: string;
  description: string;
  amount: number;
}

// Entire workbook state for backup, export, import
export interface WorkbookState {
  projectSetup: ProjectSetup;
  budget: BudgetItem[];
  changeOrders: ChangeOrder[];
  actualCosts: ActualCost[];
  milestones: Milestone[];
  progressBilling: ProgressBilling[];
  clientReceipts: ClientReceipt[];
  holdbackReleases: HoldbackRelease[];
  lastSaved: string;
}
