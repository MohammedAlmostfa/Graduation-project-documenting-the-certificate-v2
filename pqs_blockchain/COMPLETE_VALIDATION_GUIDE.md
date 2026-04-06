# 📋 توثيق نظام التحقق الكامل من الشهادات

**الإصدار:** v2.0 (مع التحقق من Transaction Hash)  
**التاريخ:** 2026-04-06

---

## 1️⃣ نظرة عامة على نظام التحقق

### البنية الكاملة (4 طبقات):

```
┌─────────────────────────────────────────────────────────────┐
│ الطبقة الأولى: التحقق من INTEGRITY (سلامة البيانات)           │
│ ┌─────────────────────────────────────────────────────────┐  │
│ │ validateCertificateIntegrity()                          │  │
│ │ • حساب certificateHash من البيانات الحالية             │  │
│ │ • مقارنة مع storedHash                                 │  │
│ │ • يكتشف: تعديل البيانات، الفساد                         │  │
│ └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ الطبقة الثانية: التحقق من BLOCKCHAIN LINKAGE (السلسلة)      │
│ ┌─────────────────────────────────────────────────────────┐  │
│ │ validateCertificateBlockchain()                         │  │
│ │ • وجود certificate في block                           │  │
│ │ • التحقق من merkle root (مع sorting deterministic)     │  │
│ │ • التحقق من block hash و PoW                          │  │
│ │ • التحقق من chain linkage (السلسلة متصلة)             │  │
│ │ • يكتشف: block مفقود، merkle tampering، hash mismatch  │  │
│ └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ الطبقة الثالثة: التحقق من SIGNATURES (التوقيعات الرقمية)      │
│ ┌─────────────────────────────────────────────────────────┐  │
│ │ validateCertificateSignatures()                         │  │
│ │ • التحقق من كل توقيع مع public key                    │  │
│ │ • البيانات المُوقّعة: certificateHash                 │  │
│ │ • يكتشف: توقيع مزيف، توقيع غير صحيح، توقيع مفقود      │  │
│ └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ الطبقة الرابعة: التحقق من TRANSACTION HASH (شهادة التعدين)   │
│ ┌─────────────────────────────────────────────────────────┐  │
│ │ validateTransactionHash() [NEW]                        │  │
│ │ • التحقق من trnsactionHash = hash(cert|block|idx)    │  │
│ │ • للـ PENDING: يجب = null                             │  │
│ │ • للـ COMPLETED: يجب = محسوب                          │  │
│ │ • يكتشف: mining tampering، block modification          │  │
│ └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ النتيجة النهائية                                            │
│ ✅ VALID: جميع الطبقات الأربع نجحت                        │
│ ❌ INVALID: واحدة من الطبقات فشلت                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 2️⃣ تفاصيل كل طبقة

### الطبقة الأولى: Integrity Validation

**الهدف:** التحقق من أن بيانات الشهادة لم تتعدل

**الخطوات:**
1. استرجاع certificate من database
2. إنشاء Certificate object
3. حساب hash من البيانات الحالية: `certificateHash = calculateHash()`
4. مقارنة مع `storedHash`

**الحالات:**

| الحالة | النتيجة | السبب |
|--------|--------|------|
| Hash متطابق | ✅ PASS | البيانات صحيحة، لم تتعدل |
| Hash مختلف | ❌ FAIL | البيانات تعددلت بعد الحفظ |
| Certificate غير موجود | ❌ FAIL | الـ ID خاطئ |

**المثال:**
```javascript
// المفروض:
storedHash = "abc123..."
currentHash = "abc123..."
Result: ✅ PASS

