/**
 * AICTE Security Deposit / FDR Portal - Sample Records & Utilities
 * Realistic fictional records adhering to AICTE Approval Process Handbook (APH) norms.
 */

// Format currency into Indian Rupee format (e.g. ₹ 15,00,000)
export function formatINR(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹ 0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

// Compact currency formatting for summary cards (e.g., ₹ 4.85 Cr or ₹ 75.00 Lakh)
export function formatINRCompact(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹ 0';
  if (amount >= 10000000) {
    const cr = amount / 10000000;
    return `₹ ${cr.toFixed(2)} Cr`;
  }
  if (amount >= 100000) {
    const lakh = amount / 100000;
    return `₹ ${lakh.toFixed(2)} Lakh`;
  }
  return formatINR(amount);
}

// Format date into consistent, legible DD MMM YYYY (e.g., 14 Nov 2026)
export function formatDate(dateInput) {
  if (!dateInput) return 'N/A';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return 'Invalid Date';
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return 'Invalid Date';
  }
}

// Compute days remaining until maturity from a reference date (defaults to now)
export function getDaysRemaining(maturityDateStr, referenceDate = new Date()) {
  if (!maturityDateStr) return null;
  const matDate = new Date(maturityDateStr);
  if (isNaN(matDate.getTime())) return null;

  const ref = new Date(referenceDate);
  ref.setHours(0, 0, 0, 0);
  matDate.setHours(0, 0, 0, 0);

  const diffTime = matDate.getTime() - ref.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Dynamically computes FDR status:
 * - 'matured': maturity date has passed (< 0 days remaining)
 * - 'expiring_soon': maturity date is within next 30 days (0 <= days <= 30)
 * - 'active': maturity date is beyond 30 days
 */
export function computeFDRStatus(fdr, referenceDate = new Date()) {
  const days = getDaysRemaining(fdr.maturityDate, referenceDate);
  if (days === null) return 'active';

  if (days < 0) {
    return 'matured';
  } else if (days <= 30) {
    return 'expiring_soon';
  } else {
    return 'active';
  }
}

/**
 * Calculates all summary statistics from the list of FDR records dynamically
 */
export function calculateFDRStatistics(records, referenceDate = new Date()) {
  let totalRecords = 0;
  let totalPrincipal = 0;
  let activeCount = 0;
  let activePrincipal = 0;
  let expiringSoonCount = 0;
  let expiringSoonPrincipal = 0;
  let maturedCount = 0;
  let maturedPrincipal = 0;

  for (const record of records) {
    totalRecords += 1;
    const amount = Number(record.principalAmount) || 0;
    totalPrincipal += amount;

    const status = computeFDRStatus(record, referenceDate);
    if (status === 'matured') {
      maturedCount += 1;
      maturedPrincipal += amount;
    } else if (status === 'expiring_soon') {
      expiringSoonCount += 1;
      expiringSoonPrincipal += amount;
    } else {
      activeCount += 1;
      activePrincipal += amount;
    }
  }

  return {
    totalRecords,
    totalPrincipal,
    activeCount,
    activePrincipal,
    expiringSoonCount,
    expiringSoonPrincipal,
    maturedCount,
    maturedPrincipal,
  };
}

// Helper to create dates relative to current date to ensure sample data is always fresh and realistic
function getOffsetDate(daysOffset) {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split('T')[0];
}

/**
 * Initial fictional sample FDR dataset with realistic AICTE institutions & Indian Banks
 */
export const initialFDRRecords = [
  {
    id: 'fdr-001',
    fdrNumber: 'FDR/AICTE/2021/8842',
    certificateNo: 'SBI-FDR-9842104',
    aicteAppId: '1-9318491011',
    bankName: 'State Bank of India',
    bankBranch: 'Main Branch, Parliament Street, New Delhi',
    ifscCode: 'SBIN0000691',
    institutionName: 'Apex Institute of Technology & Management',
    institutionCode: 'AICTE-NCR-0421',
    trustName: 'Apex Educational & Research Foundation Trust',
    state: 'Delhi (NCR)',
    depositPurpose: 'Mandatory Security Deposit - New Institute Approval (Engineering & Tech)',
    principalAmount: 3500000,
    interestRate: 7.10,
    issueDate: getOffsetDate(-1825), // 5 years ago
    maturityDate: getOffsetDate(6),   // Expiring in 6 days!
    tenureYears: 5,
    autoRenewal: false,
    lienStatus: 'Lien Marked in Favor of Member Secretary, AICTE',
    jointHolder: 'Member Secretary AICTE & Chairman, Apex Trust',
    remarks: 'Auto-renewal not opted by institute. Renewal notice sent to registrar.',
  },
  {
    id: 'fdr-002',
    fdrNumber: 'FDR/AICTE/2019/3194',
    certificateNo: 'PNB-SD-4412093',
    aicteAppId: '1-7482019482',
    bankName: 'Punjab National Bank',
    bankBranch: 'Connaught Circus, New Delhi',
    ifscCode: 'PUNB0015300',
    institutionName: 'Vellore Advanced Science & Engineering Academy',
    institutionCode: 'AICTE-SR-1104',
    trustName: 'Vellore Rural Education Society',
    state: 'Tamil Nadu',
    depositPurpose: 'Introduction of New Supernumerary UG Programs (AI & Data Science)',
    principalAmount: 2500000,
    interestRate: 6.85,
    issueDate: getOffsetDate(-1830), // ~5 years ago
    maturityDate: getOffsetDate(-14),  // Matured 14 days ago!
    tenureYears: 5,
    autoRenewal: true,
    lienStatus: 'Lien Marked in Favor of Member Secretary, AICTE',
    jointHolder: 'Member Secretary AICTE & President, Vellore Society',
    remarks: 'Matured without claim. Bank renewal confirmation pending under AICTE guidelines.',
  },
  {
    id: 'fdr-003',
    fdrNumber: 'FDR/AICTE/2023/1029',
    certificateNo: 'CAN-FDR-5582910',
    aicteAppId: '1-1049281729',
    bankName: 'Canara Bank',
    bankBranch: 'K.R. Circle Branch, Bengaluru',
    ifscCode: 'CNRB0000412',
    institutionName: 'National Institute of Pharmaceutical Education & Tech',
    institutionCode: 'AICTE-SWR-3320',
    trustName: 'Karnataka Pharma Education Council',
    state: 'Karnataka',
    depositPurpose: 'Increase in Approved Intake from 60 to 120 (B.Pharm)',
    principalAmount: 1500000,
    interestRate: 7.25,
    issueDate: getOffsetDate(-450),
    maturityDate: getOffsetDate(1010), // Active (~2.7 years left)
    tenureYears: 4,
    autoRenewal: true,
    lienStatus: 'Lien Marked in Favor of Member Secretary, AICTE',
    jointHolder: 'Member Secretary AICTE & Secretary, KPEC Trust',
    remarks: 'Annual interest accrued directly to Trust account as per norms.',
  },
  {
    id: 'fdr-004',
    fdrNumber: 'FDR/AICTE/2020/5541',
    certificateNo: 'HDFC-SD-8819204',
    aicteAppId: '1-8572910482',
    bankName: 'HDFC Bank',
    bankBranch: 'Bandra-Kurla Complex (BKC), Mumbai',
    ifscCode: 'HDFC0000060',
    institutionName: 'Sahyadri College of Architecture & Planning',
    institutionCode: 'AICTE-WR-0925',
    trustName: 'Sahyadri Valley Shikshan Sanstha',
    state: 'Maharashtra',
    depositPurpose: 'Mandatory Security Deposit - Establishment of Technical Campus',
    principalAmount: 5000000,
    interestRate: 7.00,
    issueDate: getOffsetDate(-1810),
    maturityDate: getOffsetDate(18),  // Expiring in 18 days!
    tenureYears: 5,
    autoRenewal: false,
    lienStatus: 'Lien Marked in Favor of Member Secretary, AICTE',
    jointHolder: 'Member Secretary AICTE & Trustee, Sahyadri Sanstha',
    remarks: 'College applied for renewal for another 3 years. Verification in progress.',
  },
  {
    id: 'fdr-005',
    fdrNumber: 'FDR/AICTE/2022/9021',
    certificateNo: 'ICIC-FDR-1182940',
    aicteAppId: '1-9920184712',
    bankName: 'ICICI Bank',
    bankBranch: 'F.C. Road Branch, Pune',
    ifscCode: 'ICIC0000005',
    institutionName: 'Marathwada Polytechnic & Skill Development Center',
    institutionCode: 'AICTE-WR-1492',
    trustName: 'Marathwada Pragati Mandal',
    state: 'Maharashtra',
    depositPurpose: 'Establishment of New Diploma Institute in Emerging Technologies',
    principalAmount: 2000000,
    interestRate: 7.15,
    issueDate: getOffsetDate(-800),
    maturityDate: getOffsetDate(660), // Active (~1.8 years left)
    tenureYears: 4,
    autoRenewal: true,
    lienStatus: 'Lien Marked in Favor of Member Secretary, AICTE',
    jointHolder: 'Member Secretary AICTE & President, MPM',
    remarks: 'Verified during 2024 AICTE EVC physical scrutiny.',
  },
  {
    id: 'fdr-006',
    fdrNumber: 'FDR/AICTE/2018/2209',
    certificateNo: 'BOB-FDR-7719203',
    aicteAppId: '1-6201847192',
    bankName: 'Bank of Baroda',
    bankBranch: 'Alkapuri Branch, Vadodara',
    ifscCode: 'BARB0ALKAPU',
    institutionName: 'Gujarat Heritage Institute of Management & Research',
    institutionCode: 'AICTE-CR-0718',
    trustName: 'Gujarat Heritage Charitable Foundation',
    state: 'Gujarat',
    depositPurpose: 'Introduction of New PGDM / MBA Program',
    principalAmount: 1500000,
    interestRate: 6.90,
    issueDate: getOffsetDate(-2950), // 8 years ago
    maturityDate: getOffsetDate(-45), // Matured 45 days ago!
    tenureYears: 8,
    autoRenewal: false,
    lienStatus: 'Lien Marked in Favor of Member Secretary, AICTE',
    jointHolder: 'Member Secretary AICTE & Chairman, GHCF',
    remarks: 'Institute completed 8-year lock-in requirement. Eligible for security release.',
  },
  {
    id: 'fdr-007',
    fdrNumber: 'FDR/AICTE/2024/7712',
    certificateNo: 'UBI-FDR-3382910',
    aicteAppId: '1-1182940192',
    bankName: 'Union Bank of India',
    bankBranch: 'Koti Main Branch, Hyderabad',
    ifscCode: 'UBIN0530018',
    institutionName: 'Deccan Institute of Aeronautical Engineering',
    institutionCode: 'AICTE-SCRO-2190',
    trustName: 'Deccan Educational Society',
    state: 'Telangana',
    depositPurpose: 'Mandatory Security Deposit - New Institute Approval',
    principalAmount: 3500000,
    interestRate: 7.30,
    issueDate: getOffsetDate(-210),
    maturityDate: getOffsetDate(1615), // Active (~4.4 years left)
    tenureYears: 5,
    autoRenewal: true,
    lienStatus: 'Lien Marked in Favor of Member Secretary, AICTE',
    jointHolder: 'Member Secretary AICTE & Secretary, Deccan Society',
    remarks: 'Physical FDR receipt deposited in AICTE SCRO safe custody.',
  },
  {
    id: 'fdr-008',
    fdrNumber: 'FDR/AICTE/2021/6102',
    certificateNo: 'SBI-FDR-8109283',
    aicteAppId: '1-9018274619',
    bankName: 'State Bank of India',
    bankBranch: 'Park Street Branch, Kolkata',
    ifscCode: 'SBIN0000001',
    institutionName: 'Bengal Technological Institute for Women',
    institutionCode: 'AICTE-ERO-0814',
    trustName: 'Bengal Women Upliftment & Tech Education Trust',
    state: 'West Bengal',
    depositPurpose: 'Establishment of New Women Engineering Institution (Concession Rate)',
    principalAmount: 2500000,
    interestRate: 7.05,
    issueDate: getOffsetDate(-1815),
    maturityDate: getOffsetDate(25),  // Expiring in 25 days!
    tenureYears: 5,
    autoRenewal: true,
    lienStatus: 'Lien Marked in Favor of Member Secretary, AICTE',
    jointHolder: 'Member Secretary AICTE & President, BWT',
    remarks: 'Mandatory 30-day renewal notification generated and sent to bank nodal officer.',
  },
  {
    id: 'fdr-009',
    fdrNumber: 'FDR/AICTE/2016/1109',
    certificateNo: 'CAN-FDR-9920148',
    aicteAppId: '1-5102938471',
    bankName: 'Canara Bank',
    bankBranch: 'Hazratganj Branch, Lucknow',
    ifscCode: 'CNRB0000164',
    institutionName: 'Awadh College of Engineering & Research',
    institutionCode: 'AICTE-NRO-0512',
    trustName: 'Awadh Welfare & Technical Society',
    state: 'Uttar Pradesh',
    depositPurpose: 'Mandatory Security Deposit - New Institute Approval (10-Year Lock-in)',
    principalAmount: 3500000,
    interestRate: 6.75,
    issueDate: getOffsetDate(-3680), // 10 years ago
    maturityDate: getOffsetDate(-2),  // Matured 2 days ago!
    tenureYears: 10,
    autoRenewal: false,
    lienStatus: 'Lien Marked in Favor of Member Secretary, AICTE',
    jointHolder: 'Member Secretary AICTE & Secretary, AWTS',
    remarks: 'Matured on completion of 10 years. Institution submitted NOC request for FDR release.',
  },
  {
    id: 'fdr-010',
    fdrNumber: 'FDR/AICTE/2025/0418',
    certificateNo: 'HDFC-SD-9940129',
    aicteAppId: '1-1204918274',
    bankName: 'HDFC Bank',
    bankBranch: 'Sector 17 Branch, Chandigarh',
    ifscCode: 'HDFC0000140',
    institutionName: 'Punjab Institute of Modern Robotics & Automation',
    institutionCode: 'AICTE-NWRO-3109',
    trustName: 'Punjab Futuristic Tech Foundation',
    state: 'Punjab',
    depositPurpose: 'New Specialized Institution in Industry 4.0 / Robotics',
    principalAmount: 3500000,
    interestRate: 7.40,
    issueDate: getOffsetDate(-120),
    maturityDate: getOffsetDate(1705), // Active (~4.6 years left)
    tenureYears: 5,
    autoRenewal: true,
    lienStatus: 'Lien Marked in Favor of Member Secretary, AICTE',
    jointHolder: 'Member Secretary AICTE & Trustee, PFTF',
    remarks: 'Joint FDR lien certificate verified via electronic bank interface.',
  },
  {
    id: 'fdr-011',
    fdrNumber: 'FDR/AICTE/2021/7790',
    certificateNo: 'PNB-SD-6619028',
    aicteAppId: '1-8819204719',
    bankName: 'Punjab National Bank',
    bankBranch: 'Bistupur Branch, Jamshedpur',
    ifscCode: 'PUNB0021500',
    institutionName: 'Chotanagpur Technical Institute of Mines & Metallurgy',
    institutionCode: 'AICTE-ERO-1928',
    trustName: 'Chotanagpur Tribal & Technical Development Trust',
    state: 'Jharkhand',
    depositPurpose: 'Establishment of Technical Campus in Special / Aspirational District',
    principalAmount: 2000000,
    interestRate: 6.95,
    issueDate: getOffsetDate(-1820),
    maturityDate: getOffsetDate(5),   // Expiring in 5 days!
    tenureYears: 5,
    autoRenewal: false,
    lienStatus: 'Lien Marked in Favor of Member Secretary, AICTE',
    jointHolder: 'Member Secretary AICTE & Chairman, CTTDT',
    remarks: 'URGENT: Maturity in 5 days. Awaiting compliance certificate from institution.',
  },
  {
    id: 'fdr-012',
    fdrNumber: 'FDR/AICTE/2023/8891',
    certificateNo: 'BOB-FDR-9910482',
    aicteAppId: '1-1092837482',
    bankName: 'Bank of Baroda',
    bankBranch: 'M.G. Road Branch, Indore',
    ifscCode: 'BARB0MGROAD',
    institutionName: 'Malwa Institute of Management & Information Technology',
    institutionCode: 'AICTE-CRO-1640',
    trustName: 'Malwa Educational Society',
    state: 'Madhya Pradesh',
    depositPurpose: 'Mandatory Security Deposit - MBA & MCA Dual Department',
    principalAmount: 2500000,
    interestRate: 7.20,
    issueDate: getOffsetDate(-365),
    maturityDate: getOffsetDate(1095), // Active (3 years left)
    tenureYears: 4,
    autoRenewal: true,
    lienStatus: 'Lien Marked in Favor of Member Secretary, AICTE',
    jointHolder: 'Member Secretary AICTE & President, MES',
    remarks: 'Standard ongoing deposit in joint custody.',
  },
];

// Unique list of banks for dropdown filter
export const BANK_OPTIONS = [
  'All Banks',
  'State Bank of India',
  'Punjab National Bank',
  'Canara Bank',
  'HDFC Bank',
  'ICICI Bank',
  'Bank of Baroda',
  'Union Bank of India',
];

// Status filters
export const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active Deposits' },
  { value: 'expiring_soon', label: 'Expiring Soon (≤30 Days)' },
  { value: 'matured', label: 'Matured (Action Due)' },
];
