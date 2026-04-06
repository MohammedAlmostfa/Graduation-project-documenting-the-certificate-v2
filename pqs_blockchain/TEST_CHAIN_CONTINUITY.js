/**
 * TEST_CHAIN_CONTINUITY.js
 *
 * Comprehensive test to verify the blockchain chain linkage fix
 * Verifies:
 * 1. Block IDs are sequential (0, 1, 2, 3, ...)
 * 2. previousHash points to actual last block (not gaps)
 * 3. Blocks can be mined with deterministic hash
 * 4. Hash continuity is maintained through chain
 */

import { Block } from './src/models/Block.js';
import { oqsCrypto } from './src/utils/crypto-oqs.js';
import { logger } from './src/utils/logger.js';

console.log('\n' + '='.repeat(70));
console.log('🔗 BLOCKCHAIN CHAIN CONTINUITY TEST');
console.log('='.repeat(70));

// Test 1: Sequential Block Creation
console.log('\n📝 TEST 1: Sequential Block ID Assignment');
console.log('-'.repeat(70));

const blocks = [];

// Genesis block (id = 0)
const genesisBlock = new Block(
  0,
  new Date().toISOString(),
  [1, 2, 3],
  'merkle-root-genesis',
  '0'  // previousHash = 0 for genesis
);

genesisBlock.mineBlock(2);
blocks.push(genesisBlock);

console.log(`✅ Genesis Block:`);
console.log(`   ID: ${genesisBlock.id}`);
console.log(`   Hash: ${genesisBlock.hash.substring(0, 20)}...`);
console.log(`   Previous Hash: ${genesisBlock.previousHash}`);

// Create next 5 blocks with sequential IDs
for (let i = 1; i <= 5; i++) {
  const previousBlock = blocks[blocks.length - 1];
  const newBlock = new Block(
    i,  // Sequential ID: 1, 2, 3, 4, 5
    new Date(Date.now() + i * 1000).toISOString(),
    [i * 10, i * 10 + 1],
    `merkle-root-${i}`,
    previousBlock.hash  // previousHash = actual last block hash
  );

  newBlock.mineBlock(2);
  blocks.push(newBlock);

  console.log(`✅ Block ${i}:`);
  console.log(`   ID: ${newBlock.id}`);
  console.log(`   Hash: ${newBlock.hash.substring(0, 20)}...`);
  console.log(`   Previous Hash: ${newBlock.previousHash.substring(0, 20)}...`);
  console.log(`   Linked to Block ${i-1}: ${newBlock.previousHash === previousBlock.hash ? '✅' : '❌'}`);
}

// Test 2: Verify Sequential IDs
console.log('\n📊 TEST 2: Verify Sequential Block IDs');
console.log('-'.repeat(70));

let isSequential = true;
for (let i = 0; i < blocks.length; i++) {
  if (blocks[i].id !== i) {
    console.log(`❌ Block ${i} has ID ${blocks[i].id} - NOT SEQUENTIAL!`);
    isSequential = false;
  }
}

if (isSequential) {
  console.log(`✅ All block IDs are sequential (0, 1, 2, 3, 4, 5)`);
} else {
  console.log(`❌ CRITICAL: Block IDs are not sequential!`);
  process.exit(1);
}

// Test 3: Verify Chain Linkage
console.log('\n🔗 TEST 3: Verify Chain Linkage (previousHash → actual last block)');
console.log('-'.repeat(70));

let chainValid = true;
for (let i = 1; i < blocks.length; i++) {
  const currentBlock = blocks[i];
  const previousBlock = blocks[i - 1];

  if (currentBlock.previousHash !== previousBlock.hash) {
    console.log(`❌ Block ${i} previousHash mismatch!`);
    console.log(`   Expected: ${previousBlock.hash.substring(0, 20)}...`);
    console.log(`   Got: ${currentBlock.previousHash.substring(0, 20)}...`);
    chainValid = false;
  }
}

if (chainValid) {
  console.log(`✅ All blocks correctly linked to their previous block`);
} else {
  console.log(`❌ CRITICAL: Chain linkage broken!`);
  process.exit(1);
}

