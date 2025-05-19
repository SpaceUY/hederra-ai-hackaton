import { PrivateKey } from '@hashgraph/sdk';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  if (!process.env.AGENT_HEDERA_PRIVATE_KEY) throw new Error('AGENT_HEDERA_PRIVATE_KEY is not set in the environment variables');
  const agentPrivateKey = PrivateKey.fromStringDer(process.env.AGENT_HEDERA_PRIVATE_KEY);

  console.log(`Public key: ${agentPrivateKey.publicKey}`);
}

main();
