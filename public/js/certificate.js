// متغير عام لحفظ بيانات الشهادة
let certificateData = null;

// استقبال البيانات عند تحميل الصفحة
window.addEventListener('DOMContentLoaded', function() {
    const certificateDataString = localStorage.getItem('certificateData');

    if (certificateDataString) {
        try {
            const data = JSON.parse(certificateDataString);
            console.log('بيانات الشهادة المستلمة:', data);

            const certData = data.certificate || data;
            const student = certData.student || certData;

            certificateData = {
                studentName: student.studentName || '',
                studentId: student.studentId || certData.certificateNumber || '',
                studentEmail: student.studentEmail || '',
                dateOfBirth: student.dateOfBirth || student.birthDate || '',
                nationality: student.nationality || '',
                fatherName: student.fatherName || '',
                motherName: student.motherName || '',
                major: student.major || '',
                faculty: student.faculty || '',
                graduationDate: student.graduationDate || '',
                graduationCycle: student.graduationCycle || '',
                gpa: student.gpa || '',
                honors: student.honors || '',
                certificateType: student.certificateType || '',
                certificateNumber: certData.certificateNumber || student.certificateNumber || ''
            };

            console.log('البيانات المحولة:', certificateData);

            // ✅ توليد QR بعد تحميل البيانات
            generateQRCode();

        } catch (error) {
            console.error('خطأ في قراءة بيانات الشهادة:', error);
            alert('حدث خطأ في تحميل بيانات الشهادة');
            window.history.back();
        }
    } else {
        console.warn('لا توجد بيانات في localStorage');
        alert('لا توجد بيانات شهادة للعرض. يرجى التحقق من الشهادة أولاً.');
        window.history.back();
    }
});

// ✅ دالة توليد QR Code برابط التحقق
function generateQRCode() {
    if (!certificateData) return;

    const certId = certificateData.certificateNumber || certificateData.studentId || '';
    const verifyUrl = `http://127.0.0.1:8000/certificate/verify/${certId}`;

    const qrContainer = document.getElementById('qrcode');
    if (!qrContainer) return;

    qrContainer.innerHTML = '';

    new QRCode(qrContainer, {
        text: verifyUrl,
        width: 80,
        height: 80,
        colorDark: "#1a472a",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });

    console.log('QR Code تم توليده برابط:', verifyUrl);
}

function printCertificate() {
    window.print();
}

function downloadPDF() {
    const container = document.querySelector('.certificate-container');

    // ✅ انتظر تحميل كل الفونتات أولاً
    document.fonts.ready.then(() => {
        html2canvas(container, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: null,
            logging: false,
            width: 1200,
            height: 700,
            foreignObjectRendering: false, // ✅ مهم للعربي
            onclone: function(clonedDoc) {
                // ✅ تأكد إن الـ clone فيه نفس الاتجاه
                clonedDoc.body.style.direction = 'rtl';
                clonedDoc.body.style.fontFamily = getComputedStyle(document.body).fontFamily;
            }
        }).then(canvas => {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'px',
                format: [1200, 700],
                compress: true
            });

            const imgData = canvas.toDataURL('image/png', 1.0); // ✅ جودة كاملة
            pdf.addImage(imgData, 'PNG', 0, 0, 1200, 700);

            const fileName = certificateData && certificateData.studentName
                ? `شهادة_${certificateData.studentName}.pdf`
                : 'شهادة_جامعية.pdf';

            pdf.save(fileName);
        }).catch(err => {
            console.error('خطأ:', err);
            alert('حدث خطأ في حفظ الملف');
        });
    });
}