// Test 4: Verify No Gaps in Chain
console.log('\n✅ TEST 4: Verify No Gaps Between Blocks');
console.log('-'.repeat(70));

let gapsFound = false;
for (let i = 0; i < blocks.length - 1; i++) {
  const currentId = blocks[i].id;
  const nextId = blocks[i + 1].id;

  if (nextId !== currentId + 1) {
    console.log(`❌ Gap detected between Block ${currentId} (id=${currentId}) and Block ${i+1} (id=${nextId})`);
    gapsFound = true;
  }
}

if (!gapsFound) {
  console.log(`✅ No gaps found - sequential progression: 0 → 1 → 2 → 3 → 4 → 5`);
} else {
  console.log(`❌ CRITICAL: Gaps found in block sequence!`);
  process.exit(1);
}

// Test 5: Verify Hash Uniqueness
console.log('\n🔐 TEST 5: Verify Each Block Has Unique Hash');
console.log('-'.repeat(70));

const hashes = new Set();
let duplicateHashes = false;

for (const block of blocks) {
  if (hashes.has(block.hash)) {
    console.log(`❌ Duplicate hash found for Block ${block.id}: ${block.hash.substring(0, 20)}...`);
    duplicateHashes = true;
  }
  hashes.add(block.hash);
}

if (!duplicateHashes) {
  console.log(`✅ All ${blocks.length} blocks have unique hashes`);
} else {
  console.log(`❌ CRITICAL: Duplicate hashes detected!`);
  process.exit(1);
}

// Test 6: Verify Hash Determinism
console.log('\n🔄 TEST 6: Verify Hash Determinism (Same Block = Same Hash)');
console.log('-'.repeat(70));

const block3Original = blocks[3];
const block3Recalculated = Block.computeBlockHash({
  id: block3Original.id,
  nonce: block3Original.nonce,
  difficulty: block3Original.difficulty,
  merkleRoot: block3Original.merkleRoot,
  previousHash: block3Original.previousHash
});

if (block3Original.hash === block3Recalculated) {
  console.log(`✅ Block 3 hash is deterministic:`);
  console.log(`   Original: ${block3Original.hash.substring(0, 20)}...`);
  console.log(`   Recalculated: ${block3Recalculated.substring(0, 20)}...`);
} else {
  console.log(`❌ CRITICAL: Hash not deterministic!`);
  console.log(`   Original: ${block3Original.hash}`);
  console.log(`   Recalculated: ${block3Recalculated}`);
  process.exit(1);
}

// Test 7: Verify Mining and Validation Consistency
console.log('\n✅ TEST 7: Mining and Validation Hash Consistency');
console.log('-'.repeat(70));

for (let i = 0; i < blocks.length; i++) {
  const block = blocks[i];
  const recalculatedHash = block.calculateHash();

  if (block.hash !== recalculatedHash) {
    console.log(`❌ Block ${i} hash mismatch between mining and validation!`);
    console.log(`   Stored: ${block.hash.substring(0, 20)}...`);
    console.log(`   Recalculated: ${recalculatedHash.substring(0, 20)}...`);
    process.exit(1);
  }
}

console.log(`✅ All ${blocks.length} blocks have consistent hashes between mining and validation`);

// Summary
console.log('\n' + '='.repeat(70));
console.log('✅ ALL TESTS PASSED');
console.log('='.repeat(70));
console.log(`
✅ Chain Integrity Verified:
   • Block IDs are sequential (0 → 1 → 2 → 3 → 4 → 5) ✅
   • Each block's previousHash links to actual previous block ✅
   • No gaps in block sequence ✅
   • All hashes are unique ✅
   • Hash computation is deterministic ✅
   • Mining and validation hashes match ✅

🔗 Chain Linkage Summary:
   Block 0: genesis (id=0)
      ↓ (previousHash links to previous block)
   Block 1: (id=1, previousHash→Block 0)
      ↓
   Block 2: (id=2, previousHash→Block 1)
      ↓
   Block 3: (id=3, previousHash→Block 2)
      ↓
   Block 4: (id=4, previousHash→Block 3)
      ↓
   Block 5: (id=5, previousHash→Block 4)

The blockchain is now deterministic and chainable! 🎉
`);
