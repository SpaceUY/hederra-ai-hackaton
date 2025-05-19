import {
  Client,
  TopicMessageSubmitTransaction,
  TopicId,
  PrivateKey,
  AccountId
} from '@hashgraph/sdk';

import dotenv from 'dotenv';

dotenv.config();

const message = () => {
  return `
  Audit this contract https://gist.githubusercontent.com/santgr11/58606b36571cd07a649c222dbd662d7d/raw/b75def233d4ae7de408b3910e65d5121daa1fb35/tme-lock.sol
`.trim();
};

async function main() {
  if (!process.env.CHAT_TOPIC_ID)
    throw new Error('CHAT_TOPIC_ID is not set in the environment variables');

  if (!process.env.USER_HEDERA_PRIVATE_KEY)
    throw new Error('USER_HEDERA_PRIVATE_KEY is not set in the environment variables');

  if (!process.env.USER_HEDERA_ACCOUNT_ID)
    throw new Error('USER_HEDERA_ACCOUNT_ID is not set in the environment variables');

  console.log('Setting up transaction');
  const submitMessageTx = new TopicMessageSubmitTransaction()
    .setTopicId(TopicId.fromString(process.env.CHAT_TOPIC_ID))
    .setMessage(message());

  console.log('Creating client');
  const newClient = Client.forTestnet().setOperator(
    AccountId.fromString(process.env.USER_HEDERA_ACCOUNT_ID),
    PrivateKey.fromStringECDSA(process.env.USER_HEDERA_PRIVATE_KEY)
  );
  console.log('Executing tx...');
  const executeSubmitMessageTx = await submitMessageTx.execute(newClient);
  console.log('Waiting for receipt...');
  const submitMessageReceipt = await executeSubmitMessageTx.getReceipt(
    newClient
  );
  console.log(`Message "${message()}" submitted successfully to topic`);
  console.log(`Transaction status: ${submitMessageReceipt.status}`);
}

main()
  .then(() => {
    console.log('Message submitted successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
