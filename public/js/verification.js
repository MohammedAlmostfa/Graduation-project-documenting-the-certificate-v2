document.getElementById('verifyForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const certNumber = document.getElementById('certNumber').value.trim();
    const loadingState = document.getElementById('loadingState');
    const resultCard = document.getElementById('resultCard');

    // التحقق من إدخال رقم الشهادة
    if (!certNumber) {
        alert('يرجى إدخال رقم الشهادة');
        return;
    }

    // Show loading
    loadingState.classList.add('active');
    resultCard.classList.remove('show');

    try {
        // طلب API حقيقي باستخدام fetch
        const apiUrl = `http://localhost:3000/api/certificates/${encodeURIComponent(certNumber)}/validate`;

        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        console.log('response', response.data);

        if (!response.ok) {
            throw new Error(`فشل في الاتصال بالخادم: ${response.status}`);
        }

        let data = await response.json();
        data = data.data;
        loadingState.classList.remove('active');
        console.log('data', data);

        // حفظ البيانات في localStorage لاستخدامها في صفحة الشهادة
        if (data.valid || data.isValid) {
            localStorage.setItem('certificateData', JSON.stringify(data));
        }

        displayResult(data, certNumber);

    } catch (error) {
        console.error('Error:', error);
        loadingState.classList.remove('active');

        const resultContent = document.getElementById('resultContent');
        resultContent.innerHTML = `
            <div class="status-header">
                <div class="status-badge status-invalid">
                    <span class="status-icon">⚠️</span>
                    <span>خطأ في الاتصال</span>
                </div>
            </div>
            <div class="error-state">
                <p class="error-message">
                    حدث خطأ في الاتصال بالخادم.<br>
                    يرجى التأكد من اتصالك بالشبكة والمحاولة مرة أخرى.
                </p>
                <p class="error-detail">${error.message}</p>
            </div>
        `;
        resultCard.classList.add('show');
    }
});

