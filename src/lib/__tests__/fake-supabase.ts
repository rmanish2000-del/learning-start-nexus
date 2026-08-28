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

export type DbError = { code: string; message: string } | null;

// Unique indexes the real database enforces and the tests rely on.
const UNIQUE_INDEXES: Record<string, string[][]> = {
  assessments: [["org_id", "client_request_id"]],
};

function uniqueViolation(rows: Row[], table: string, candidate: Row): DbError {
  for (const cols of UNIQUE_INDEXES[table] ?? []) {
    // Partial index semantics: NULLs are never conflicting.
    if (cols.some((c) => (candidate[c] ?? null) === null)) continue;
    if (rows.some((r) => cols.every((c) => r[c] === candidate[c]))) {
      return { code: "23505", message: `duplicate key value violates unique constraint on ${table}` };
    }
  }
  return null;
}

class Query implements PromiseLike<{ data: Row[] | null; error: DbError }> {
  private error: DbError = null;
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
      const inserted: Row[] = [];
      for (const p of payloads) {
        const candidate = { id: `row_${++idCounter}`, ...p };
        const violation = uniqueViolation(rows, this.table, candidate);
        if (violation) {
          this.error = violation;
          return [];
        }
        rows.push(candidate);
        inserted.push(candidate);
      }
      return inserted;
    }
    const hit = rows.filter((r) => matches(r, this.filters));
    if (this.kind === "update") hit.forEach((r) => Object.assign(r, this.payload as Row));
    if (this.kind === "delete") this.db[this.table] = rows.filter((r) => !hit.includes(r));
    return hit;
  }

  async maybeSingle(): Promise<{ data: Row | null; error: DbError }> {
    const rows = this.run();
    return { data: rows[0] ?? null, error: this.error };
  }

  async single(): Promise<{ data: Row | null; error: DbError }> {
    const rows = this.run();
    return { data: rows[0] ?? null, error: this.error };
  }

  then<TResult1 = { data: Row[] | null; error: DbError }, TResult2 = never>(
    onfulfilled?:
      | ((value: { data: Row[] | null; error: DbError }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    const rows = this.run();
    return Promise.resolve({ data: rows, error: this.error }).then(onfulfilled, onrejected);
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