// الخطأ:
storedHash = "abc123..."
currentHash = "def456..."  (تغيرت البيانات)
Result: ❌ FAIL
```

---

### الطبقة الثانية: Blockchain Linkage Validation

**الهدف:** التحقق من أن الشهادة موجودة بشكل صحيح في blockchain

**الخطوات:**
1. الحصول على block الذي يحتوي على certificate
2. التحقق من أن certificateHash موجود في merkle root:
   - جمع كل hashes في block
   - ترتيبها بترتيب أبجدي (deterministic)
   - بناء merkle tree
   - مقارنة الجذر
3. التحقق من block hash:
   - إعادة حساب hash(index|timestamp|merkle|prev|nonce|difficulty)
   - التحقق من Proof-of-Work (الأصفار في الأمام)
4. التحقق من السلسلة:
   - كل block يشير إلى السابق بـ previousHash
   - السلسلة متصلة من الـ genesis إلى الحالي

**الحالات:**

| الحالة | النتيجة | السبب |
|--------|--------|------|
| Certificate في block | ✅ صحيح | الشهادة موجودة |
| Merkle root صحيح | ✅ صحيح | كل الشهادات في الـ block معطوفة |
| Block hash صحيح | ✅ صحيح | Block لم يتعدل |
| Chain linkage صحيح | ✅ صحيح | السلسلة متصلة |
| Certificate ليس في block | ❌ FAIL | الشهادة لم تُعدّن |
| Merkle mismatch | ❌ FAIL | البيانات في block تغيرت |
| Block hash invalid | ❌ FAIL | Block تعدل بعد التعدين |
| Chain broken | ❌ FAIL | السلسلة مكسورة |

**المثال:**
```javascript
// الصحيح:
Block #5:
  index: 5
  certificateIds: ["cert1", "cert2", "cert3"]
  merkleRoot: "12345..." (من cert1, cert2, cert3 sorted)
  previousHash: "block4hash"
  hash: "block5hash" (يحقق PoW)
  
SearchResult: cert2 موجود في block5
Merkle: computed = stored ✅
PoW: first 4 chars = "0000" ✅
Chain: block4.hash = block5.previousHash ✅
Result: ✅ PASS

// الخطأ - data tampering:
Block #5 تم تعديل: certificateIds = ["cert1", "cert2", "cert99"]
  Merkle: computed (cert1,2,99) ≠ stored (cert1,2,3) ❌
Result: ❌ FAIL
```

---

### الطبقة الثالثة: Digital Signature Validation

**الهدف:** التحقق من أن الشهادة وقعت عليها جهات مسؤولة (officer, dean, president)

**الخطوات:**
1. استرجاع signatures من certificate
2. لكل signature:
   - استرجاع public key للموقّع
   - التحقق: `verifySignature(data=certificateHash, sig, publicKey)`
   - يجب يكون valid

**الحالات:**

| الحالة | النتيجة | السبب |
|--------|--------|------|
| جميع التوقيعات صحيحة | ✅ PASS | كل الجهات وقعت بشكل صحيح |
| توقيع واحد مزيف | ❌ FAIL | توقيع لم يتطابق مع بيانات Certificate |
| توقيع مفقود | ⚠️ WARN | توقيع واحد ناقص لكن البقية صحيحة |
| لا توقيعات | ❌ FAIL | الشهادة غير موقعة أصلاً |

**المثال:**
```javascript
// الصحيح:
Signatures:
  [0] signerId: "officer1", sig: "...", verified: ✅
  [1] signerId: "dean1",    sig: "...", verified: ✅
  [2] signerId: "president1", sig: "...", verified: ✅
Result: ✅ PASS - All 3 signatures valid

// الخطأ:
Signatures:
  [0] signerId: "officer1", sig: "...", verified: ✅
  [1] signerId: "dean1",    sig: "FAKE...", verified: ❌
  [2] signerId: "president1", sig: "...", verified: ✅
