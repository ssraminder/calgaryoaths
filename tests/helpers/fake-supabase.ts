/**
 * Minimal in-memory stand-in for the supabase-js query builder — just the
 * subset the calendar/slots code uses. Tables are plain arrays of rows.
 */
type Row = Record<string, any>;
type Pred = (row: Row) => boolean;

function cmp(a: any, b: any): number {
  if (a == null || b == null) return a == b ? 0 : a == null ? -1 : 1;
  const ta = typeof a === 'string' && /^\d{4}-\d{2}-\d{2}/.test(a) && typeof b === 'string' ? Date.parse(a) : NaN;
  const tb = typeof b === 'string' && /^\d{4}-\d{2}-\d{2}/.test(b) ? Date.parse(b) : NaN;
  // Compare timestamps as instants, plain dates lexically
  if (!isNaN(ta) && !isNaN(tb) && (a.length > 10 || b.length > 10)) return ta - tb;
  return a < b ? -1 : a > b ? 1 : 0;
}

function likeToRegex(pattern: string): RegExp {
  return new RegExp('^' + pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*') + '$');
}

function parseList(v: string): string[] {
  return v.replace(/^\(|\)$/g, '').split(',').map((s) => s.trim());
}

/** Parse a PostgREST filter fragment like `status.eq.paid` or `status.in.(a,b)`. */
function parseFilter(expr: string): Pred {
  if (expr.startsWith('and(')) {
    const inner = splitTopLevel(expr.slice(4, -1));
    const preds = inner.map(parseFilter);
    return (r) => preds.every((p) => p(r));
  }
  const m = expr.match(/^([a-z_]+)\.(eq|neq|gt|gte|lt|lte|in|is)\.(.*)$/);
  if (!m) throw new Error(`fake-supabase: unsupported filter ${expr}`);
  const [, col, op, val] = m;
  switch (op) {
    case 'eq': return (r) => String(r[col]) === val;
    case 'neq': return (r) => String(r[col]) !== val;
    case 'gt': return (r) => cmp(r[col], val) > 0;
    case 'gte': return (r) => cmp(r[col], val) >= 0;
    case 'lt': return (r) => cmp(r[col], val) < 0;
    case 'lte': return (r) => cmp(r[col], val) <= 0;
    case 'in': { const list = parseList(val); return (r) => list.includes(String(r[col])); }
    case 'is': return (r) => (val === 'null' ? r[col] == null : String(r[col]) === val);
  }
  throw new Error('unreachable');
}

function splitTopLevel(s: string): string[] {
  const out: string[] = [];
  let depth = 0, cur = '';
  for (const ch of s) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { out.push(cur); cur = ''; } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

class Query {
  private preds: Pred[] = [];
  private op: 'select' | 'update' | 'delete' | 'upsert' | 'insert' = 'select';
  private payload: any;
  private upsertOpts: { onConflict?: string; ignoreDuplicates?: boolean } = {};
  private mode: 'many' | 'single' | 'maybeSingle' = 'many';
  private returning = false;
  private orderBy: { col: string; asc: boolean } | null = null;
  private columns: string[] | null = null;

  constructor(private db: FakeSupabase, private table: string) {}

  select(cols?: string) {
    if (this.op !== 'select') this.returning = true;
    if (cols && cols.trim() !== '*') this.columns = cols.split(',').map((c) => c.trim());
    return this;
  }
  update(values: Row) { this.op = 'update'; this.payload = values; return this; }
  delete() { this.op = 'delete'; return this; }
  insert(rows: Row | Row[]) { this.op = 'insert'; this.payload = rows; return this; }
  upsert(rows: Row | Row[], opts: { onConflict?: string; ignoreDuplicates?: boolean } = {}) {
    this.op = 'upsert'; this.payload = rows; this.upsertOpts = opts; return this;
  }
  eq(col: string, v: any) { this.preds.push((r) => r[col] === v); return this; }
  neq(col: string, v: any) {
    this.preds.push((r) => (typeof r[col] === 'object' && r[col] !== null ? JSON.stringify(r[col]) : r[col]) !== v);
    return this;
  }
  in(col: string, vs: any[]) { this.preds.push((r) => vs.includes(r[col])); return this; }
  gt(col: string, v: any) { this.preds.push((r) => cmp(r[col], v) > 0); return this; }
  gte(col: string, v: any) { this.preds.push((r) => cmp(r[col], v) >= 0); return this; }
  lt(col: string, v: any) { this.preds.push((r) => cmp(r[col], v) < 0); return this; }
  lte(col: string, v: any) { this.preds.push((r) => cmp(r[col], v) <= 0); return this; }
  not(col: string, op: string, v: any) {
    if (op === 'is') this.preds.push((r) => (v === null ? r[col] != null : r[col] !== v));
    else if (op === 'in') { const list = parseList(v); this.preds.push((r) => !list.includes(String(r[col]))); }
    else if (op === 'like') { const re = likeToRegex(v); this.preds.push((r) => r[col] != null && !re.test(r[col])); }
    else throw new Error(`fake-supabase: unsupported not(${op})`);
    return this;
  }
  or(expr: string) {
    const preds = splitTopLevel(expr).map(parseFilter);
    this.preds.push((r) => preds.some((p) => p(r)));
    return this;
  }
  order(col: string, opts?: { ascending?: boolean }) { this.orderBy = { col, asc: opts?.ascending !== false }; return this; }
  single() { this.mode = 'single'; return this; }
  maybeSingle() { this.mode = 'maybeSingle'; return this; }

  then<T>(resolve: (v: { data: any; error: any }) => T, reject?: (e: any) => any) {
    try { return Promise.resolve(this.run()).then(resolve, reject); } catch (e) { return Promise.reject(e).then(resolve, reject); }
  }

  private rows(): Row[] { return this.db.tables[this.table] ?? (this.db.tables[this.table] = []); }

  private run(): { data: any; error: any } {
    const fail = this.db.failOn?.(this.table, this.op, this.payload);
    if (fail) return { data: null, error: { message: fail } };
    const rows = this.rows();
    const match = (r: Row) => this.preds.every((p) => p(r));
    let result: Row[] = [];

    if (this.op === 'select') {
      result = rows.filter(match).map((r) => structuredClone(r));
      if (this.orderBy) {
        const { col, asc } = this.orderBy;
        result.sort((a, b) => (asc ? 1 : -1) * cmp(a[col], b[col]));
      }
    } else if (this.op === 'update') {
      for (const r of rows.filter(match)) Object.assign(r, structuredClone(this.payload));
      result = rows.filter(match).map((r) => structuredClone(r));
    } else if (this.op === 'delete') {
      const keep = rows.filter((r) => !match(r));
      result = rows.filter(match);
      this.db.tables[this.table] = keep;
    } else {
      const incoming: Row[] = (Array.isArray(this.payload) ? this.payload : [this.payload]).map((r: Row) => structuredClone(r));
      const keys = this.upsertOpts.onConflict?.split(',').map((k) => k.trim());
      for (const row of incoming) {
        const existing = keys ? rows.find((r) => keys.every((k) => r[k] === row[k])) : undefined;
        if (existing && this.op === 'upsert') {
          if (!this.upsertOpts.ignoreDuplicates) Object.assign(existing, row);
          result.push(structuredClone(existing));
        } else {
          const created = { id: row.id ?? `${this.table}-${++this.db.seq}`, ...row };
          rows.push(created);
          result.push(structuredClone(created));
        }
      }
    }

    if (this.columns) {
      const cols = this.columns;
      result = result.map((r) => Object.fromEntries(cols.filter((c) => c in r).map((c) => [c, r[c]])));
    }
    if (this.mode === 'single') {
      return result.length === 1 ? { data: result[0], error: null } : { data: null, error: { message: `expected 1 row, got ${result.length}` } };
    }
    if (this.mode === 'maybeSingle') return { data: result[0] ?? null, error: null };
    return { data: this.op === 'select' || this.returning ? result : null, error: null };
  }
}

export class FakeSupabase {
  tables: Record<string, Row[]> = {};
  seq = 0;
  /** Return an error message to make a write/read fail. */
  failOn?: (table: string, op: string, payload: any) => string | null;
  from(table: string) { return new Query(this, table); }
}
