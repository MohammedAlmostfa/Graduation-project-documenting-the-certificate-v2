// متغير عام لحفظ بيانات الشهادة
let certificateData = null;

// استقبال البيانات عند تحميل الصفحة
window.addEventListener('DOMContentLoaded', function() {
    // استرجاع البيانات من localStorage
    const certificateDataString = localStorage.getItem('certificateData');

    if (certificateDataString) {
        try {
            const data = JSON.parse(certificateDataString);
            console.log('بيانات الشهادة المستلمة:', data);

            // استخراج البيانات من الاستجابة
            const certData = data.certificate || data;
            const student = certData.student || certData;

            // تحويل البيانات إلى التنسيق المطلوب
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

            // تحديث الشهادة بالبيانات
            // updateCertificate();

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

// function updateCertificate() {
//     if (!certificateData) {
//         console.error('لا توجد بيانات شهادة لعرضها');
//         return;
//     }

//     // تحديث اسم الطالب
//     document.getElementById('studentNameDisplay').textContent = certificateData.studentName || 'غير متوفر';

//     // تحديث التخصص
//     document.getElementById('majorDisplay').textContent = certificateData.major || 'غير متوفر';

//     // تحديث المعدل
//     document.getElementById('gpaDisplay').textContent = certificateData.gpa || 'غير متوفر';

//     // تحديث معلومات الطالب
//     let birthDate = 'غير متوفر';
//     if (certificateData.dateOfBirth) {
//         try {
//             const dateObj = new Date(certificateData.dateOfBirth);
//             birthDate = dateObj.toLocaleDateString('ar-EG');
//         } catch (e) {
//             birthDate = 'غير متوفر';
//         }
//     }

//     document.getElementById('studentDetails').textContent =
//         `ابن ${certificateData.fatherName || 'غير متوفر'} والدته ${certificateData.motherName || 'غير متوفر'}، من مواليد ${birthDate}، جنسيته ${certificateData.nationality || 'غير متوفر'}، بريده الإلكتروني ${certificateData.studentEmail || 'غير متوفر'}`;

//     // تحديث تاريخ الإصدار
//     let issueDate = 'غير متوفر';
//     if (certificateData.graduationDate) {
//         try {
//             issueDate = new Date(certificateData.graduationDate).toLocaleDateString('ar-EG');
//         } catch (e) {
//             issueDate = 'غير متوفر';
//         }
//     }
//     document.getElementById('dateDisplay').textContent = `تاريخ الإصدار: ${issueDate}`;

//     // تحديث رقم الشهادة والدورة في certificate-meta
//     const metaSection = document.querySelector('.certificate-meta');
//     if (metaSection) {
//         metaSection.innerHTML = `
//             <span>رقم الشهادة: ${certificateData.certificateNumber || 'غير متوفر'}</span>
//             <span id="dateDisplay">تاريخ الإصدار: ${issueDate}</span>
//             <span>الدورة: ${certificateData.graduationCycle || 'غير متوفر'}</span>
//         `;
//     }

//     // إنشاء QR Code
//     document.getElementById('qrcode').innerHTML = '';
//     const qrText = certificateData.studentId || certificateData.certificateNumber || 'لا يوجد رقم';
//     new QRCode(document.getElementById('qrcode'), {
//         text: qrText,
//         width: 80,
//         height: 80,
//         colorDark: "#1a472a",
//         colorLight: "#ffffff",
//         correctLevel: QRCode.CorrectLevel.H
//     });
// }

function printCertificate() {
    window.print();
}

function downloadPDF() {
    const container = document.querySelector('.certificate-container');

    html2canvas(container, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        logging: false,
        width: 1200,
        height: 700
    }).then(canvas => {
        const {
            jsPDF
        } = window.jspdf;
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'px',
            format: [1200, 700],
            compress: true
        });

        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 0, 0, 1200, 700);

        const fileName = certificateData && certificateData.studentName
            ? `شهادة_${certificateData.studentName}.pdf`
            : 'شهادة_جامعية.pdf';

        pdf.save(fileName);
    }).catch(err => {
        console.error('خطأ:', err);
        alert('حدث خطأ في حفظ الملف');
    });
}
