// First successful load establishes a baseline, not a new-request notification.
export function pendingAlerts(current: string[], seen: ReadonlySet<string> | null, pending: string[]): string[] {
  if (!seen) return [];
  const active = new Set(pending);
  const next = [...new Set([...current.filter(id => active.has(id)), ...pending.filter(id => !seen.has(id))])];
  return next.length === current.length && next.every((id,i) => id === current[i]) ? current : next;
}
