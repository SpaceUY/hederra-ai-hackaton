import {
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  ModelClass,
  type State,
  generateText,
  type Action,
  elizaLogger
} from "@elizaos/core";
import { TopicId, TopicMessageSubmitTransaction, Client, AccountId, PrivateKey } from "@hashgraph/sdk";
import { HederaProvider } from "../../providers/client";

const getAuditSummaryPrompt = (contract: string) => {
  return `
  You are a specialist in smart contracts, specialized in security and solidity.
  Audit the following smart contract and find any possible vulnerability.

  Smart contract: \`\`\`${contract} \`\`\`

  Your response must be ONLY a valid JSON object in the following format with no additional text, comments, markdown formatting, or explanation outside the JSON:
  {
    "summary": "brief summary of the vulnerabilities",
    "observations": [
      "vulnerability 1",
      "vulnerability 2",
      "vulnerability 3"
    ],
    "score": 85
  }

  The JSON object must include:
  - A "summary" explaining the possible issues with the contract (concise explanation)
  - An "observations" array with up to 5 points of the most important vulnerabilities and possible fixes
  - A "score" from 1 to 100 (security: 0-50, code quality: 0-25, gas efficiency: 0-25), must be always a number

  If the contract is not valid solidity, return only: {"summary": "explanation of why the contract is invalid"}

  CRITICAL: Return ONLY the raw JSON with no other text. Your entire response should be valid for direct use with JSON.parse().
  `;
}

const getGistURLPromptTemplate = (message: string) => `
  Return in a single line the url of the gist file included in the following message:
  If there is no gist file return null.

  Example response for: "Audit this smart contract: https://gist.githubusercontent.com/santgr11/ba3c36d841d5fc0982f925589b5e148e/raw/adede641c055435a21fc1d71c8adf5a0e6fd437b/counter.sol":
  https://gist.githubusercontent.com/santgr11/ba3c36d841d5fc0982f925589b5e148e/raw/adede641c055435a21fc1d71c8adf5a0e6fd437b/counter.sol

  Example response for: "Audit this smart contract: google.com":
  no response

  ${message}
`

const getAgentReturnResponse = (summary: string, observations: string[], score: number, auditPublishedAt: string) => `
${summary}

${observations.length > 0 ? `Observations:
  ${observations.map(observation => `- ${observation}`).join("\n")}` : ""}

${score ? `Score: ${score}` : ""}

${auditPublishedAt ? `Audit score published: ${auditPublishedAt}` : "Audit score not published"}
`

export const auditContractAction: Action = {
  name: "AUDIT_CONTRACT",
  similes: [
    "CHECK_CONTRACT",
    "INSPECT_CONTRACT"
  ],
  description: "Audits an smart contract",
  validate: async (_runtime: IAgentRuntime, memory: Memory, _state: State) => {

    return memory.content.text.includes(".sol") || memory.content.text.includes("gist.githubusercontent.com")
  },

  handler: async (runtime: IAgentRuntime, memory: Memory, _state?: State, _options?, callback?: HandlerCallback) => {
    if (callback) {
      const gistURL = await generateText({
        runtime,
        context: getGistURLPromptTemplate(memory.content.text),
        modelClass: ModelClass.SMALL
      })

      if (!gistURL.includes("https://gist.githubusercontent.com")) {
        return callback({
          text: "Thats not a valid gist URL"
        }, [])
      }

      const contract = await fetch(gistURL).then(res => res.text())

      const audit = await generateText({
        runtime,
        context: getAuditSummaryPrompt(contract),
        modelClass: ModelClass.SMALL
      })

      elizaLogger.debug(audit);

      const { summary, observations, score } = JSON.parse(audit);

      let auditPublishedAt;
      const hederaAuditTopicId = runtime.getSetting("HEDERA_AUDITS_TOPIC_ID");
      if (score && hederaAuditTopicId) {
        try {
          const agentAccountIdString = runtime.getSetting("HEDERA_ACCOUNT_ID");
          if (!agentAccountIdString) {
            throw new Error("HEDERA_ACCOUNT_ID is not set in the environment variables");
          }

          const agentPrivateKeyString = runtime.getSetting("HEDERA_PRIVATE_KEY");
          if (!agentPrivateKeyString) {
            throw new Error("HEDERA_PRIVATE_KEY is not set in the environment variables");
          }

          const agentAccountId = AccountId.fromString(agentAccountIdString);
          const agentPrivateKey = PrivateKey.fromStringDer(agentPrivateKeyString);

          const newClient = Client.forTestnet().setOperator(
            agentAccountId,
            agentPrivateKey
          );

          const submitMessageTx = new TopicMessageSubmitTransaction()
            .setTopicId(TopicId.fromString(hederaAuditTopicId))
            .setMessage(`Contract at ${gistURL} audited with score ${score}`)
            .freezeWith(newClient)

          const signedSubmitMessageTx = await submitMessageTx.sign(agentPrivateKey);

          const executeSubmitMessageTx = await signedSubmitMessageTx.execute(newClient);
          const submitMessageReceipt = await executeSubmitMessageTx.getReceipt(
            newClient
          );

          elizaLogger.debug(`Message audit submitted successfully to topic ${hederaAuditTopicId}`);

          auditPublishedAt = `https://hashscan.io/testnet/transaction/${signedSubmitMessageTx.transactionId}`;
        } catch (error) {
          elizaLogger.error(`Error submitting message to topic ${hederaAuditTopicId}: ${error}`);
        }
      }

      callback({
        text: getAgentReturnResponse(summary, observations, score, auditPublishedAt)
      }, [])
    }
  },
  examples: [[
    {
      user: "{{user1}}",
      content: {
        text: "Audit this smart contract: {{link to github gist}}",
        action: "AUDIT_CONTRACT"
      }
    },
    {
      user: "{{agentName}}",
      content: {
        text: "Ok {{user1}}, I'm auditing the contract",
        action: "AUDIT_CONTRACT"
      }
    }
  ],
  [
    {
      user: "{{user1}}",
      content: {
        text: "Audit this contract: {{solidity smart contract code}}",
        action: "AUDIT_CONTRACT"
      }
    },
    {
      user: "{{agentName}}",
      content: {
        text: "Auditing contract",
        action: "AUDIT_CONTRACT"
      }
    }
  ],
  [
    {
      user: "{{user1}}",
      content: {
        text: "What do you think of this contract: {{solidity smart contract code}}",
        action: "AUDIT_CONTRACT"
      }
    },
    {
      user: "{{agentName}}",
      content: {
        text: "Auditing contract",
        action: "AUDIT_CONTRACT"
      }
    }
  ],
  [
    {
      user: "{{user1}}",
      content: {
        text: "Review this contract: {{solidity smart contract code}}",
        action: "AUDIT_CONTRACT"
      }
    },
    {
      user: "{{agentName}}",
      content: {
        text: "Auditing contract",
        action: "AUDIT_CONTRACT"
      }
    }
  ]]
}

// TODO: Implement audits from verified contracts on hashscan
export const auditHederaDeployedContractAcion: Action = {
  name: "AUDIT_HEDERA_CONTRACT",
  description: "Audits an smart contract deployed in the Hedera blockchain.",
  similes: [
    "REVIEW_HEDERA_CONTRACT",
    "INSPECT_HEDERA_CONTRACT"
  ],
  validate: async (_runtime: IAgentRuntime) => { return true },
  handler: async (
    _runtime: IAgentRuntime,
    _message: Memory,
    _state: State,
    _options: { [key: string]: unknown },
    _callback?: HandlerCallback
  ) => { },
  examples: []
}
