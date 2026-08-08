import 'dotenv/config';
import { db } from '../lib/db';
import { ticks } from '../lib/db/schema';
import { sql, desc } from 'drizzle-orm';
import * as breeth from '../lib/breeth';
import { fromHackerNews, fromArxiv } from '../lib/discovery';

async function main() {
  console.log('--- WIRING CHECK IN PROGRESS ---\n');

  const startTime = Date.now();

  // 1. Postgres check
  const postgresCheck = async () => {
    try {
      await db.execute(sql`SELECT 1`);
      return { ok: true, detail: 'Connected successfully' };
    } catch (err: any) {
      return { ok: false, detail: `Connection failed: ${err.message || err}` };
    }
  };

  // 2. OpenAI check
  const openaiCheck = async () => {
    const key = process.env.OPENAI_API_KEY;
    if (key && key.trim().startsWith('sk-')) {
      return { ok: true, detail: 'API Key configured' };
    }
    return { ok: false, detail: 'API Key missing or invalid' };
  };

  // 3. Breeth check
  const breethCheck = async () => {
    const key = process.env.BREETH_API_KEY;
    if (!key) {
      return { ok: false, detail: 'API Key missing in environment' };
    }
    try {
      const result = await breeth.search('test');
      if (result !== null) {
        return { ok: true, detail: `Reachable (returned ${result.length} matches)` };
      }
      return { ok: false, detail: 'Unreachable / Timeout / Error response' };
    } catch (err: any) {
      return { ok: false, detail: `Error: ${err.message || err}` };
    }
  };

  // 4. Discovery check
  const discoveryCheck = async () => {
    try {
      const [hn, arxiv] = await Promise.all([
        fromHackerNews(),
        fromArxiv()
      ]);
      return {
        ok: true,
        detail: `HackerNews: ${hn.length} topics | arXiv: ${arxiv.length} topics`
      };
    } catch (err: any) {
      return { ok: false, detail: `Failed to fetch: ${err.message || err}` };
    }
  };

  // 5. Last tick check
  const lastTickCheck = async () => {
    try {
      const tickRows = await db
        .select()
        .from(ticks)
        .orderBy(desc(ticks.ranAt))
        .limit(1);

      if (tickRows.length === 0) {
        return { ok: true, detail: 'No ticks recorded yet' };
      }

      const lastTick = tickRows[0];
      const ageMs = Date.now() - lastTick.ranAt.getTime();
      const ageMin = Math.floor(ageMs / 1000 / 60);
      return {
        ok: true,
        detail: `Last tick: ${lastTick.action} at ${lastTick.ranAt.toISOString()} (${ageMin} mins ago)`
      };
    } catch (err: any) {
      return { ok: false, detail: `Failed to query: ${err.message || err}` };
    }
  };

  // Execute all checks in parallel
  const [pg, oa, br, dc, lt] = await Promise.all([
    postgresCheck(),
    openaiCheck(),
    breethCheck(),
    discoveryCheck(),
    lastTickCheck()
  ]);

  let successCount = 0;
  const printStatus = (label: string, res: { ok: boolean; detail: string }) => {
    if (res.ok) {
      successCount++;
      console.log(`[✓ ready]   ${label}: ${res.detail}`);
    } else {
      console.log(`[✗ missing] ${res.detail.includes('missing') ? ' ' : ''}${label}: ${res.detail}`);
    }
  };

  printStatus('PostgreSQL', pg);
  printStatus('OpenAI    ', oa);
  printStatus('Breeth    ', br);
  printStatus('Discovery ', dc);
  printStatus('Last Tick ', lt);

  const totalChecks = 5;
  const percentage = Math.round((successCount / totalChecks) * 100);
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\nOverall Readiness: ${percentage}% (${successCount}/${totalChecks} checks ready)`);
  console.log(`Finished in ${duration} seconds.`);
}

main().catch(console.error);