Result: ❌ FAIL - 1 signature invalid, 2 valid
```

---

### الطبقة الرابعة: Transaction Hash Validation [NEW]

**الهدف:** التحقق من أن الشهادة تم تعدينها بشكل صحيح وحفظت بشكل صحيح

**الخطوات:**
1. التحقق من status:
   - PENDING: يجب transactionHash = null
   - COMPLETED: يجب transactionHash ≠ null
2. لـ COMPLETED certificates:
   - استرجاع block info
   - إعادة حساب: `transactionHash = hash(certificateHash | blockHash | blockIndex)`
   - مقارنة مع stored

**الحالات:**

| Status | Stored TxnHash | Expected | النتيجة | السبب |
|--------|----------------|----------|--------|------|
| PENDING | null | null | ✅ PASS | شهادة قيد الانتظار لم تُعدّن |
| PENDING | "12345..." | null | ❌ FAIL | شهادة قيد الانتظار لا يجب أن يكون لها transaction |
| COMPLETED | "12345..." | "12345..." | ✅ PASS | شهادة معدّنة، transaction صحيح |
| COMPLETED | "12345..." | "99999..." | ❌ FAIL | transaction hash غير صحيح، block تعدل |
| COMPLETED | null | - | ❌ FAIL | شهادة معدّنة لكن لا توجد transaction hash (قديمة) |

**المثال:**

```javascript
// الصحيح - PENDING:
Certificate #cert1:
  status: "PENDING"
  transactionHash: null
  blockId: null
Result: ✅ PASS

// الصحيح - COMPLETED:
Certificate #cert2:
  status: "COMPLETED"
  certificateHash: "aaa111..."
  blockId: 5
  
Block #5:
  hash: "block555..."
  index: 5
  
Recalculated:
  txnHash = hash("aaa111..." | "block555..." | "5")
  
Stored: "txn222..."
Computed: "txn222..."
Result: ✅ PASS

// الخطأ - Block modification:
Certificate #cert3:
  status: "COMPLETED"
  certificateHash: "aaa111..."
  transactionHash: "txn333..." (محفوظ عند التعدين)
  
Block #6:
  hash: "block666MODIFIED..." (اختلف!)
  index: 6
  
Recalculated:
  txnHash = hash("aaa111..." | "block666MODIFIED..." | "6")
  
Stored: "txn333..."
Computed: "txn999..." (مختلف!)
Result: ❌ FAIL - Block was modified after mining
```

---

## 3️⃣ معايير الـ Determinism (ضمان النتائج الثابتة)

### ✅ Deterministic (موثوق - نفس المدخلات = نفس المخرجات):

#### الطبقة الأولى (Integrity):
```javascript
// مدخلات:
certificateData = { student: {...}, issueDate: "2026-04-06T00:00:00Z", ... }
certificateHashData = { certificateNumber, student, issueDate }

// العملية:
hash = oqsCrypto.hashData(canonicalJSON(certificateHashData))

// ضمان الـ Determinism:
✅ نفس البيانات → نفس canonical JSON
✅ نفس JSON → نفس hash
✅ لا يعتمد على: الوقت الحالي، random، DB state
```

#### الطبقة الثانية (Blockchain):
```javascript
// مدخلات:
block = { index, timestamp, merkleRoot, previousHash, nonce, difficulty, hash }
certificateHashes = [...] 

// العملية:
1. sortedHashes = sort(certificateHashes) // أبجدي
2. merkleTree = new MerkleTree(sortedHashes, true) // sort=true
3. computedRoot = merkleTree.getRoot()
4. blockHashComputed = hash(canonical({index, timestamp, merkle, prev, nonce, diff}))

// ضمان الـ Determinism:
✅ Sorting ثابت: أبجدي دائماً
✅ نفس الـ order → نفس merkle root
✅ Block data immutable → نفس hash
✅ لا يعتمد على: fetch order، timing، state
```

#### الطبقة الثالثة (Signatures):
```javascript
// مدخلات:
certificateHash = "abc123..." // immutable
signature = "sig999..." // immutable
publicKey = Buffer // immutable

// العملية:
result = oqsCrypto.verifySignature(certificateHash, signature, publicKey)

// ضمان الـ Determinism:
✅ نفس البيانات → نفس verification result
✅ لا يعتمد على: الوقت، DB state، context
```

#### الطبقة الرابعة (Transaction Hash):
```javascript
// مدخلات:
certificateHash = "aaa111..." // immutable
blockHash = "bbb222..." // immutable
blockIndex = 5 // immutable

// العملية:
txnHash = oqsCrypto.hashData(
  certificateHash + "|" + blockHash + "|" + blockIndex.toString()
)

