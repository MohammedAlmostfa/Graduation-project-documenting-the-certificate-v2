// Blockchain system configuration

export const blockchainConfig = {
  difficulty: parseInt(process.env.BLOCKCHAIN_DIFFICULTY) || 4,
  miningReward: parseInt(process.env.BLOCKCHAIN_MINING_REWARD) || 100,
  blockTime: parseInt(process.env.BLOCKCHAIN_BLOCK_TIME) || 30000,
  maxTransactionsPerBlock: parseInt(process.env.BLOCKCHAIN_MAX_TRANSACTIONS) || 10,
  version: process.env.BLOCKCHAIN_VERSION || '1.0.0',
  genesisBlock: {
    index: 0,
    timestamp: process.env.BLOCKCHAIN_GENESIS_TIMESTAMP || '2024-01-01T00:00:00.000Z',
    certificateIds: [],
    previousHash: process.env.BLOCKCHAIN_GENESIS_PREVIOUS_HASH || '0',
    nonce: 0,
    hash: process.env.BLOCKCHAIN_GENESIS_HASH || '0'.repeat(64)
  }
};
