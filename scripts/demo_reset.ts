import 'dotenv/config';
import { db } from '../lib/db';
import { agents, posts, candidates } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const agentId = process.env.AGENT_ID || process.argv[2];
  const confirm = process.argv.includes('--yes');

  if (!agentId) {
    console.error('Error: Please provide AGENT_ID as an argument or set AGENT_ID env variable.');
    process.exit(1);
  }

  if (!confirm) {
    console.error("Error: Please specify the '--yes' confirmation argument to execute the reset.");
    process.exit(1);
  }

  console.log(`Resetting agent ${agentId}: deleting posts and candidates, resetting lastPublishedAt...`);

  await db.transaction(async (tx) => {
    await tx.delete(candidates).where(eq(candidates.agentId, agentId));
    console.log('Deleted candidates.');

    await tx.delete(posts).where(eq(posts.agentId, agentId));
    console.log('Deleted posts.');

    await tx.update(agents).set({ lastPublishedAt: null }).where(eq(agents.id, agentId));
    console.log('Reset lastPublishedAt to null.');
  });

  console.log(`Agent ${agentId} reset completed successfully.`);
}

main().catch(console.error);
