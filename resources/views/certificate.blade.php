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

<!-- ✅ container للتحكم بالعرض -->
<div id="certificateContainer" style="display: none;">

    <div class="certificate-container">
        <div class="certificate-frame"></div>

        <div class="corner corner-top-right"></div>
        <div class="corner corner-top-left"></div>
        <div class="corner corner-bottom-right"></div>
        <div class="corner corner-bottom-left"></div>

        <div class="left-sidebar">
            <div class="logo">
                <img src="../img/image.png" alt="شعار الجامعة">
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
                    <img class="logo2" src="../img/image copy.png" alt="شعار الوزارة">
                </div>

                <div class="certificate-title-section">
                    <div class="certificate-title" id="certificateTitleDisplay"></div>
                </div>

                <div class="certificate-body">

                    <!-- النص السردي الرسمي الموحد -->
                    <div class="opening-text">
                        قررت جامعة حمص في جلستها المنعقدة بتاريخ <span id="graduationDateDisplay"></span>
                        بعد الاطلاع على نتيجة الدورة الامتحانية <span id="graduationCycleDisplay"></span>
                        في كلية <span id="facultyDisplay"></span> منح الطالب/ة
                        <span id="studentNameDisplay"></span> من مواطني الجمهورية العربية السورية
                        المتمتع/ة بالجنسية السورية، رقم الهوية الوطنية <span id="nationalIdDisplay"></span>
                        المولود/ة عام <span id="birthYearDisplay"></span>
                        شهادة <span id="certificateTypeDisplay"></span> في قسم <span id="departmentDisplay"></span>
                        تخصص <span id="specializationDisplay"></span> <strong id="majorDisplay"></strong>
                        بمرتبة <span id="honorsDisplay"></span> مع معدل تراكمي <span id="gpaDisplay"></span>
                        فحاز بذلك حقوق هذه المرحلة الدراسية.
                    </div>

                    <div class="conclusion-text">
                        حرر في حمص بتاريخ <span id="issueDateDisplay"></span>
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

                    <!-- ✅ QR -->
                    <div class="qr-section">
                        <div id="qrcode"></div>
                    </div>

                </div>

                <!-- ✅ بيانات الشهادة -->
                <div class="certificate-meta">
                    <span>رقم الشهادة: <span id="certNumberDisplay"></span></span>
                    <span id="dateDisplay"></span>
                </div>

            </div>
        </div>
    </div>

</div>

<!-- أزرار -->
<div class="controls">
    <button class="btn btn-print" onclick="printCertificate()">🖨️ طباعة</button>
    <button class="btn btn-pdf" onclick="downloadPDF()">📄 تحميل PDF</button>
</div>

<script src="../js/certificate.js"></script>

</body>
</html>
