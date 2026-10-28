/**
 * AICTE Security Deposit / FDR Portal - CSV Export Utility Suite
 * Generates and downloads standard RFC 4180 compliant CSV exports of FDR records,
 * bank concentration reports, and regional breakdown summaries.
 */

import { computeFDRStatus, formatINR } from '../data/sampleFDRs.js';

/**
 * Escapes a single cell value for RFC 4180 compliant CSV output.
 * If the value contains commas, double quotes, or newlines,
 * it wraps the value in double quotes and escapes existing quotes by doubling them.
 * 
 * @param {any} value - Cell value to escape
 * @returns {string} Escaped string representation
 */
export function escapeCsvCell(value) {
  if (value === null || value === undefined) {
    return '';
  }
  let str = String(value);

  // Spreadsheet formula injection mitigation (CWE-1236)
  // Neutralize formula triggers (=, +, -, @) by prepending a single quote to force literal text interpretation
  if (/^[=+\-@]/.test(str)) {
    str = `'${str}`;
  }

  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Format status code to human readable text
 * @param {string} status 
 * @returns {string}
 */
export function getStatusLabel(status) {
  switch (status) {
    case 'expiring_soon':
      return 'Expiring Soon (≤30 Days)';
    case 'matured':
      return 'Matured (Action Due)';
    case 'active':
    default:
      return 'Active';
  }
}

/**
 * Master FDR CSV Column Definitions adhering to AICTE FDR Portal requirements:
 * FDR number, Bank, Bank branch, Beneficiary/Institution, Institution Code,
 * Deposit purpose, Principal amount, Interest rate, Issue date, Maturity date,
 * Maturity status, Lien status, Remarks.
 */
export const CSV_COLUMNS = [
  { header: 'FDR Number', key: 'fdrNumber' },
  { header: 'Bank', key: 'bankName' },
  { header: 'Bank Branch', key: 'bankBranch' },
  { header: 'Beneficiary / Institution', key: 'institutionName' },
  { header: 'Institution Code', key: 'institutionCode' },
  { header: 'Trust / Society', key: 'trustName' },
  { header: 'State / Region', key: 'state' },
  { header: 'Deposit Purpose', key: 'depositPurpose' },
  { 
    header: 'Principal Amount (INR)', 
    key: 'principalAmount',
    format: (val) => (val !== undefined && val !== null && !isNaN(val) ? Number(val) : 0)
  },
  { 
    header: 'Interest Rate (%)', 
    key: 'interestRate',
    format: (val) => (val !== undefined && val !== null ? `${val}%` : '')
  },
  { header: 'Issue Date', key: 'issueDate' },
  { header: 'Maturity Date', key: 'maturityDate' },
  { 
    header: 'Maturity Status', 
    key: 'status',
    format: (_, record) => getStatusLabel(computeFDRStatus(record))
  },
  { header: 'Lien Status', key: 'lienStatus' },
  { header: 'Joint Holder Clause', key: 'jointHolder' },
  { header: 'Remarks', key: 'remarks' },
];

/**
 * Generates RFC 4180 CSV string content from an array of records.
 * Pure function suitable for automated unit testing.
 * 
 * @param {Array} records - Array of record objects
 * @param {Object} [options] - Export options
 * @param {Array} [options.columns] - Custom column definitions
 * @returns {string} Complete CSV formatted string
 */
export function generateCsvContent(records = [], options = {}) {
  const columns = options.columns || CSV_COLUMNS;
  
  // Header row
  const headerRow = columns.map((col) => escapeCsvCell(col.header)).join(',');

  if (!records || records.length === 0) {
    return headerRow;
  }

  // Data rows
  const dataRows = records.map((record) => {
    return columns.map((col) => {
      let rawVal;
      if (typeof col.format === 'function') {
        rawVal = col.format(record[col.key], record);
      } else {
        rawVal = record[col.key];
      }
      return escapeCsvCell(rawVal);
    }).join(',');
  });

  return [headerRow, ...dataRows].join('\r\n');
}

/**
 * Triggers a file download in the browser from CSV string content.
 * Cleans up temporary object URLs automatically.
 * 
 * @param {string} csvContent - CSV string
 * @param {string} filename - Filename for download
 * @returns {boolean} Success status
 */
export function triggerCsvDownload(csvContent, filename) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }

  // Add UTF-8 BOM so Excel on Windows properly displays rupee symbols and unicode
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });

  if (window.URL && window.URL.createObjectURL) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      if (link.parentNode) {
        document.body.removeChild(link);
      }
      window.URL.revokeObjectURL(url);
    }, 500);
    return true;
  }
  return false;
}

/**
 * Exports FDR records to a downloadable CSV file in the browser.
 * 
 * @param {Array} records - Records to export
 * @param {string} [customFilename] - Optional custom filename
 * @param {Object} [callbacks] - Optional { onSuccess, onError } callbacks
 * @returns {Object} Result { success: boolean, message: string, count: number, filename?: string }
 */
