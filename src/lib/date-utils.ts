/**
 * POS Business Day / Service Date Utilities
 * 
 * In restaurant and bar operations, a business day does not start at midnight (00:00).
 * Late-night services regularly run past midnight until 3:00 AM or 4:00 AM.
 * 
 * By defining a Cutoff Hour (e.g. 05:00 AM):
 * - Transactions made at 1:30 AM on Sunday night legally and operationally belong to Sunday's sales shift.
 * - Monday's business shift starts at 05:00 AM Monday and runs until 04:59 AM Tuesday.
 */

export const BUSINESS_DAY_CUTOFF_HOUR = 5 // 5:00 AM local time

/**
 * Returns the logical business day Date (at 00:00:00) for any given timestamp.
 * If the time is before 5:00 AM, it rolls back by 1 calendar day.
 */
export function getBusinessDayDate(timestamp: Date | string = new Date()): Date {
  const d = new Date(timestamp)
  if (d.getHours() < BUSINESS_DAY_CUTOFF_HOUR) {
    d.setDate(d.getDate() - 1)
  }
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
}

/**
 * Formats the business date as a friendly string, e.g. "Nov 15, 2026"
 */
export function formatBusinessDate(timestamp: Date | string): string {
  const bd = getBusinessDayDate(timestamp)
  return bd.toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' })
}

/**
 * Returns the exact UTC ISO timestamps [startIso, endIso] for a business service shift.
 */
export function getBusinessShiftRange(period: 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_month' | 'custom', customStart?: string, customEnd?: string): { startIso: string; endIso: string; label: string } {
  const currentBusinessDay = getBusinessDayDate(new Date())

  let start = new Date(currentBusinessDay)
  start.setHours(BUSINESS_DAY_CUTOFF_HOUR, 0, 0, 0) // e.g. Today 5:00 AM

  let end = new Date(currentBusinessDay)
  end.setDate(end.getDate() + 1)
  end.setHours(BUSINESS_DAY_CUTOFF_HOUR - 1, 59, 59, 999) // e.g. Tomorrow 4:59:59.999 AM

  let label = "Today's Business Shift"

  if (period === 'today') {
    // Current shift
    label = `Today (${formatBusinessDate(currentBusinessDay)})`
  } else if (period === 'yesterday') {
    start.setDate(start.getDate() - 1)
    end.setDate(end.getDate() - 1)
    const yesterdayDate = new Date(currentBusinessDay)
    yesterdayDate.setDate(yesterdayDate.getDate() - 1)
    label = `Yesterday (${formatBusinessDate(yesterdayDate)})`
  } else if (period === 'this_week') {
    // Monday 5:00 AM to Next Monday 4:59:59 AM
    const day = currentBusinessDay.getDay()
    const diffToMonday = (day === 0 ? -6 : 1) - day
    start.setDate(currentBusinessDay.getDate() + diffToMonday)
    start.setHours(BUSINESS_DAY_CUTOFF_HOUR, 0, 0, 0)
    // End is after Sunday night closing (Monday morning 4:59 AM)
    end = new Date(start)
    end.setDate(end.getDate() + 7)
    end.setHours(BUSINESS_DAY_CUTOFF_HOUR - 1, 59, 59, 999)
    label = "This Week"
  } else if (period === 'this_month') {
    // 1st of month 5:00 AM to 1st of next month 4:59:59 AM
    start = new Date(currentBusinessDay.getFullYear(), currentBusinessDay.getMonth(), 1, BUSINESS_DAY_CUTOFF_HOUR, 0, 0, 0)
    end = new Date(currentBusinessDay.getFullYear(), currentBusinessDay.getMonth() + 1, 1, BUSINESS_DAY_CUTOFF_HOUR - 1, 59, 59, 999)
    label = "This Month"
  } else if (period === 'last_month') {
    start = new Date(currentBusinessDay.getFullYear(), currentBusinessDay.getMonth() - 1, 1, BUSINESS_DAY_CUTOFF_HOUR, 0, 0, 0)
    end = new Date(currentBusinessDay.getFullYear(), currentBusinessDay.getMonth(), 1, BUSINESS_DAY_CUTOFF_HOUR - 1, 59, 59, 999)
    label = "Last Month"
  } else if (period === 'custom') {
    if (customStart) {
      const s = new Date(customStart)
      start = new Date(s.getFullYear(), s.getMonth(), s.getDate(), BUSINESS_DAY_CUTOFF_HOUR, 0, 0, 0)
    }
    if (customEnd) {
      const e = new Date(customEnd)
      end = new Date(e.getFullYear(), e.getMonth(), e.getDate() + 1, BUSINESS_DAY_CUTOFF_HOUR - 1, 59, 59, 999)
    }
    label = "Custom Range"
  }

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    label
  }
}

