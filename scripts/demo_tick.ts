import 'dotenv/config';
import { runTick } from '../lib/tick';

async function main() {
  const agentId = process.env.AGENT_ID || process.argv[2];
  if (!agentId) {
    console.error('Error: Please provide AGENT_ID as an argument or set the AGENT_ID env variable.');
    process.exit(1);
  }

  console.log(`Starting forced tick for Agent ID: ${agentId}...`);
  const result = await runTick(agentId, { force: true });
  console.log('Tick Result:', JSON.stringify(result, null, 2));
}

main().catch(console.error);
