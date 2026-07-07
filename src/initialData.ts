import { WorkbookState } from './types';

export const initialWorkbookState: WorkbookState = {
  projectSetup: {
    projectName: "Downtown Innovation Center",
    clientName: "Apex Urban Development LLC",
    contractorName: "Vertex Builders Group Ltd.",
    startDate: "2026-02-01",
    originalContractSum: 1500000.00,
    holdbackRate: 0.10, // 10% standard holdback
    paymentTermDays: 30
  },
  budget: [
    { costCode: "01-100", category: "Project Management & Supervision", originalBudget: 120000 },
    { costCode: "02-200", category: "Site Preparation & Demolition", originalBudget: 95000 },
    { costCode: "03-300", category: "Structural Concrete & Foundations", originalBudget: 350000 },
    { costCode: "04-400", category: "Structural Steel Framing", originalBudget: 280000 },
    { costCode: "05-500", category: "Exterior Enclosure & Cladding", originalBudget: 210000 },
    { costCode: "06-600", category: "Mechanical, Electrical, Plumbing (MEP)", originalBudget: 260000 },
    { costCode: "07-700", category: "Interior Finishes & Drywall", originalBudget: 110000 },
    { costCode: "08-800", category: "Permits, Insurance & Contingency", originalBudget: 75000 }
  ],
  changeOrders: [
    { id: "CO-01", costCode: "02-200", description: "Soil Remediation & Excavation Depth Adjustment", amount: 35000, status: "Approved", date: "2026-02-20" },
    { id: "CO-02", costCode: "05-500", description: "Premium Curtain Wall Glass Upgrade", amount: 25000, status: "Approved", date: "2026-03-10" },
    { id: "CO-03", costCode: "06-600", description: "HVAC Unit High-Efficiency Optimization", amount: 18000, status: "Pending", date: "2026-05-02" },
    { id: "CO-04", costCode: "06-600", description: "Electrical Feed Panel Expansion for Server Room", amount: 8500, status: "Approved", date: "2026-04-12" },
    { id: "CO-05", costCode: "07-700", description: "Soundproof Acoustic Insulation Drywall Upgrade", amount: 12000, status: "Rejected", date: "2026-04-20" }
  ],
  actualCosts: [
    { id: "AC-01", date: "2026-02-15", costCode: "01-100", description: "PM Supervision & Safety Site Trailer - M1", amount: 10000 },
    { id: "AC-02", date: "2026-02-22", costCode: "02-200", description: "Heavy Machinery Site Grading & Excavation", amount: 65000 },
    { id: "AC-03", date: "2026-03-01", costCode: "02-200", description: "Sewer Connection Demolition & Hauling", amount: 30000 },
    { id: "AC-04", date: "2026-03-10", costCode: "02-200", description: "Soil Remediation (CO-01 Approved Soil Work)", amount: 35000 },
    { id: "AC-05", date: "2026-03-15", costCode: "01-100", description: "PM Supervision & Safety Inspector - M2", amount: 10000 },
    { id: "AC-06", date: "2026-03-25", costCode: "03-300", description: "Concrete Footing Delivery & Foundation Pouring", amount: 140000 },
    { id: "AC-07", date: "2026-04-05", costCode: "03-300", description: "Steel Rebar Installation & Concrete Retaining Walls", amount: 110000 },
    { id: "AC-08", date: "2026-04-15", costCode: "01-100", description: "PM Supervision & Safety Inspector - M3", amount: 10000 },
    { id: "AC-09", date: "2026-04-28", costCode: "04-400", description: "Main Structural I-Beams Delivery", amount: 160000 },
    { id: "AC-10", date: "2026-05-10", costCode: "04-400", description: "Framing Crane Hire & Assembly Steel Crew", amount: 60000 },
    { id: "AC-11", date: "2026-05-15", costCode: "01-100", description: "PM Supervision & Safety Inspector - M4", amount: 10000 },
    { id: "AC-12", date: "2026-05-20", costCode: "05-500", description: "Facade Glazing Framing & Panel Cladding", amount: 90000 },
    { id: "AC-13", date: "2026-06-05", costCode: "06-600", description: "MEP Conduit Rough-ins & Main Electrical Run", amount: 50000 },
    { id: "AC-14", date: "2026-06-15", costCode: "01-100", description: "PM Supervision & Safety Inspector - M5", amount: 10000 },
    { id: "AC-15", date: "2026-06-20", costCode: "06-600", description: "HVAC Plumbing Trunk-line Setup & Copper Pipes", amount: 75000 }
  ],
  milestones: [
    { id: "M-01", name: "Site Mobilization & Safety Fence", targetDate: "2026-02-05", status: "Completed", completedDate: "2026-02-04" },
    { id: "M-02", name: "Site Excavation & Soil Remediation Completed", targetDate: "2026-03-12", status: "Completed", completedDate: "2026-03-15" },
    { id: "M-03", name: "Foundation Concrete Work Completed", targetDate: "2026-04-10", status: "Completed", completedDate: "2026-04-08" },
    { id: "M-04", name: "Structural Steel Framing Erected", targetDate: "2026-05-15", status: "Completed", completedDate: "2026-05-14" },
    { id: "M-05", name: "Exterior Building Enclosure Complete", targetDate: "2026-06-15", status: "Completed", completedDate: "2026-06-18" },
    { id: "M-06", name: "MEP Rough-ins Completed", targetDate: "2026-07-10", status: "In Progress" },
    { id: "M-07", name: "Interior Finishing and Drywall Installed", targetDate: "2026-08-20", status: "Pending" },
    { id: "M-08", name: "Final Inspection & Client Handover", targetDate: "2026-09-30", status: "Pending" }
  ],
  progressBilling: [
    { billingPeriod: 1, cutOffDate: "2026-02-28", cumulativePercent: 0.10 }, // 10%
    { billingPeriod: 2, cutOffDate: "2026-03-31", cumulativePercent: 0.25 }, // 25%
    { billingPeriod: 3, cutOffDate: "2026-04-30", cumulativePercent: 0.45 }, // 45%
    { billingPeriod: 4, cutOffDate: "2026-05-31", cumulativePercent: 0.65 }, // 65%
    { billingPeriod: 5, cutOffDate: "2026-06-30", cumulativePercent: 0.80 }  // 80%
  ],
  clientReceipts: [
    { invoiceNo: "INV-01", issueDate: "2026-03-02", amountReceived: 140000.00 }, // Overpaid slightly or standard payment
    { invoiceNo: "INV-02", issueDate: "2026-04-02", amountReceived: 210000.00 },
    { invoiceNo: "INV-03", issueDate: "2026-05-02", amountReceived: 280000.00 },
    { invoiceNo: "INV-04", issueDate: "2026-06-02", amountReceived: 270000.00 },
    { invoiceNo: "INV-05", issueDate: "2026-07-02", amountReceived: 0.00 } // Outstanding
  ],
  holdbackReleases: [
    { id: "HR-01", date: "2026-05-15", description: "Partial Release of Foundation Stage Holdback", amount: 25000.00 }
  ],
  lastSaved: new Date().toISOString()
};