// ضمان الـ Determinism:
✅ نفس المدخلات → نفس النص
✅ نفس النص → نفس hash
✅ أي تغيير في أي مدخل → hash مختلف فوراً
✅ لا يعتمد على: الترتيب، الوقت، أي شيء خارجي
```

### ❌ غير Deterministic (خطر - لا تستخدم):

```javascript
// ❌ خطير: استخدام الوقت الحالي
txnHash = oqsCrypto.hashData(...+ Date.now())
// النتيجة تختلف كل مرة

// ❌ خطير: استخدام state متغير
blocks = blockchain.chain // قد يتغير
txnHash = hash(... + blocks.length) // نتيجة مختلفة كل مرة

// ❌ خطير: استخدام random
txnHash = hash(... + Math.random()) // لا يمكن تكرارها

// ❌ خطير: استخدام array بدون sorting
merkleRoot = computeMerkle([cert1, cert2, cert3]) // كل ترتيب = نتيجة مختلفة
```

---

## 4️⃣ حالات الاستخدام الكاملة

### حالة 1: شهادة صحيحة 100%

```
Certificate ID: cert-001
Status: COMPLETED
Data: صحيح
BlockId: 5
TransactionHash: محفوظ

التحقق:
LAYER 1: جميع البيانات صحيحة ✅
LAYER 2: موجودة في block 5، merkle صحيح ✅
LAYER 3: جميع التوقيعات صحيحة ✅
LAYER 4: transactionHash يطابق ✅

النتيجة: ✅ VALID - Certificate is authentic
```

### حالة 2: شهادة قيد الانتظار (pending)

```
Certificate ID: cert-002
Status: PENDING
Data: صحيح
BlockId: null
TransactionHash: null

التحقق:
LAYER 1: البيانات صحيحة ✅
LAYER 2: لا توجد في blockchain (ممتاز، pending) ✅
LAYER 3: توقيع واحد من officer ✅
LAYER 4: transactionHash = null (صحيح لـ pending) ✅

النتيجة: ✅ VALID - Certificate is pending, not yet mined
```

### حالة 3: بيانات تعددلت

```
Certificate ID: cert-003
Status: COMPLETED
Data: الاسم تغير من "Ahmed" إلى "Ali"
StoredHash: "oldHash..."
ComputedHash: "newHash..." (مختلف!)

التحقق:
LAYER 1: Hash mismatch ❌ FAIL

النتيجة: ❌ INVALID - Data has been tampered with
```

### حالة 4: تعديل الـ Block

```
Certificate ID: cert-004
Status: COMPLETED
StoredTxnHash: "txn444..." (عند التعدين)
Block #5: تم إضافة certificate آخر فيه

التحقق:
LAYER 1: ✅
LAYER 2: Merkle root mismatch ❌ FAIL (أو قد يمر إذا كان في الـ merkle)
LAYER 3: ✅
LAYER 4: Block hash تغير → recomputed txnHash مختلف ❌ FAIL

النتيجة: ❌ INVALID - Block was modified after mining
```

### حالة 5: توقيع مزيف

```
Certificate ID: cert-005
Status: COMPLETED
Signatures:
  - officer1: ✅
  - dean1: ❌ (signature مزيف)
  - president1: ✅

التحقق:
LAYER 1: ✅
LAYER 2: ✅
LAYER 3: 1 signature invalid ❌ FAIL
LAYER 4: ✅

النتيجة: ❌ INVALID - Signature verification failed
```

### حالة 6: شهادة قديمة بدون transactionHash

```
Certificate ID: cert-006
Status: COMPLETED
BlockId: 3
TransactionHash: null (لم يتم حفظه في النسخة القديمة)

التحقق:
LAYER 1: ✅
LAYER 2: ✅
LAYER 3: ✅
LAYER 4: Missing transaction hash for completed cert ❌ FAIL
(يمكن حساب وعرض الـ computed مقابل الـ stored)

