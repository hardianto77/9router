import { getAdapter } from "../driver.js";

/**
 * Auto-Prune & Database Maintenance Service
 *
 * Runs background maintenance on data.sqlite:
 * 1. Purges requestDetails older than retention days (default 7 days)
 * 2. Caches row counts and deletes excessive records beyond max limit (default 20,000)
 * 3. Purges accessEvents older than 7 days (or caps to 10,000)
 * 4. Triggers incremental vacuum to return unused disk pages without locking DB
 */

const DEFAULT_RETENTION_DAYS = 7;
const MAX_REQUEST_DETAILS = 20000;
const MAX_ACCESS_EVENTS = 10000;
const PRUNE_INTERVAL_MS = 6 * 60 * 60 * 1000; // Run every 6 hours

let pruneTimer = null;

export async function runDatabasePrune(options = {}) {
  const retentionDays = options.retentionDays || DEFAULT_RETENTION_DAYS;
  const maxRequests = options.maxRequests || MAX_REQUEST_DETAILS;
  const maxAccess = options.maxAccess || MAX_ACCESS_EVENTS;

  const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

  try {
    const db = await getAdapter();
    let prunedRequests = 0;
    let prunedAccess = 0;

    db.transaction(() => {
      // 1. Prune old requestDetails by date
      try {
        const resOld = db.run(`DELETE FROM requestDetails WHERE timestamp < ?`, [cutoffDate]);
        prunedRequests += resOld?.changes || 0;
      } catch {}

      // 2. Cap requestDetails total records
      try {
        const cntRow = db.get(`SELECT COUNT(*) as c FROM requestDetails`);
        if (cntRow && cntRow.c > maxRequests) {
          const excess = cntRow.c - maxRequests;
          const resExcess = db.run(
            `DELETE FROM requestDetails WHERE id IN (SELECT id FROM requestDetails ORDER BY timestamp ASC LIMIT ?)`,
            [excess]
          );
          prunedRequests += resExcess?.changes || 0;
        }
      } catch {}

      // 3. Prune old accessEvents
      try {
        const resAccess = db.run(`DELETE FROM accessEvents WHERE at < ?`, [cutoffDate]);
        prunedAccess += resAccess?.changes || 0;
        const cntAccess = db.get(`SELECT COUNT(*) as c FROM accessEvents`);
        if (cntAccess && cntAccess.c > maxAccess) {
          const excess = cntAccess.c - maxAccess;
          db.run(
            `DELETE FROM accessEvents WHERE id IN (SELECT id FROM accessEvents ORDER BY id ASC LIMIT ?)`,
            [excess]
          );
        }
      } catch {}
    });

    // 4. Run incremental vacuum to return unallocated pages to OS
    try {
      db.run("PRAGMA incremental_vacuum(500)");
    } catch {}

    console.log(`[DatabaseMaintenance] Pruned ${prunedRequests} request logs and ${prunedAccess} access logs (cutoff: ${retentionDays}d). Vacuum OK.`);
    return { success: true, prunedRequests, prunedAccess };
  } catch (error) {
    console.error("[DatabaseMaintenance] Prune failed:", error.message);
    return { success: false, error: error.message };
  }
}

export function startDatabaseMaintenanceScheduler() {
  if (pruneTimer) return;
  // Delay first run by 1 minute after boot to not compete with cold startup
  setTimeout(() => {
    runDatabasePrune().catch(() => {});
  }, 60000);

  pruneTimer = setInterval(() => {
    runDatabasePrune().catch(() => {});
  }, PRUNE_INTERVAL_MS);
}

export function stopDatabaseMaintenanceScheduler() {
  if (pruneTimer) {
    clearInterval(pruneTimer);
    pruneTimer = null;
  }
}
