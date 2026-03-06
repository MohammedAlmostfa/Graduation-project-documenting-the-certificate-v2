<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>شهادة جامعية - جامعة حمص</title>
    <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap" rel="stylesheet">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <link rel="stylesheet" href="../css/certificate.css">
</head>
<body>
    <div class="certificate-container">
        <div class="certificate-frame"></div>
        <div class="corner corner-top-right"></div>
        <div class="corner corner-top-left"></div>
        <div class="corner corner-bottom-right"></div>
        <div class="corner corner-bottom-left"></div>

        <div class="left-sidebar">
            <div class="logo">
            <img src="../img/image.png" alt="">
            </div>
        </div>

        <div class="certificate" id="certificate">
            <div class="content">
                <div class="top">
                    <div class="document-header">
                        <div class="republic-name">الجمهورية العربية السورية</div>
                        <div class="ministry-name">وزارة التعليم العالي والبحث العلمي</div>
                        <div class="university-info">
                            <h1>جامعة حمص</h1>
                        </div>
                    </div>
                    <img class="logo2" src="../img/image copy.png">
                </div>

                <div class="certificate-title-section">
                    <div class="certificate-title">شهادة التخرج</div>
                </div>

                <div class="certificate-body">
                    <div class="opening-text">
                        تشهد جامعة حمص بموجب هذه الوثيقة الرسمية أن الطالب/ة
                    </div>

                    <div class="student-name" id="studentNameDisplay">أحمد محمد</div>

                    <div class="major-section">
                        <div class="major-text">
                            قد أكمل متطلبات برنامج الدراسة في تخصص <strong id="majorDisplay">علوم الحاسب</strong>
                        </div>
                    </div>

                    <div class="achievement-text">
                        وأظهر كفاءة عالية واستحقاق أكاديمي متميز بمعدل تراكمي <strong id="gpaDisplay">3.8</strong>/4.0
                    </div>

                    <div class="student-info">
                        <span id="studentDetails">ابن محمد أحمد والدته فاطمة حسن، من مواليد 15/05/2000، جنسيته سوري، بريده الإلكتروني ahmed.mohamed@university.edu</span>
                    </div>

                    <div class="conclusion-text">
                        وعليه يُمنح هذه الشهادة الجامعية الرسمية تصديقاً لاستيفائه جميع الشروط الأكاديمية والإدارية المطلوبة.
                    </div>
                </div>

                <div class="footer-section">
                    <div class="signatures-section">
                        <div class="signature-block">
                            <div class="signature-line"></div>
                            <div class="signature-title">عميد الكلية<br>التوقيع والختم</div>
                        </div>
                        <div class="signature-block">
                            <div class="signature-line"></div>
                            <div class="signature-title">منشئ الشهادة<br>التوقيع والختم</div>
                        </div>
                        <div class="signature-block">
                            <div class="signature-line"></div>
                            <div class="signature-title">رئيس الجامعة<br>التوقيع والختم</div>
                        </div>
                    </div>
                    <div class="qr-section">
                        <div id="qrcode"></div>
                    </div>
                </div>

                <div class="certificate-meta">
                    <span>رقم الشهادة: 2024-0001</span>
                    <span id="dateDisplay">تاريخ الإصدار: 01/06/2024</span>
                    <span>الدورة: ربيع 2024</span>
                </div>
            </div>
        </div>
    </div>

    <div class="controls">
        <button class="btn btn-print" onclick="printCertificate()">🖨️ طباعة</button>
        <button class="btn btn-pdf" onclick="downloadPDF()">📄 تحميل PDF</button>
    </div>

    <script src="../js/certificate.js"></script>
</body>
</html>