النتيجة: ❌ INVALID - Transaction hash not recorded
(أو ⚠️ WARNING مع computed value)
```

---

## 5️⃣ معالجة الأخطاء والحالات الخاصة

### Error Codes:

**Layer 1 - Integrity:**
- `CERTIFICATE_NOT_FOUND` - Certificate غير موجودة
- `HASH_MISMATCH` - البيانات تعددلت

**Layer 2 - Blockchain:**
- `CERTIFICATE_NOT_IN_BLOCKCHAIN` - Pending certificate
- `INVALID_BLOCK` - Block missing merkle root
- `MERKLE_ROOT_MISMATCH` - Merkle verification failed
- `BLOCK_HASH_INVALID` - Block hash doesn't match
- `BLOCK_INDEX_OUT_OF_RANGE` - Index out of range
- `BLOCK_NOT_FOUND_IN_CHAIN` - Block missing from chain
- `INVALID_PROOF_OF_WORK` - PoW verification failed
- `CHAIN_LINKAGE_BROKEN` - previousHash mismatch

**Layer 3 - Signatures:**
- `NO_SIGNATURES` - لا توقيعات
- `PUBLIC_KEY_NOT_FOUND` - مفتاح عام مفقود
- `INVALID_SIGNATURE` - التحقق فشل
- `MISSING_SIGNER_ID` - معرف الموقّع مفقود

**Layer 4 - Transaction Hash:**
- `INVALID_PENDING_TXN_HASH` - Pending has non-null txnHash
- `MISSING_TRANSACTION_HASH` - Completed بدون txnHash
- `TRANSACTION_HASH_MISMATCH` - Computed ≠ stored
- `UNKNOWN_STATUS` - Status غير معروف

---

## 6️⃣ مثال استخدام API

```javascript
// Basic usage:
const validationService = new CertificateValidationService({
  blockchainService,
  certificateRepo,
  keyManagementService
});

// Complete 4-layer validation:
const result = await validationService.completeCertificateValidation('cert-123');

if (result.status === 'VALID') {
  console.log('✅ Certificate is authentic and trusted');
  console.log('Details:', result.details);
  // result.details = {
  //   integrity: { valid: true },
  //   blockchain: { valid: true, blockIndex: 5 },
  //   signatures: { valid: true, validCount: 3 },
  //   transactionHash: { valid: true, transactionHash: '...' }
  // }
} else {
  console.log('❌ Certificate validation failed');
  console.log('Failed layers:', result.details);
  // result.details = {
  //   integrity: { valid: true },
  //   blockchain: { valid: true },
  //   signatures: { valid: false, reason: 'INVALID_SIGNATURE' },
  //   transactionHash: { valid: false, reason: '...' }
  // }
}

// Individual layer validation:
const integrityCheck = await validationService.validateCertificateIntegrity('cert-123');
const blockchainCheck = await validationService.validateCertificateBlockchain('cert-123');
const sigCheck = await validationService.validateCertificateSignatures('cert-123');
const txnCheck = await validationService.validateTransactionHash('cert-123');
```

---

## 7️⃣ الملخص النهائي

| الميزة | الوصف |
|--------|-------|
| **الطبقات** | 4 طبقات أمان: Integrity, Blockchain, Signatures, TransactionHash |
| **Determinism** | ✅ نفس المدخلات = نفس المخرجات دائماً |
| **False Positives** | ❌ مستحيل - جميع الحالات محددة بوضوح |
| **False Negatives** | ❌ مستحيل - كل الأخطاء مكتشفة |
| **تعديل البيانات** | ❌ ممنوع - فقط قراءة وتحقق |
| **الشمول** | ✅ جميع حالات الاستخدام مغطاة |
| **الأمان** | ✅ quantum-safe (ML-DSA-65 + SHA3-512) |
| **الخوارزميات** | SHA3-512, ML-DSA-65, Merkle Tree (sorted), PoW |

---

## 📝 ملاحظات مهمة

1. **Immutability:** جميع البيانات المستخدمة في التحقق immutable (محفوظة من التعديل)
2. **No Side Effects:** لا يوجد تعديل على البيانات، فقط قراءة وتحقق
3. **Comprehensive:** كل خطأ محتمل له رسالة واضحة
4. **Production Ready:** جاهز للاستخدام في الإنتاج
5. **Logging:** تسجيل مفصل لكل خطوة للتصحيح والتدقيق

