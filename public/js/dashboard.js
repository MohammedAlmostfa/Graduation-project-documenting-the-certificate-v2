// Data Storage
let blockchainData = [];
let certificatesData = [];

// Utility Functions
function formatHash(hash) {
    if (!hash) return '';
    const match = hash.match(/^(0+)(.+)$/);
    if (match) {
        return `<span class="hash-zeros-modal">${match[1]}</span>${match[2]}`;
    }
    return hash;
}

// Display Functions
function displayCertificates() {
    const certsList = document.getElementById('certsList');

    if (certificatesData.length === 0) {
        certsList.innerHTML = '<div style="text-align:center;color:#999;padding:30px;">جاري تحميل الشهادات...</div>';
        return;
    }

    certsList.innerHTML = certificatesData.map(cert => `
        <div class="cert-item">
            <div class="cert-name">${cert.studentName}</div>
            <div class="cert-info">${cert.certificateId.substring(0, 20)}... - ${cert.university} - كتلة #${cert.blockIndex}</div>
        </div>
    `).join('');
}

function displayPending() {
    const pendingList = document.getElementById('pendingList');
    pendingList.innerHTML = '<div style="text-align:center;color:#999;padding:30px;">لا توجد شهادات معلقة</div>';
}

function displayBlockchain() {
    const container = document.getElementById('blocksContainer');

    if (blockchainData.length === 0) {
        container.innerHTML = '<div style="text-align:center;color:#999;padding:30px;">جاري تحميل البلوكشين...</div>';
        return;
    }

    container.innerHTML = blockchainData.map((block, index) => {
        const isGenesis = block.index === 0;
        const certs = block.data.filter(d => d.type === 'certificate');

        return `
            <div class="block ${isGenesis ? 'genesis' : ''}" onclick="showBlockDetails(${index})">
                <div class="block-mini-header">
                    <div class="block-number">${isGenesis ? '🔰' : '#' + block.index}</div>
                </div>

                <div class="block-mini-info">
                    <div><strong>${certs.length}</strong> شهادة</div>
                    <div style="font-size:0.85em;margin-top:3px;">Nonce: ${block.nonce.toLocaleString()}</div>
                </div>

                <div class="block-hash-preview">
                    ${block.hash.substring(0, 20)}...
                </div>

                <div class="click-hint">انقر للتفاصيل</div>
            </div>
        `;
    }).join('');

    drawConnections();
}

function drawConnections() {
    const svg = document.getElementById('chainSvg');
    const blocks = document.querySelectorAll('.block');

    if (blocks.length < 2) return;

    let pathsHTML = '';

    for (let i = 0; i < blocks.length - 1; i++) {
        const block1 = blocks[i];
        const block2 = blocks[i + 1];

        const rect1 = block1.getBoundingClientRect();
        const rect2 = block2.getBoundingClientRect();
        const svgRect = svg.getBoundingClientRect();

        const x1 = rect1.left + rect1.width / 2 - svgRect.left;
        const y1 = rect1.top + rect1.height / 2 - svgRect.top;
        const x2 = rect2.left + rect2.width / 2 - svgRect.left;
        const y2 = rect2.top + rect2.height / 2 - svgRect.top;

        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;

        const controlX1 = midX + (Math.random() - 0.5) * 100;
        const controlY1 = midY - 80;
        const controlX2 = midX + (Math.random() - 0.5) * 100;
        const controlY2 = midY + 80;

        pathsHTML += `
            <path d="M ${x1} ${y1} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${x2} ${y2}"
                  stroke="#bba97b"
                  stroke-width="4"
                  fill="none"
                  stroke-dasharray="10,5"
                  opacity="0.7"/>
            <circle cx="${x1}" cy="${y1}" r="6" fill="#1a472a" stroke="#bba97b" stroke-width="2"/>
            <circle cx="${x2}" cy="${y2}" r="6" fill="#1a472a" stroke="#bba97b" stroke-width="2"/>
        `;
    }

    svg.innerHTML = pathsHTML;
}

