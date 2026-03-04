import { chromium } from 'playwright';

export type DetectedTable = {
  id: string;
  type: 'html_table' | 'list' | 'grid';
  selector: string;
  headers: string[];
  rows: Record<string, string>[];
  preview: string;
};

export type FieldExtraction = { selector: string; variable: string };
export type ExtractionConfig = {
  tables?: {
    id: string;
    selector: string;
    columns: { source: string; target: string }[];
    type: string;
  }[];
  /** XPath sau CSS → nume variabilă. Folosești {{nume}} în scripturi. */
  fields?: FieldExtraction[];
  /** Opțional: selector pentru rânduri (ex: tr, .row). Dacă e setat, se extrag mai multe rânduri. */
  rowSelector?: string;
};

export async function analyzePage(url: string): Promise<DetectedTable[]> {
  const browser = await chromium.launch({ headless: true });
  const results: DetectedTable[] = [];
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);

    const tables = await page.$$eval('table', (elements) =>
      elements.map((el, i) => {
        const id = `table-${i}`;
        const headers: string[] = [];
        el.querySelectorAll('th').forEach((th) => headers.push((th.textContent || '').trim()));
        if (headers.length === 0) {
          const firstRow = el.querySelector('tr');
          if (firstRow) {
            firstRow.querySelectorAll('td, th').forEach((cell) => headers.push((cell.textContent || '').trim()));
          }
        }
        const rows: Record<string, string>[] = [];
        const trs = el.querySelectorAll('tr');
        const startRow = headers.length && trs[0]?.querySelector('th') ? 1 : 0;
        for (let r = startRow; r < trs.length; r++) {
          const row: Record<string, string> = {};
          trs[r].querySelectorAll('td, th').forEach((cell, c) => {
            const key = headers[c] || `Col${c}`;
            row[key] = (cell.textContent || '').trim();
          });
          if (Object.keys(row).length) rows.push(row);
        }
        const preview = rows.slice(0, 3).map((r) => JSON.stringify(r)).join(' | ');
        return { id, type: 'html_table', selector: `table:nth-of-type(${i + 1})`, headers, rows, preview };
      })
    );
    results.push(...tables);

    const lists = await page.$$eval('[data-table], .data-table, [role="grid"], .grid, .list-data', (elements) =>
      elements.map((el, i) => {
        const id = `list-${i}`;
        const rows = Array.from(el.querySelectorAll('tr, [data-row], .row, li')).map((rowEl) => {
          const row: Record<string, string> = {};
          rowEl.querySelectorAll('td, th, [data-cell], .cell, span[data-key]').forEach((cell, c) => {
            const key = (cell.getAttribute('data-key') || cell.getAttribute('data-label') || (cell as HTMLElement).className || `Col${c}`).toString().trim();
            if (key) row[key] = (cell.textContent || '').trim();
          });
          if (Object.keys(row).length === 0) row['content'] = (rowEl.textContent || '').trim();
          return row;
        }).filter((r) => Object.keys(r).length > 0);
        const headers = rows[0] ? Object.keys(rows[0]) : [];
        const preview = rows.slice(0, 3).map((r) => JSON.stringify(r)).join(' | ');
        return { id, type: 'grid', selector: '', headers, rows, preview };
      })
    );
    for (let i = 0; i < lists.length; i++) {
      lists[i].selector = `[data-table]:nth-of-type(${i + 1}), .data-table:nth-of-type(${i + 1}), [role="grid"]:nth-of-type(${i + 1})`;
      results.push(lists[i]);
    }

    await browser.close();
  } catch (e) {
    await browser.close().catch(() => {});
    throw e;
  }
  return results;
}

function isXPath(selector: string): boolean {
  const s = selector.trim();
  return s.startsWith('/') || s.startsWith('(.') || s.startsWith('xpath=');
}

export async function extractWithConfig(url: string, config: ExtractionConfig): Promise<Record<string, unknown>[]> {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);

    const allRows: Record<string, unknown>[] = [];

    if (config.fields?.length) {
      const rowSelector = config.rowSelector?.trim();
      const locatorOptions = (sel: string) => (isXPath(sel) ? `xpath=${sel}` : sel);

      if (rowSelector) {
        const rowLoc = page.locator(isXPath(rowSelector) ? `xpath=${rowSelector}` : rowSelector);
        const count = await rowLoc.count();
        for (let i = 0; i < count; i++) {
          const rowEl = rowLoc.nth(i);
          const row: Record<string, unknown> = {};
          for (const { selector, variable } of config.fields) {
            const loc = rowEl.locator(locatorOptions(selector)).first();
            const text = await loc.textContent().catch(() => null);
            row[variable] = (text ?? '').trim();
          }
          allRows.push(row);
        }
      } else {
        const row: Record<string, unknown> = {};
        for (const { selector, variable } of config.fields) {
          const loc = page.locator(locatorOptions(selector)).first();
          const text = await loc.textContent().catch(() => null);
          row[variable] = (text ?? '').trim();
        }
        allRows.push(row);
      }
    }

    if (config.tables?.length) {
      for (const table of config.tables) {
        const rows = await page.$$eval(
          table.selector || 'table',
          (elements, cfg) => {
            const el = elements[0];
            if (!el) return [];
            const rows: Record<string, unknown>[] = [];
            const trs = el.querySelectorAll('tr');
            const ths = el.querySelectorAll('th');
            const headers: string[] = Array.from(ths).map((t) => (t.textContent || '').trim());
            if (headers.length === 0 && trs[0]) {
              trs[0].querySelectorAll('td, th').forEach((c) => headers.push((c.textContent || '').trim()));
            }
            const start = headers.length && trs[0]?.querySelector('th') ? 1 : 0;
            for (let i = start; i < trs.length; i++) {
              const row: Record<string, unknown> = {};
              trs[i].querySelectorAll('td, th').forEach((cell, j) => {
                const srcKey = headers[j] || `Col${j}`;
                const mapping = cfg.columns.find((c: { source: string }) => c.source === srcKey);
                const key = mapping ? mapping.target : srcKey;
                row[key] = (cell.textContent || '').trim();
              });
              rows.push(row);
            }
            return rows;
          },
          table
        );
        rows.forEach((r) => allRows.push(r));
      }
    }

    await browser.close();
    return allRows;
  } catch (e) {
    await browser.close().catch(() => {});
    throw e;
  }
}