export function exportFDRsToCSV(records = [], customFilename = '', callbacks = {}) {
  const { onSuccess, onError } = callbacks;

  try {
    if (!Array.isArray(records) || records.length === 0) {
      const errorMsg = 'No FDR records available to export.';
      if (typeof onError === 'function') onError(errorMsg);
      return { success: false, message: errorMsg, count: 0 };
    }

    const csvContent = generateCsvContent(records);
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = customFilename || `fdr-report-${dateStr}.csv`;

    triggerCsvDownload(csvContent, filename);

    const successMsg = `Successfully exported ${records.length} FDR ${records.length === 1 ? 'record' : 'records'} to ${filename}.`;
    if (typeof onSuccess === 'function') {
      onSuccess(successMsg, records.length, filename);
    }

    return {
      success: true,
      message: successMsg,
      count: records.length,
      filename,
    };
  } catch (err) {
    const errorMsg = `Failed to export CSV: ${err.message || 'Unknown error'}`;
    console.error('Error exporting FDR CSV:', err);
    if (typeof onError === 'function') onError(errorMsg);
    return { success: false, message: errorMsg, count: 0 };
  }
}

/**
 * Exports aggregated Depository Bank Concentration Summary to CSV.
 * 
 * @param {Array} bankSummary - Array of bank aggregation objects
 * @param {string} [customFilename] - Custom filename
 * @param {Object} [callbacks] - Optional callbacks
 */
export function exportBankSummaryToCSV(bankSummary = [], customFilename = '', callbacks = {}) {
  const { onSuccess, onError } = callbacks;

  try {
    if (!Array.isArray(bankSummary) || bankSummary.length === 0) {
      const errorMsg = 'No bank summary data available to export.';
      if (typeof onError === 'function') onError(errorMsg);
      return { success: false, message: errorMsg, count: 0 };
    }

    const columns = [
      { header: 'Depository Bank', key: 'bankName' },
      { header: 'FDR Count', key: 'count' },
      { header: 'Total Principal (INR)', key: 'totalPrincipal' },
      { 
        header: 'Portfolio Share (%)', 
        key: 'percentageOfTotal', 
        format: (val) => `${Number(val || 0).toFixed(2)}%` 
      },
      { 
        header: 'Weighted Avg Interest Rate (%)', 
        key: 'weightedAvgRate', 
        format: (val) => `${val}%` 
      },
      { header: 'Active FDRs', key: 'activeCount' },
      { header: 'Expiring Soon (≤30 Days)', key: 'expiringSoonCount' },
      { header: 'Matured FDRs', key: 'maturedCount' },
    ];

    const csvContent = generateCsvContent(bankSummary, { columns });
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = customFilename || `aicte-bank-exposure-report-${dateStr}.csv`;

    triggerCsvDownload(csvContent, filename);

    const successMsg = `Successfully exported bank concentration report (${bankSummary.length} banks) to ${filename}.`;
    if (typeof onSuccess === 'function') onSuccess(successMsg, bankSummary.length, filename);
    return { success: true, message: successMsg, count: bankSummary.length, filename };
  } catch (err) {
    const errorMsg = `Failed to export bank summary: ${err.message || 'Unknown error'}`;
    if (typeof onError === 'function') onError(errorMsg);
    return { success: false, message: errorMsg, count: 0 };
  }
}

/**
 * Exports Regional Office & State Breakdown Summary to CSV.
 * 
 * @param {Array} regionalSummary - Array of regional aggregation objects
 * @param {string} [customFilename] - Custom filename
 * @param {Object} [callbacks] - Optional callbacks
 */
export function exportRegionalSummaryToCSV(regionalSummary = [], customFilename = '', callbacks = {}) {
  const { onSuccess, onError } = callbacks;

  try {
    if (!Array.isArray(regionalSummary) || regionalSummary.length === 0) {
      const errorMsg = 'No regional summary data available to export.';
      if (typeof onError === 'function') onError(errorMsg);
      return { success: false, message: errorMsg, count: 0 };
    }

    const columns = [
      { header: 'State / Region', key: 'state' },
      { header: 'AICTE Regional Office Code', key: 'regionCode' },
      { header: 'Total FDRs', key: 'count' },
      { header: 'Total Principal Amount (INR)', key: 'totalPrincipal' },
      { 
        header: 'Portfolio Share (%)', 
        key: 'percentageOfTotal', 
        format: (val) => `${Number(val || 0).toFixed(2)}%` 
      },
      { header: 'Active FDRs', key: 'activeCount' },
      { header: 'Expiring Soon', key: 'expiringSoonCount' },
      { header: 'Matured FDRs', key: 'maturedCount' },
    ];

    const csvContent = generateCsvContent(regionalSummary, { columns });
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = customFilename || `aicte-regional-breakdown-${dateStr}.csv`;

    triggerCsvDownload(csvContent, filename);

    const successMsg = `Successfully exported regional breakdown report (${regionalSummary.length} regions) to ${filename}.`;
    if (typeof onSuccess === 'function') onSuccess(successMsg, regionalSummary.length, filename);
    return { success: true, message: successMsg, count: regionalSummary.length, filename };
  } catch (err) {
    const errorMsg = `Failed to export regional summary: ${err.message || 'Unknown error'}`;
    if (typeof onError === 'function') onError(errorMsg);
    return { success: false, message: errorMsg, count: 0 };
  }
}
