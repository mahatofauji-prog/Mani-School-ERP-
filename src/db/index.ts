import { WowSQLClient } from "@wowsql/sdk";
import * as schema from "./schema.ts";
import fs from "fs";
import path from "path";

// Fetch WoWSQL configuration from environment with defaults
const url = process.env.WOWSQL_BASE_URL || "https://mani-school-erp-e1d57a54.wowsqlconnect.com";
const anonKey = process.env.WOWSQL_ANON_KEY || "wowsql_anon_UKb-lxFN2jqPmdz5rX2prwwuM_z8Jf4JmG7IwlpO5KA";

// Initialize the WoWSQL SDK client
export const wowsql = new WowSQLClient({ projectUrl: url, apiKey: anonKey });

// File-backed persistence path
const STORE_PATH = path.join(process.cwd(), "data_store.json");

// Helper to extract clean table name
function getTableName(rawName: string): string {
  return rawName.replace(/["`\[\]]/g, "").trim();
}

// Helper to execute WoWSQL builder with fast timeout fallback
async function withTimeout<T>(promise: Promise<T>, ms = 1500): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("WoWSQL Timeout")), ms))
  ]);
}

function extractIdFromWhere(whereClause: string, params: any[]): string | number {
  const match = whereClause.match(/id\s*=\s*\$([\d]+)/i);
  if (match) {
    const idx = parseInt(match[1]) - 1;
    return params[idx];
  }
  const literalMatch = whereClause.match(/id\s*=\s*'([^']+)'/i);
  if (literalMatch) {
    return literalMatch[1];
  }
  return "";
}

function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

// Default initial state
const defaultStore: Record<string, any[]> = {
  users: [
    {
      id: "founder_admin_default",
      name: "Founder Admin",
      email: "mahatofauji@gmail.com",
      phone: "+91 9999999999",
      password: "ManiFounder@2026",
      role: "founder_admin",
      school_id: null,
      school_name: "Platform Administration",
      status: "active",
      created_at: Date.now(),
      data: "{}"
    },
    {
      id: "founder_admin_alias",
      name: "Founder Admin",
      email: "founder@mani.edu",
      phone: "+91 9999999999",
      password: "ManiFounder@2026",
      role: "founder_admin",
      school_id: null,
      school_name: "Platform Administration",
      status: "active",
      created_at: Date.now(),
      data: "{}"
    }
  ],
  schools: [],
  plans: [],
  subscriptions: [],
  invoices: [],
  classes: [],
  sections: [],
  subjects: [],
  attendance: [],
  homework: [],
  materials: [],
  generic_documents: []
};

// Load store from disk or fallback
let memoryStore: Record<string, any[]> = { ...defaultStore };
try {
  if (fs.existsSync(STORE_PATH)) {
    const raw = fs.readFileSync(STORE_PATH, "utf-8");
    if (raw.trim()) {
      const parsed = JSON.parse(raw);
      memoryStore = { ...defaultStore, ...parsed };
    }
  }
} catch (e) {
  console.warn("Failed to load data_store.json, using default store:", e);
}

// Save store to disk
function saveStoreToDisk() {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(memoryStore, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to persist data_store.json:", e);
  }
}