// Modal Functions
function showBlockDetails(index) {
    const block = blockchainData[index];
    const isGenesis = block.index === 0;
    const certs = block.data.filter(d => d.type === 'certificate');

    const modalContent = `
        <div class="modal-header ${isGenesis ? 'genesis' : ''}">
            <button class="modal-close" onclick="closeModal()">×</button>
            <div class="modal-title">${isGenesis ? '🔰 الكتلة التأسيسية' : 'كتلة #' + block.index}</div>
            <div class="modal-subtitle">${new Date(block.timestamp).toLocaleString('ar-EG')}</div>
        </div>

        <div class="modal-body">
            <div class="modal-section">
                <div class="modal-section-title">📊 معلومات الكتلة</div>
                <div class="info-grid">
                    <div class="info-box">
                        <div class="info-box-label">رقم الكتلة</div>
                        <div class="info-box-value">#${block.index}</div>
                    </div>
                    <div class="info-box">
                        <div class="info-box-label">عدد الشهادات</div>
                        <div class="info-box-value">${certs.length}</div>
                    </div>
                    <div class="info-box">
                        <div class="info-box-label">Nonce</div>
                        <div class="info-box-value">${block.nonce.toLocaleString()}</div>
                    </div>
                    <div class="info-box">
                        <div class="info-box-label">الصعوبة</div>
                        <div class="info-box-value">${block.difficulty} أصفار</div>
                    </div>
                </div>
            </div>

            ${certs.length > 0 ? `
                <div class="modal-section">
                    <div class="modal-section-title">📄 الشهادات المسجلة</div>
                    ${certs.map(cert => `
                        <div class="cert-in-modal">
                            <strong>${cert.student?.studentName || 'غير محدد'}</strong><br>
                            <small style="color:#666;">${cert.certificateId || cert.id}</small><br>
                            <small style="color:#999;">${cert.university?.name || ''}</small>
                        </div>
                    `).join('')}
                </div>
            ` : ''}

            <div class="modal-section">
                <div class="modal-section-title">🔐 Hash الكتلة</div>
                <div class="hash-box-modal">
                    <div class="hash-value-modal">${formatHash(block.hash)}</div>
                </div>
            </div>

            ${!isGenesis ? `
                <div class="modal-section">
                    <div class="modal-section-title">🔗 Previous Hash (الربط مع الكتلة السابقة)</div>
                    <div class="hash-box-modal">
                        <div class="hash-value-modal">${formatHash(block.previousHash)}</div>
                    </div>
                    <div style="text-align:center;margin-top:10px;color:#666;font-size:0.9em;">
                        ✓ هذا الـ Hash مطابق لـ Hash الكتلة #${block.index - 1}
                    </div>
                </div>
            ` : ''}
        </div>`;

    document.getElementById('modalContent').innerHTML = modalContent;
    document.getElementById('modalOverlay').classList.add('active');
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
}

// Event Listeners
document.getElementById('modalOverlay').addEventListener('click', function(e) {
    if (e.target === this) {
        closeModal();
    }
});

window.addEventListener('resize', drawConnections);

// API Connection
const API_BASE = 'http://localhost:3000/api';

async function fetchFromAPI() {
    try {
        // Fetch blockchain blocks
        const blocksRes = await fetch(`${API_BASE}/blockchain/blocks`);
        if (blocksRes.ok) {
            const blocksData = await blocksRes.json();
            if (blocksData.status === 'success' && blocksData.data?.blocks) {
                blockchainData = blocksData.data.blocks;

                // Extract certificates from blocks
                certificatesData = [];
                blockchainData.forEach(block => {
                    block.data.forEach(item => {
                        if (item.type === 'certificate') {
                            certificatesData.push({
                                certificateId: item.certificateId,
                                studentName: item.student?.studentName || 'غير محدد',
                                university: item.university?.name || 'غير محدد',
                                blockIndex: block.index
                            });
                        }
                    });
                });

                // Update displays
                displayCertificates();
                displayPending();
                displayBlockchain();

                console.log('API Connected - Blocks loaded:', blockchainData.length);
            }
        }
    } catch (error) {
        console.log('API Connection Error:', error);
        // Keep showing loading state
    }
}

// Initialize
displayCertificates();
displayPending();
displayBlockchain();

// Start API polling
fetchFromAPI();
setInterval(fetchFromAPI, 5000);
