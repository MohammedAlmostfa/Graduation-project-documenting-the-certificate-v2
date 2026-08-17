let certificateData = null;

// ============================================================
// ⚙️ رابط صفحة التحقق — عدّل هذا ليطابق مسار صفحة التحقق الفعلي عندك
// ============================================================
const VERIFY_PAGE_URL = 'http://127.0.0.1:8000/certificate/verify';

// ============================================================
// عند تحميل الصفحة
// ============================================================
window.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 تحميل الصفحة...');

    const certificateDataString = sessionStorage.getItem('certificateData');

    if (certificateDataString) {
        try {
            const data = JSON.parse(certificateDataString);
            console.log('✅ بيانات الشهادة المستلمة:', data);

            certificateData = extractCertificateData(data);
            console.log('📋 البيانات المحولة:', certificateData);

            // ✅ تحذير بالكونسول عن أي حقل أساسي وصل فاضي — يسهّل تحديد
            // اسم الحقل الصح باستجابة الـ API لو صار نفس المشكل بحقل تاني
            const requiredFields = ['studentName', 'nationalId', 'birthYear', 'major', 'faculty', 'department', 'specialization', 'graduationDate', 'graduationCycle'];
            const missingFields = requiredFields.filter(f => !certificateData[f]);
            if (missingFields.length > 0) {
                console.warn('⚠️ الحقول التالية وصلت فاضية من الـ API، تحقق من اسم الحقل بالباك-إند:', missingFields);
            }

            document.getElementById('certificateContainer').style.display = 'block';

            populateCertificateDisplay();
            generateQRCode();

        } catch (error) {
            console.error('❌ خطأ:', error);
            showError('حدث خطأ: ' + error.message);
        }
    } else {
        showError('لا توجد بيانات شهادة');
    }
});

// ============================================================
// استخراج البيانات
// ============================================================
function extractCertificateData(data) {
    const certData = data.certificate || data;
    const student = certData.student || certData;

    return {
        // البيانات الأساسية
        studentName: student.studentName || student.name || 'غير متوفر',
        studentId: student.studentId || student.id || '',
        // ✅ تدعم كل الأسماء المحتملة لنفس الحقل من الـ API (camelCase أو snake_case)
        nationalId: student.nationalId || student.national_id || student.nationalID
            || student.idNumber || student.id_number || student.nationalNumber || '',

        // البيانات الشخصية
        dateOfBirth: student.dateOfBirth || '',
        birthYear: student.birthYear || extractYear(student.dateOfBirth) || '',
        birthPlace: student.birthPlace || '',
        nationality: student.nationality || 'السورية',

        // البيانات الأكاديمية
        major: student.major || 'غير متوفر',
        faculty: student.faculty || '',
        department: student.department || '',
        specialization: student.specialization || '',

        // التواريخ والدورات
        graduationDate: student.graduationDate || '',
        graduationCycle: student.graduationCycle || '',

        // الأداء الأكاديمي
        gpa: student.gpa || 3.5,
        honors: student.honors || 'جيد',
        certificateType: student.certificateType || 'إجازة',

        // بيانات الشهادة
        certificateNumber: certData.certificateNumber || '',
        issueDate: certData.issueDate || certData.createdAt || new Date().toISOString()
    };
}

// ============================================================
// استخراج السنة من التاريخ
// ============================================================
function extractYear(dateString) {
    if (!dateString) return '';

    try {
        const date = new Date(dateString);
        return date.getFullYear();
    } catch (error) {
        return '';
    }
}

// ============================================================
// عرض البيانات
// ============================================================
function populateCertificateDisplay() {
    if (!certificateData) return;

    try {
        // ملء البيانات الأساسية
        document.getElementById('studentNameDisplay').textContent = certificateData.studentName;
        document.getElementById('majorDisplay').textContent = certificateData.major;
        document.getElementById('gpaDisplay').textContent = certificateData.gpa;
        document.getElementById('certNumberDisplay').textContent = certificateData.certificateNumber;

         // التاريخ الأساسي
         document.getElementById('dateDisplay').textContent =
             `تاريخ الإصدار: ${formatDate(certificateData.issueDate)}`;

        // عنوان الشهادة
        document.getElementById('certificateTitleDisplay').textContent =
            generateCertificateTitle(certificateData.certificateType, certificateData.major);

        // ملء جميع الحقول المطلوبة
        document.getElementById('graduationDateDisplay').textContent =
            formatDate(certificateData.graduationDate);

        document.getElementById('graduationCycleDisplay').textContent =
            certificateData.graduationCycle;

        document.getElementById('facultyDisplay').textContent =
            certificateData.faculty;

        document.getElementById('departmentDisplay').textContent =
            certificateData.department;

        document.getElementById('specializationDisplay').textContent =
            certificateData.specialization;

        // البيانات الشخصية
        document.getElementById('nationalIdDisplay').textContent =
            certificateData.nationalId;

        document.getElementById('birthYearDisplay').textContent =
            certificateData.birthYear;

        // بيانات الأداء
        document.getElementById('honorsDisplay').textContent =
            certificateData.honors;

        document.getElementById('certificateTypeDisplay').textContent =
            certificateData.certificateType;

        document.getElementById('issueDateDisplay').textContent =
            formatDate(certificateData.issueDate);

        console.log('✅ تم ملء جميع بيانات الشهادة بنجاح');

    } catch (error) {
        console.error('❌ خطأ في ملء البيانات:', error);
        showError('حدث خطأ في ملء البيانات: ' + error.message);
    }
}

