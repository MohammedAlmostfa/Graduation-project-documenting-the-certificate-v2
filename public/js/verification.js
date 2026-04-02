document.getElementById('verifyForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const certNumber = document.getElementById('certNumber').value.trim();
    const loadingState = document.getElementById('loadingState');
    const resultCard = document.getElementById('resultCard');

    if (!certNumber) {
        alert('يرجى إدخال رقم الشهادة');
        return;
    }

    loadingState.classList.add('active');
    resultCard.classList.remove('show');

    try {
        const apiUrl = `http://localhost:3000/api/certificates/${encodeURIComponent(certNumber)}/validate`;

        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(`فشل في الاتصال بالخادم: ${response.status}`);
        }

        const json = await response.json();
        const data = json.data; // { status, message, certificate? }

        loadingState.classList.remove('active');
        console.log('data', data);

        if (data.status === 'VALID') {
            // 🔑 تخزين البيانات الكاملة في sessionStorage للنقل
            sessionStorage.setItem('certificateData', JSON.stringify(data));
            sessionStorage.setItem('certificateNumber', certNumber);
        }

        displayResult(data, certNumber);

    } catch (error) {
        console.error('Error:', error);
        loadingState.classList.remove('active');

        document.getElementById('resultContent').innerHTML = `
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

// ============================================================
// displayResult — يتعامل مع هيكل { status, message, certificate }
// ============================================================
function displayResult(data, certNumber) {
    const resultCard    = document.getElementById('resultCard');
    const resultContent = document.getElementById('resultContent');

    // ✅ VALID — شهادة صحيحة ومتحقق منها
    if (data.status === 'VALID') {
        const certData = data.certificate;
        const student  = certData.student;

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
                        <div class="detail-value">${student?.name || 'غير متوفر'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">الرقم الجامعي</div>
                        <div class="detail-value">${student?.id || 'غير متوفر'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">البريد الإلكتروني</div>
                        <div class="detail-value">${student?.email || 'غير متوفر'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">الجنسية</div>
                        <div class="detail-value">${student?.nationality || 'غير متوفر'}</div>
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
                        <div class="detail-value">${certData.certificateNumber || certNumber}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">نوع الشهادة</div>
                        <div class="detail-value">${student?.certificateType || 'غير متوفر'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">التخصص</div>
                        <div class="detail-value">${student?.major || 'غير متوفر'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">الكلية</div>
                        <div class="detail-value">${student?.faculty || 'غير متوفر'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">تاريخ التخرج</div>
                        <div class="detail-value">${formatDate(student?.graduationDate)}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">دورة التخرج</div>
                        <div class="detail-value">${student?.graduationCycle || 'غير متوفر'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">المعدل التراكمي</div>
                        <div class="detail-value">${student?.gpa || 'غير متوفر'} من 4.00</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">التقدير</div>
                        <div class="detail-value">${student?.honors || 'غير متوفر'}</div>
                    </div>
                </div>
            </div>

            ${certData.signatures?.length > 0 ? `
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
                background: #06332e;
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

    // ❌ INVALID — شهادة غير متحقق منها، نعرض رسالة الـ API مباشرة
    } else {
        resultContent.innerHTML = `
            <div class="status-header">
                <div class="status-badge status-invalid">
                    <span class="status-icon">✗</span>
                    <span>غير متحقق منها</span>
                </div>
            </div>
            <div class="error-state">
                <p class="error-message">${data.message || 'الشهادة غير صالحة أو غير مكتملة.'}</p>
            </div>
        `;
    }

    resultCard.classList.add('show');
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ============================================================
// showCertificate — الوظيفة المحسّنة اللي تأخذ البيانات معها
// ============================================================
function showCertificate() {
    const certData = sessionStorage.getItem('certificateData');
    const certNumber = sessionStorage.getItem('certificateNumber');

    if (certData) {
        // ✅ الخيار 1: فتح صفحة جديدة مع البيانات
        // يمكن استقبال البيانات من sessionStorage في الصفحة الأخرى
        window.location.href = 'http://127.0.0.1:8000/certificate';

        // ✅ الخيار 2 (بديل): إذا كنت تريد URL مع البيانات كـ query string
        // تفكيك البيانات وإضافتها للـ URL:
        // const data = JSON.parse(certData);
        // const params = new URLSearchParams({
        //     certNumber: certNumber,
        //     studentName: data.certificate.student.studentName,
        //     studentId: data.certificate.student.studentId,
        //     // أضف ما تحتاج
        // });
        // window.location.href = `http://127.0.0.1:8000/certificate?${params.toString()}`;
    } else {
        alert('لم يتم العثور على بيانات الشهادة');
    }
}

// ============================================================
// Helpers — دوال مساعدة
// ============================================================

/**
 * تنسيق التاريخ بصيغة عربية
 */
function formatDate(dateString) {
    if (!dateString) return 'غير متوفر';
    try {
        return new Date(dateString).toLocaleDateString('ar-SY', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch {
        return dateString;
    }
}

/**
 * ترجمة أدوار التوقيع
 */
function getRoleLabel(role) {
    const labels = {
        'officer':    'موظف شؤون الطلاب',
        'dean':       'عميد الكلية',
        'president':  'رئيس الجامعة',
        'registrar':  'مسجل عام',
        'director':   'مدير الشؤون الأكاديمية'
    };
    return labels[role] || role;
}

/**
 * نسخ النص للحافظة
 */
function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
        .then(() => alert('تم نسخ رقم المعاملة إلى الحافظة'))
        .catch(err => console.error('فشل في النسخ: ', err));
}

/**
 * حدث النقر على العناصر القابلة للنسخ
 */
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('blockchain-value')) {
        copyToClipboard(e.target.textContent);
    }
});

// ============================================================
// دالة إضافية: استخراج البيانات من sessionStorage في أي مكان
// ============================================================
function getCertificateData() {
    const certData = sessionStorage.getItem('certificateData');
    if (certData) {
        return JSON.parse(certData);
    }
    return null;
}


