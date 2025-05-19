import { AccountId, PrivateKey } from '@hashgraph/sdk';
import {
  HCS10Client,
  AgentBuilder,
  AIAgentCapability,
} from '@hashgraphonline/standards-sdk';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

async function main() {
  if (
    !process.env.OPERATOR_HEDERA_ACCOUNT_ID ||
    !process.env.OPERATOR_HEDERA_PRIVATE_KEY
  ) {
    throw new Error(
      'OPERATOR_HEDERA_ACCOUNT_ID | OPERATOR_HEDERA_PRIVATE_KEY is not set in the environment variables'
    );
  }


  // Basic configuration
  const client = new HCS10Client({
    network: 'testnet', // Network: 'testnet' or 'mainnet'
    operatorId: process.env.OPERATOR_HEDERA_ACCOUNT_ID, // Your Hedera account ID
    operatorPrivateKey: process.env.OPERATOR_HEDERA_PRIVATE_KEY, // Your Hedera private key
    logLevel: 'info', // Optional: 'debug', 'info', 'warn', 'error'
    prettyPrint: true, // Optional: prettier console output
    guardedRegistryBaseUrl: 'https://moonscape.tech', // Optional: registry URL
    feeAmount: 10, // Optional: default fee in HBAR
  });

  // Create a standard agent
  const agentBuilder = new AgentBuilder()
    .setName('Contract Auditor')
    .setCapabilities([
      AIAgentCapability.TEXT_GENERATION,
      AIAgentCapability.SMART_CONTRACT_AUDIT,
    ])
    .setBio('Desgined to audit smart contracts')
    .setNetwork('testnet') // Must match client network
    .setMetadata({
      type: 'autonomous',
      creator: 'SpaceDev',
      properties: {
        specialization: 'contract auditing',
        supportedLanguages: ['en'],
      },
    })


  // Fetch and convert image to Buffer
  const imageUrl = 'https://media.licdn.com/dms/image/v2/D4E0BAQFEtx2q13hH5Q/company-logo_200_200/company-logo_200_200/0/1719255594120/spacedev_uy_logo?e=2147483647&v=beta&t=yRvy2Xp-mLzeIhVVqAW3pQ8fZIiU3xXk6yJGoJRxfSM';
  const imageResponse = await fetch(imageUrl);
  const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

  agentBuilder.setProfilePicture(imageBuffer, 'image/jpeg');

  // Create and register the agent
  const result = await client.createAndRegisterAgent(agentBuilder, {
    progressCallback: (progress) => {
      console.log(`${progress.stage}: ${progress.progressPercent}%`);
    },
  });

  if (result?.success) {
    console.log(`Agent created: ${result.metadata?.accountId}`);
    console.log(`Inbound Topic: ${result.metadata?.inboundTopicId}`);
    console.log(`Outbound Topic: ${result.metadata?.outboundTopicId}`);
    console.log(`Profile Topic: ${result.metadata?.profileTopicId}`);

    // Store these securely - they're needed to operate the agent
    console.log(`Agent private key: ${result.metadata?.privateKey}`);
  } else {
    throw new Error(result?.error);
  }
}

main()
  .then(() => {
    console.log('Agent registered successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
