<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>نظام البلوكتشين للشهادات الجامعية - جامعة حمص</title>
    <link rel="stylesheet" href="../css/dashboard.css">
</head>
<body>
    <!-- Top Bar -->
    <div class="top-bar">
        الجمهورية العربية السورية - وزارة التعليم العالي
    </div>

    <!-- Header -->
    <div class="header">
        <div class="header-content">
            <div class="logo-container">
                <div class="logo-placeholder">
                   <img src="../img/image.png" alt="شعار الجامعة">
                </div>
            </div>

            <div class="university-info">
                <h1 class="university-name-ar">جامعة حمص</h1>
                <p class="university-name-en">HOMS UNIVERSITY</p>
                <div class="system-title">نظام البلوكتشين للشهادات الجامعية</div>
            </div>

            <div class="logo2-placeholder">
                   <img src=" ../img/image copy.png" alt="شعار الوزارة">
            </div>
        </div>
    </div>

    <div class="container">
        <!-- Statistics -->
        <div class="stats-bar">
            <div class="stat-card">
                <div class="stat-value" id="statCertificatesCount">0</div>
                <div class="stat-label">شهادات مسجلة</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="statBlocksCount">0</div>
                <div class="stat-label">عدد الكتل</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="statPendingCount">0</div>
                <div class="stat-label">في الانتظار</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" id="statDifficultyValue">4</div>
                <div class="stat-label">صعوبة التعدين</div>
            </div>
        </div>

        <!-- Top Panels -->
        <div class="top-panels">
            <div class="panel">
                <div class="panel-title">الشهادات المسجلة</div>
                <div class="cert-list" id="certsList"></div>
            </div>

            <div class="panel">
                <div class="panel-title">قائمة انتظار التعدين</div>
                <div class="cert-list" id="pendingList"></div>
            </div>
        </div>

        <!-- Blockchain Visualization -->
        <div class="blockchain-section">
            <div class="blockchain-title">⛓️ سلسلة الكتل المترابطة (انقر على أي كتلة لعرض التفاصيل)</div>

            <div class="chain-canvas">
                <svg class="chain-lines" id="chainSvg"></svg>
                <div class="blocks-container" id="blocksContainer"></div>
            </div>
        </div>
    </div>

    <!-- Footer -->
    <div class="footer">
        <p class="footer-text">© 2025 جامعة حمص - جميع الحقوق محفوظة</p>
        <p class="footer-text" style="margin-top: 8px; font-size: 12px;">
            نظام البلوكتشين للشهادات الجامعية | Blockchain Technology
        </p>
    </div>

    <!-- Modal -->
    <div class="modal-overlay" id="modalOverlay">
        <div class="modal-content" id="modalContent"></div>
    </div>

    <script src="../js/dashboard.js"></script>
</body>
</html>
