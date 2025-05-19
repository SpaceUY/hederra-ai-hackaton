import {
  Client,
  PrivateKey,
  AccountId,
  CustomFixedFee,
  TopicCreateTransaction,
  PublicKey,
} from '@hashgraph/sdk';

import dotenv from 'dotenv';

dotenv.config();

async function main() {
  if (!process.env.AGENT_HEDERA_ACCOUNT_ID) throw new Error('AGENT_HEDERA_ACCOUNT_ID is not set in the environment variables');
  if (!process.env.AGENT_HEDERA_PRIVATE_KEY) throw new Error('AGENT_HEDERA_PRIVATE_KEY is not set in the environment variables');
  if (!process.env.OPERATOR_HEDERA_ACCOUNT_ID) throw new Error('OPERATOR_HEDERA_ACCOUNT_ID is not set in the environment variables');
  if (!process.env.OPERATOR_HEDERA_PRIVATE_KEY) throw new Error('OPERATOR_HEDERA_PRIVATE_KEY is not set in the environment variables');

  console.log('Setting up custom fee configuration');

  const operatorPrivateKey = PrivateKey.fromStringDer(process.env.OPERATOR_HEDERA_PRIVATE_KEY);
  const operatorAccountId = AccountId.fromString(process.env.OPERATOR_HEDERA_ACCOUNT_ID);

  const agentPrivateKey = PrivateKey.fromStringDer(process.env.AGENT_HEDERA_PRIVATE_KEY);
  const agentAccountId = AccountId.fromString(process.env.AGENT_HEDERA_ACCOUNT_ID);

  const newClient = Client.forTestnet().setOperator(
    operatorAccountId,
    operatorPrivateKey
  );

  // Create topic to interact with the agent
  const customFee = new CustomFixedFee({
    feeCollectorAccountId: operatorAccountId,
    amount: 10
  });

  const agentTopicCreateTx = new TopicCreateTransaction()
    .setCustomFees([customFee])
    .setFeeExemptKeys(
      [
        agentPrivateKey.publicKey
      ]
    ).setAdminKey(
      operatorPrivateKey.publicKey
    )

  const executeAgentTopicCreateTx = await agentTopicCreateTx.execute(newClient)
  const agentTopicCreateReceipt = await executeAgentTopicCreateTx.getReceipt(newClient)
  const agentTopicId = agentTopicCreateReceipt.topicId

  console.log(`Agent topic created successfully with ID: ${agentTopicId}`)

  // Create topic to publish audit scores
  const auditsTopicCreateTx = new TopicCreateTransaction()
    .setSubmitKey(
      agentPrivateKey.publicKey
    )
    .setAdminKey(
      operatorPrivateKey.publicKey
    )

  const executeAuditsTopicCreateTx = await auditsTopicCreateTx.execute(newClient)
  const auditsTopicCreateReceipt = await executeAuditsTopicCreateTx.getReceipt(newClient)
  const auditsTopicId = auditsTopicCreateReceipt.topicId

  console.log(`Audits topic created succesfully with ID: ${auditsTopicId}`)
}

main()
  .then(() => {
    console.log('Topics created successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
