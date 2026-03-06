// Blockchain system configuration

export const blockchainConfig = {
  difficulty: 4,
  miningReward: 100,
  blockTime: 30000,
  maxTransactionsPerBlock: 10,
  version: '1.0.0',
  genesisBlock: {
    index: 0,
    timestamp: '2024-01-01T00:00:00.000Z',
    certificateIds: [],
    previousHash: '0',
    nonce: 0,
    hash: '0'.repeat(64)
  }
};
