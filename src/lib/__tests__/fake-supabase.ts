// Minimal in-memory stand-in for the service-role Supabase client, covering
// exactly the query shapes the parent payment path uses:
//   from(t).select(cols).eq(...).maybeSingle() / .single()
//   from(t).update(patch).eq(...).neq(...) / .is(...)
//   from(t).insert(row) [.select(cols).single()]

export type Row = Record<string, unknown>;
export type Db = Record<string, Row[]>;

let idCounter = 0;

type Filter = { op: "eq" | "neq" | "is" | "in"; column: string; value: unknown };

function matches(row: Row, filters: Filter[]): boolean {
  return filters.every((f) => {
    const actual = row[f.column] ?? null;
    if (f.op === "eq") return actual === f.value;
    if (f.op === "neq") return actual !== f.value;
    if (f.op === "in") return (f.value as unknown[]).includes(actual);
    return actual === f.value; // `is` — used for null checks
  });
}

class Query implements PromiseLike<{ data: Row[] | null; error: null }> {
  private filters: Filter[] = [];

  constructor(
    private db: Db,
    private table: string,
    private kind: "select" | "update" | "insert" | "delete",
    private payload?: Row | Row[],
  ) {}

  private rows(): Row[] {
    return (this.db[this.table] ??= []);
  }

  select(): this {
    return this;
  }
  eq(column: string, value: unknown): this {
    this.filters.push({ op: "eq", column, value });
    return this;
  }
  neq(column: string, value: unknown): this {
    this.filters.push({ op: "neq", column, value });
    return this;
  }
  is(column: string, value: unknown): this {
    this.filters.push({ op: "is", column, value });
    return this;
  }
  in(column: string, value: unknown[]): this {
    this.filters.push({ op: "in", column, value });
    return this;
  }
  order(): this {
    return this;
  }
  limit(): this {
    return this;
  }

  private run(): Row[] {
    const rows = this.rows();
    if (this.kind === "insert") {
      const payloads = Array.isArray(this.payload) ? this.payload : [this.payload ?? {}];
      const inserted = payloads.map((p) => ({ id: `row_${++idCounter}`, ...p }));
      rows.push(...inserted);
      return inserted;
    }
    const hit = rows.filter((r) => matches(r, this.filters));
    if (this.kind === "update") hit.forEach((r) => Object.assign(r, this.payload as Row));
    if (this.kind === "delete") this.db[this.table] = rows.filter((r) => !hit.includes(r));
    return hit;
  }

  async maybeSingle(): Promise<{ data: Row | null; error: null }> {
    return { data: this.run()[0] ?? null, error: null };
  }

  async single(): Promise<{ data: Row | null; error: null }> {
    return { data: this.run()[0] ?? null, error: null };
  }

  then<TResult1 = { data: Row[] | null; error: null }, TResult2 = never>(
    onfulfilled?:
      | ((value: { data: Row[] | null; error: null }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve({ data: this.run(), error: null as null }).then(onfulfilled, onrejected);
  }
}

export function createFakeSupabase(db: Db) {
  return {
    from(table: string) {
      return {
        select: () => new Query(db, table, "select"),
        update: (patch: Row) => new Query(db, table, "update", patch),
        insert: (row: Row | Row[]) => new Query(db, table, "insert", row),
        delete: () => new Query(db, table, "delete"),
      };
    },
  };
}
