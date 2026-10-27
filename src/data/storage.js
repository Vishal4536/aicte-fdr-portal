/**
 * AICTE Security Deposit / FDR Portal - LocalStorage Persistence Service
 * Ensures reliable persistent storage for the prototype.
 */

import { initialFDRRecords } from './sampleFDRs.js';

const STORAGE_KEY = 'aicte_fdr_records_v1';
const INITIALIZED_FLAG_KEY = 'aicte_fdr_storage_initialized_v1';

/**
 * Generate a unique stable ID for records
 */
export function generateFDRId() {
  return `fdr-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
}

/**
 * Load FDR records from localStorage.
 * - Seeds with initialFDRRecords ONLY on first launch (when INITIALIZED_FLAG_KEY is missing).
 * - If already initialized (even if user deleted all records, resulting in an empty array),
 *   it preserves the user's data and does NOT reseed.
 * - Ensures all records have a stable internal ID.
 */
export function loadFDRRecords() {
  try {
    const isInitialized = localStorage.getItem(INITIALIZED_FLAG_KEY);
    const rawData = localStorage.getItem(STORAGE_KEY);

    if (!isInitialized) {
      // First launch: initialize with sample records
      const seeded = initialFDRRecords.map((item, idx) => ({
        ...item,
        id: item.id || `fdr-seed-${idx + 1}`,
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      localStorage.setItem(INITIALIZED_FLAG_KEY, 'true');
      return seeded;
    }

    if (rawData !== null) {
      const parsed = JSON.parse(rawData);
      if (Array.isArray(parsed)) {
        // Ensure every existing record has a stable id
        let needsUpdate = false;
        const normalized = parsed.map((item, idx) => {
          if (!item.id) {
            needsUpdate = true;
            return { ...item, id: `fdr-recovered-${idx + 1}-${Date.now().toString(36)}` };
          }
          return item;
        });

        if (needsUpdate) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
        }
        return normalized;
      }
    }

    // If key existed but data was invalid/corrupt, safely fall back
    return initialFDRRecords;
  } catch (error) {
    console.error('Error reading FDR records from localStorage:', error);
    return initialFDRRecords;
  }
}

/**
 * Save FDR records to localStorage persistently.
 */
export function saveFDRRecords(records) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    localStorage.setItem(INITIALIZED_FLAG_KEY, 'true');
    return true;
  } catch (error) {
    console.error('Error saving FDR records to localStorage:', error);
    return false;
  }
}

/**
 * Reset storage back to sample records (useful for demo/testing)
 */
export function resetFDRStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(INITIALIZED_FLAG_KEY);
    return loadFDRRecords();
  } catch (error) {
    console.error('Error resetting FDR storage:', error);
    return initialFDRRecords;
  }
}
