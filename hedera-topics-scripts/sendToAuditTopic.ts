import { Client, TopicId, TopicMessageSubmitTransaction, AccountId, PrivateKey } from "@hashgraph/sdk";

import dotenv from 'dotenv';

dotenv.config();

async function main() {
  if (!process.env.AGENT_HEDERA_ACCOUNT_ID)
    throw new Error('AGENT_HEDERA_ACCOUNT_ID is not set in the environment variables');
  const agentAccountId = AccountId.fromString(process.env.AGENT_HEDERA_ACCOUNT_ID);

  if (!process.env.AUDIT_TOPIC_ID)
    throw new Error('AUDIT_TOPIC_ID is not set in the environment variables');
  const auditTopicId = TopicId.fromString(process.env.AUDIT_TOPIC_ID);

  if (!process.env.AGENT_HEDERA_PRIVATE_KEY)
    throw new Error('AGENT_HEDERA_PRIVATE_KEY is not set in the environment variables');
  const agentPrivateKey = PrivateKey.fromStringDer(process.env.AGENT_HEDERA_PRIVATE_KEY);

  const newClient = Client.forTestnet().setOperator(
    agentAccountId,
    agentPrivateKey
  );

  const submitMessageTx = new TopicMessageSubmitTransaction()
    .setTopicId(auditTopicId)
    .setMessage(`Tets message`)
    .freezeWith(newClient);


  const signedSubmitMessageTx = await submitMessageTx.sign(agentPrivateKey);

  const executeSubmitMessageTx = await signedSubmitMessageTx.execute(newClient);
  const submitMessageReceipt = await executeSubmitMessageTx.getReceipt(
    newClient
  );

  console.log(`Message submitted successfully to topic ${auditTopicId}`);
  console.log(`Transaction ID: ${signedSubmitMessageTx.transactionId}`);
  console.log(`Transaction ID: ${executeSubmitMessageTx.transactionId}`);

}

main().then(() => {
  console.log('Message submitted successfully to topic');
  process.exit(0);
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