// ============================================================
// توليد عنوان الشهادة
// ============================================================
function generateCertificateTitle(certificateType, major) {
    const typeMap = {
        'بكالوريوس': `إجازة في ${major}`,
        'ماجستير': `ماجستير في ${major}`,
        'دكتوراه': `دكتوراه في ${major}`,
        'دبلوم': `دبلوم في ${major}`
    };

    return typeMap[certificateType] || `${certificateType} في ${major}`;
}

// ============================================================
// QR Code
// ✅ الآن يشير مباشرة إلى صفحة التحقق مع رقم الشهادة كـ query param
//    بحيث تفتح صفحة التحقق، تعبّي الرقم تلقائيًا، وتطلع النتيجة فورًا
// ============================================================
function generateQRCode() {
    if (!certificateData || !certificateData.certificateNumber) {
        console.warn('⚠️ لا توجد بيانات كافية لإنشاء رمز QR');
        return;
    }

    try {
        const certId = certificateData.certificateNumber;
        const verifyUrl = `${VERIFY_PAGE_URL}?cert=${encodeURIComponent(certId)}`;

        const qrContainer = document.getElementById('qrcode');
        qrContainer.innerHTML = '';

        new QRCode(qrContainer, {
            text: verifyUrl,
            width: 80,
            height: 80,
            colorDark: "#1a472a",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });

        console.log('✅ تم توليد رمز QR بنجاح باتجاه:', verifyUrl);

    } catch (error) {
        console.error('❌ خطأ في توليد رمز QR:', error);
    }
}

// ============================================================
// طباعة
// ============================================================
function printCertificate() {
    try {
        window.print();
        console.log('🖨️ تم إرسال طلب الطباعة');
    } catch (error) {
        console.error('❌ خطأ في الطباعة:', error);
        showError('حدث خطأ أثناء الطباعة');
    }
}

// ============================================================
// PDF
// ============================================================
function downloadPDF() {
    const container = document.querySelector('.certificate-container');

    if (!container) {
        showError('لم يتم العثور على الشهادة');
        return;
    }

    document.fonts.ready.then(() => {
        html2canvas(container, {
            scale: 2,
            useCORS: true,
            backgroundColor: null,
            width: 1200,
            height: 700,
            logging: false,
            // ✅ يخلي المتصفح نفسه يرسم النص (بدل محرك html2canvas الداخلي)
            // هاد أدق بكثير لتشكيل الحروف العربية المتصلة، وبيشكّل طبقة حماية
            // إضافية فوق إزالة letter-spacing بملف الـ CSS
            foreignObjectRendering: true
        }).then(canvas => {
            try {
                const { jsPDF } = window.jspdf;

                const pdf = new jsPDF({
                    orientation: 'landscape',
                    unit: 'px',
                    format: [1200, 700]
                });

                const imgData = canvas.toDataURL('image/png');
                pdf.addImage(imgData, 'PNG', 0, 0, 1200, 700);

                const fileName = certificateData.studentName
                    ? `شهادة_${certificateData.studentName}.pdf`
                    : `شهادة_${new Date().getTime()}.pdf`;

                pdf.save(fileName);
                console.log('📄 تم تحميل الشهادة بنجاح');

            } catch (error) {
                console.error('❌ خطأ في تحويل PDF:', error);
                showError('حدث خطأ أثناء تحميل الشهادة');
            }
        }).catch(error => {
            console.error('❌ خطأ في التقاط الشاشة:', error);
            showError('حدث خطأ أثناء معالجة الشهادة');
        });

    }).catch(error => {
        console.error('❌ خطأ في تحميل الخطوط:', error);
        showError('حدث خطأ أثناء تحميل الخطوط');
    });
}

// ============================================================
// تنسيق التاريخ
// ============================================================
function formatDate(dateString) {
    if (!dateString) return '';

    try {
        const date = new Date(dateString);

        if (isNaN(date.getTime())) {
            return dateString;
        }

        return date.toLocaleDateString('ar-SY', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

    } catch (error) {
        console.error('❌ خطأ في تنسيق التاريخ:', error);
        return dateString;
    }
}

// ============================================================
// عرض الخطأ
// ============================================================
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        text-align: center;
        padding: 50px;
        font-size: 20px;
        color: #d32f2f;
        background: #ffebee;
        border-radius: 5px;
        margin: 20px;
        font-family: 'Amiri', serif;
    `;
    errorDiv.innerHTML = `
        <div>
            <h2>⚠️ خطأ</h2>
            <p>${message}</p>
            <button onclick="location.reload()" style="
                margin-top: 20px;
                padding: 10px 20px;
                background: #d32f2f;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-family: 'Amiri', serif;
                font-size: 16px;
            ">
                إعادة تحميل الصفحة
            </button>
        </div>
    `;

    const container = document.getElementById('certificateContainer');
    if (container) {
        container.innerHTML = '';
        container.appendChild(errorDiv);
        container.style.display = 'block';
    } else {
        document.body.innerHTML = errorDiv.outerHTML;
    }

    console.error('❌ ' + message);
}

// ============================================================
// التعامل مع الأخطاء العامة
// ============================================================
window.addEventListener('error', function(event) {
    console.error('❌ خطأ عام:', event.error);
});

window.addEventListener('unhandledrejection', function(event) {
    console.error('❌ رفض وعد غير معالج:', event.reason);
});