// Memory list filtering engine
function filterMemoryList(list: any[], whereClause: string, params: any[]): any[] {
  if (!whereClause || !list) return list || [];
  let result = [...list];
  const conditions = whereClause.split(/\s+AND\s+/i);

  conditions.forEach(cond => {
    const match = cond.match(/([\w".->>'"()]+)\s*(=|!=|<>|LIKE|ILIKE)\s*(\$[\d]+|'[^']*'|[\w-]+)/i);
    if (match) {
      let col = match[1].trim().replace(/["`]/g, "");
      const op = match[2].trim().toUpperCase();
      const valPlaceholder = match[3].trim();
      let expectedVal: any;

      if (valPlaceholder.startsWith("$")) {
        const idx = parseInt(valPlaceholder.slice(1)) - 1;
        expectedVal = params[idx];
      } else {
        expectedVal = valPlaceholder.replace(/^'|'$/g, "");
      }

      let isDataAttr = false;
      let attrName = col;
      if (col.includes("->>")) {
        isDataAttr = true;
        attrName = col.split("->>")[1].replace(/['"]/g, "");
      } else if (col.includes("->")) {
        isDataAttr = true;
        attrName = col.split("->")[1].replace(/['"]/g, "");
      }

      result = result.filter(item => {
        let itemVal: any;
        if (isDataAttr) {
          const dataObj = typeof item.data === "string" ? JSON.parse(item.data || "{}") : (item.data || {});
          itemVal = dataObj[attrName];
        } else {
          itemVal = item[attrName] !== undefined ? item[attrName] : (item[toCamelCase(attrName)] !== undefined ? item[toCamelCase(attrName)] : undefined);
          if (itemVal === undefined && item.data) {
            const dataObj = typeof item.data === "string" ? JSON.parse(item.data || "{}") : (item.data || {});
            itemVal = dataObj[attrName] !== undefined ? dataObj[attrName] : dataObj[toCamelCase(attrName)];
          }
        }

        if (expectedVal === null || expectedVal === "null") {
          if (op === "=") return itemVal == null;
          if (op === "!=" || op === "<>") return itemVal != null;
        }

        if (op === "=") {
          return String(itemVal) === String(expectedVal);
        } else if (op === "!=" || op === "<>") {
          return String(itemVal) !== String(expectedVal);
        } else if (op === "LIKE" || op === "ILIKE") {
          const regex = new RegExp(String(expectedVal).replace(/%/g, ".*"), "i");
          return regex.test(String(itemVal || ""));
        }
        return true;
      });
    }
  });

  return result;
}

// SQL query runner mapping to WoWSQL REST API & local persistent store
export async function executeWoWSQLQuery(sqlStr: string, params: any[] = []): Promise<{ rows: any[] }> {
  const normalizedSql = sqlStr.replace(/\s+/g, " ").trim();

  // 1. SELECT 1 (Healthcheck)
  if (/^SELECT 1$/i.test(normalizedSql)) {
    return { rows: [{ "?column?": 1 }] };
  }

  try {
    // 2. SELECT queries
    if (/^SELECT/i.test(normalizedSql)) {
      const countMatch = normalizedSql.match(/^SELECT\s+count\(\*\)::int\s+FROM\s+([\w".]+)(?:\s+WHERE\s+(.+?))?(?:\s+ORDER\s+BY|\s*$)/i);
      if (countMatch) {
        const table = getTableName(countMatch[1]);
        const whereClause = countMatch[2];

        try {
          let builder = wowsql.table(table).select("*");
          if (whereClause) {
            builder = applyWhereConditions(builder, whereClause, params);
          }
          const count = await withTimeout(builder.count());
          return { rows: [{ count: count || 0 }] };
        } catch (e) {
          const list = memoryStore[table] || [];
          const filtered = filterMemoryList(list, whereClause || "", params);
          return { rows: [{ count: filtered.length }] };
        }
      }

      const selectMatch = normalizedSql.match(/^SELECT\s+(.+?)\s+FROM\s+([\w".]+)(?:\s+WHERE\s+(.+?))?(?:\s+ORDER\s+BY\s+([\w".\s]+))?(?:\s*$)/i);
      if (selectMatch) {
        const table = getTableName(selectMatch[2]);
        const whereClause = selectMatch[3];
        const orderByClause = selectMatch[4];

        try {
          let builder = wowsql.table(table).select("*");
          if (whereClause) {
            builder = applyWhereConditions(builder, whereClause, params);
          }
          if (orderByClause) {
            const parts = orderByClause.trim().split(/\s+/);
            const col = parts[0].replace(/["`]/g, "");
            const isDesc = parts[1] && parts[1].toUpperCase() === "DESC";
            builder = builder.orderBy(col, isDesc ? "desc" : "asc");
          }

          const res = await withTimeout(builder.get());
          return { rows: res.data || [] };
        } catch (e) {
          let list = memoryStore[table] || [];
          const filtered = filterMemoryList(list, whereClause || "", params);
          return { rows: filtered };
        }
      }
    }

    // 3. INSERT queries
    if (/^INSERT\s+INTO/i.test(normalizedSql)) {
      const insertMatch = normalizedSql.match(/^INSERT\s+INTO\s+([\w".]+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
      if (insertMatch) {
        const table = getTableName(insertMatch[1]);
        const columns = insertMatch[2].split(",").map(c => c.trim().replace(/["`]/g, ""));
        const valuePlaceholders = insertMatch[3].split(",").map(v => v.trim());

        const payload: Record<string, any> = {};
        columns.forEach((col, idx) => {
          const pl = valuePlaceholders[idx];
          if (pl.startsWith("$")) {
            const paramIdx = parseInt(pl.slice(1)) - 1;
            payload[col] = params[paramIdx];
          } else {
            if (pl === "DEFAULT") {
              // Skip
            } else if (pl.includes("::jsonb")) {
              payload[col] = {};
            } else {
              payload[col] = pl.replace(/^'|'$/g, "");
            }
          }
        });

        // Always save to memory store & disk to guarantee persistence
        if (!memoryStore[table]) memoryStore[table] = [];
        const item = { id: payload.id || `id_${Date.now()}`, ...payload };

        // Replace if exists, otherwise push
        const existingIdx = memoryStore[table].findIndex(x => String(x.id) === String(item.id));
        if (existingIdx !== -1) {
          memoryStore[table][existingIdx] = item;
        } else {
          memoryStore[table].push(item);
        }
        saveStoreToDisk();

        try {
          const { id, message } = await withTimeout(wowsql.table(table).insert(payload));
          return { rows: [{ id: id || item.id, message }] };
        } catch (e) {
          return { rows: [{ id: item.id, message: "Inserted" }] };
        }
      }
    }

    // 4. UPDATE queries
    if (/^UPDATE/i.test(normalizedSql)) {
      const updateMatch = normalizedSql.match(/^UPDATE\s+([\w".]+)\s+SET\s+(.+?)\s+WHERE\s+(.+)$/i);
      if (updateMatch) {
        const table = getTableName(updateMatch[1]);
        const setClause = updateMatch[2];
        const whereClause = updateMatch[3];

        const setPairs = setClause.split(",").map(p => p.trim());
        const payload: Record<string, any> = {};

        setPairs.forEach(pair => {
          const eqIdx = pair.indexOf("=");
          if (eqIdx !== -1) {
            const col = pair.slice(0, eqIdx).trim().replace(/["`]/g, "");
            const valPlaceholder = pair.slice(eqIdx + 1).trim();
            if (valPlaceholder.startsWith("$")) {
              const paramIdx = parseInt(valPlaceholder.slice(1)) - 1;
              payload[col] = params[paramIdx];
            } else {
              payload[col] = valPlaceholder.replace(/^'|'$/g, "");
            }
          }
        });

        const id = extractIdFromWhere(whereClause, params);

        // Always update local persistent store
        const list = memoryStore[table] || [];
        const idx = list.findIndex(item => String(item.id) === String(id));
        if (idx !== -1) {
          memoryStore[table][idx] = { ...memoryStore[table][idx], ...payload };
          saveStoreToDisk();
        }

        try {
          const { message, affected_rows } = await withTimeout(wowsql.table(table).update(id, payload));
          return { rows: [{ id, message, affected_rows }] };
        } catch (e) {
          return { rows: [{ id, message: "Updated", affected_rows: idx !== -1 ? 1 : 0 }] };
        }
      }
    }

    // 5. DELETE queries
    if (/^DELETE\s+FROM/i.test(normalizedSql)) {
      const deleteMatch = normalizedSql.match(/^DELETE\s+FROM\s+([\w".]+)\s+WHERE\s+(.+)$/i);
      if (deleteMatch) {
        const table = getTableName(deleteMatch[1]);
        const whereClause = deleteMatch[2];
        const id = extractIdFromWhere(whereClause, params);

        if (memoryStore[table]) {
          memoryStore[table] = memoryStore[table].filter(item => String(item.id) !== String(id));
          saveStoreToDisk();
        }

        try {
          const { message, affected_rows } = await withTimeout(wowsql.table(table).delete(id));
          return { rows: [{ id, message, affected_rows }] };
        } catch (e) {
          return { rows: [{ id, message: "Deleted", affected_rows: 1 }] };
        }
      }
    }

    console.warn("Unhandled SQL translation pattern (returning empty result):", normalizedSql);
    return { rows: [] };
  } catch (err: any) {
    console.error("WoWSQL Query Execution Error:", err.message);
    return { rows: [] };
  }
}

// Apply WHERE conditions directly to PostgREST builder
function applyWhereConditions(builder: any, whereClause: string, params: any[]): any {
  const cleanedWhere = whereClause.replace(/^\s*\(\s*|\s*\)\s*$/g, "").trim();
  const conditions = cleanedWhere.split(/\s+AND\s+/i);

  conditions.forEach(cond => {
    const match = cond.match(/^([\w".->>'"()]+)\s*(=|!=|<>|LIKE|ILIKE)\s*(\$[\d]+|.+)$/i);
    if (match) {
      let col = match[1].trim().replace(/["`]/g, "");
      const op = match[2].trim().toUpperCase();
      const valPlaceholder = match[3].trim();

      let value: any;
      if (valPlaceholder.startsWith("$")) {
        const idx = parseInt(valPlaceholder.slice(1)) - 1;
        value = params[idx];
      } else {
        value = valPlaceholder.replace(/^'|'$/g, "");
      }

      if (col.includes("->>")) {
        col = col.replace("->>", "->");
      }

      if (op === "=") {
        builder = builder.eq(col, value);
      } else if (op === "!=" || op === "<>") {
        builder = builder.neq(col, value);
      } else if (op === "LIKE" || op === "ILIKE") {
        builder = builder.ilike(col, value.replace(/%/g, "*"));
      }
    }
  });

  return builder;
}

import { PgDialect } from "drizzle-orm/pg-core";
const dialect = new PgDialect();

// Emulate a Drizzle db object for drop-in query execution compatibility
export const db = {
  execute: async (query: any) => {
    let sqlStr = "";
    let params: any[] = [];

    if (typeof query === "string") {
      sqlStr = query;
    } else if (query && typeof query.toSQL === "function") {
      const compiled = query.toSQL();
      sqlStr = compiled.sql;
      params = compiled.params || [];
    } else if (query && query.sql) {
      sqlStr = query.sql;
      params = query.params || [];
    } else if (query && query.queryChunks) {
      const compiled = dialect.sqlToQuery(query);
      sqlStr = compiled.sql;
      params = compiled.params || [];
    } else {
      sqlStr = String(query);
    }

    return await executeWoWSQLQuery(sqlStr, params);
  }
};