function displayResult(data, certNumber) {
    const resultCard = document.getElementById('resultCard');
    const resultContent = document.getElementById('resultContent');

    // تحقق من هيكل الاستجابة المتوقع
    if (data.valid || data.isValid) {
        const certData = data.certificate || data;

        resultContent.innerHTML = `
            <div class="status-header">
                <div class="status-badge status-valid">
                    <span class="status-icon">✓</span>
                    <span>شهادة صحيحة ومعتمدة</span>
                </div>
            </div>

            <div class="details-section">
                <h3 class="section-title">
                    <span class="section-icon">👤</span>
                    <span>بيانات الطالب</span>
                </h3>
                <div class="details-grid">
                    <div class="detail-item">
                        <div class="detail-label">اسم الطالب</div>
                        <div class="detail-value">${certData.student?.studentName || certData.studentName || 'غير متوفر'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">الرقم الجامعي</div>
                        <div class="detail-value">${certData.student?.studentId || certData.studentId || 'غير متوفر'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">البريد الإلكتروني</div>
                        <div class="detail-value">${certData.student?.studentEmail || certData.studentEmail || 'غير متوفر'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">الجنسية</div>
                        <div class="detail-value">${certData.student?.nationality || certData.nationality || 'غير متوفر'}</div>
                    </div>
                </div>
            </div>

            <div class="details-section">
                <h3 class="section-title">
                    <span class="section-icon">🎓</span>
                    <span>معلومات الشهادة</span>
                </h3>
                <div class="details-grid">
                    <div class="detail-item">
                        <div class="detail-label">رقم الشهادة</div>
                        <div class="detail-value">${certData.certificateNumber || data.certificateNumber || certNumber}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">نوع الشهادة</div>
                        <div class="detail-value">${certData.student?.certificateType || certData.certificateType || 'غير متوفر'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">التخصص</div>
                        <div class="detail-value">${certData.student?.major || certData.major || 'غير متوفر'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">الكلية</div>
                        <div class="detail-value">${certData.student?.faculty || certData.faculty || 'غير متوفر'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">تاريخ التخرج</div>
                        <div class="detail-value">${formatDate(certData.student?.graduationDate || certData.graduationDate)}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">دورة التخرج</div>
                        <div class="detail-value">${certData.student?.graduationCycle || certData.graduationCycle || 'غير متوفر'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">المعدل التراكمي</div>
                        <div class="detail-value">${certData.student?.gpa || certData.gpa || 'غير متوفر'} من 4.00</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">التقدير</div>
                        <div class="detail-value">${certData.student?.honors || certData.honors || 'غير متوفر'}</div>
                    </div>
                </div>
            </div>

            ${(certData.signatures && certData.signatures.length > 0) ? `
                <div class="details-section">
                    <h3 class="section-title">
                        <span class="section-icon">✍️</span>
                        <span>التوقيعات الرقمية المعتمدة</span>
                    </h3>
                    <div class="signatures-grid">
                        ${certData.signatures.map(sig => `
                            <div class="signature-card">
                                <div class="signature-icon">✓</div>
                                <div class="signature-role">${getRoleLabel(sig.role)}</div>
                                <div class="signature-date">${formatDate(sig.timestamp)}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            <button onclick="showCertificate()" style="

                margin: 0px auto;
                margin-top: 20px;
                padding: 12px 30px;
                 background:#06332e;
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
            " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                عرض الشهادة
            </button>
        `;
    }
else if (data.status === 'قيد المراجعة') {
        resultContent.innerHTML = `
            <div class="status-header">
                <div class="status-badge status-invalid">
                    <span class="status-icon">⏳</span>
                    <span>في انتظار توقيع عميد الكلية</span>
                </div>
            </div>
            <div class="error-state">
                <p class="error-message">
                    الشهادة بحاجة إلى توقيع عميد الكلية
                </p>
            </div>
        `;
    }
    else if (data.status === 'موقعة من العميد') {
        resultContent.innerHTML = `
            <div class="status-header">
                <div class="status-badge status-invalid">
                    <span class="status-icon">⏳</span>
                    <span>في انتظار توقيع رئيس الجامعة</span>
                </div>
            </div>
            <div class="error-state">
                <p class="error-message">
                    الشهادة بحاجة إلى توقيع رئيس الجامعة
                </p>
            </div>
        `;
    }
    else if (data.status === 'موقعة من الرئيس') {
        resultContent.innerHTML = `
            <div class="status-header">
                <div class="status-badge status-invalid">
                    <span class="status-icon">⛏️</span>
                    <span>في انتظار التعدين</span>
                </div>
            </div>
            <div class="error-state">
                <p class="error-message">
                    الشهادة بحاجة إلى التعدين على البلوكشين
                </p>
            </div>
        `;
    }
    else {
        resultContent.innerHTML = `
            <div class="status-header">
                <div class="status-badge status-invalid">
                    <span class="status-icon">✗</span>
                    <span>شهادة غير موجودة</span>
                </div>
            </div>
            <div class="error-state">

                <p class="error-message">
                    ${data.message || 'لم يتم العثور على شهادة بهذا الرقم في قاعدة البيانات.'}<br>
                    يرجى التأكد من رقم الشهادة والمحاولة مرة أخرى.
                </p>
            </div>
        `;
    }

    resultCard.classList.add('show');
    resultCard.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
}

// دالة لعرض الشهادة مع إرسال البيانات
function showCertificate() {
    const certData = localStorage.getItem('certificateData');
    if (certData) {
        // فتح صفحة الشهادة
        window.location.href = 'http://127.0.0.1:8000/certificate';
    } else {
        alert('لم يتم العثور على بيانات الشهادة');
    }
}

function formatDate(dateString) {
    if (!dateString) return 'غير متوفر';

    try {
        const date = new Date(dateString);
        const options = {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };
        return date.toLocaleDateString('ar-SY', options);
    } catch (error) {
        return dateString;
    }
}

function getRoleLabel(role) {
    const labels = {
        'officer': 'موظف شؤون الطلاب',
        'dean': 'عميد الكلية',
        'president': 'رئيس الجامعة',
        'registrar': 'مسجل عام',
        'director': 'مدير الشؤون الأكاديمية'
    };
    return labels[role] || role;
}

// إضافة دالة لنسخ رقم المعاملة
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('تم نسخ رقم المعاملة إلى الحافظة');
    }).catch(err => {
        console.error('فشل في النسخ: ', err);
    });
}

// إضافة مستمع للأحداث للعناصر الديناميكية
document.addEventListener('click', function (e) {
    if (e.target.classList.contains('blockchain-value')) {
        copyToClipboard(e.target.textContent);
    }
});

// دالة لاختبار الاتصال بالـ API (اختياري)
async function testConnection() {
    try {
        const response = await fetch('http://localhost:3000/api/health', {
            method: 'GET'
        });

        if (response.ok) {
            console.log('✅ API متصل ويعمل');
        } else {
            console.warn('⚠️ API متصل ولكن هناك مشكلة');
        }
    } catch (error) {
        console.error('❌ لا يمكن الاتصال بالـ API:', error);
    }
}
