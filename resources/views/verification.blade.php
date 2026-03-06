<!DOCTYPE html>
<html lang="ar" dir="rtl">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>التحقق من الشهادات - جامعة حمص</title>
    <link rel="stylesheet" href="{{ url('css/verification.css') }}">
    <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap" rel="stylesheet">
</head>

<body>
    <div class="top-bar">
        الجمهورية العربية السورية - وزارة التعليم العالي
    </div>

    <!-- Header -->
    <div class="header">
        <div class="header-content">
            <div class="logo-container">
                <div class="logo-placeholder">
                    <img src="../img/image.png" alt="">
                </div>
            </div>

            <div class="university-info">
                <h1 class="university-name-ar">جامعة حمص</h1>
                <p class="university-name-en">HOMS UNIVERSITY</p>
                <div class="system-title">نظام التحقق الإلكتروني من صحة الشهادات الجامعية</div>
            </div>

            <div class="logo2-placeholder">
                <img class="logo2" src="../img/image copy.png">
            </div>
        </div>
    </div>

    <!-- Main Content -->
    <div class="main-content">
        <!-- Search Card -->
        <div class="search-card">
            <div class="search-header">
                <h2>التحقق من صحة الشهادة</h2>
                <p>يرجى إدخال رقم الشهادة للتحقق من صحتها وأصالتها</p>
            </div>

            <form class="search-form" id="verifyForm">
                <div class="form-group">
                    <label class="form-label" for="certNumber">رقم الشهادة</label>
                    <input type="text" id="certNumber" class="form-input" placeholder="مثال: CERT-2024-A1B2C3D4"
                        required>
                </div>
                <button type="submit" class="btn-submit">تحقق من الشهادة</button>
            </form>

            <div class="loading-state" id="loadingState">
                <div class="spinner"></div>
                <p class="loading-text">جاري التحقق من الشهادة، يرجى الانتظار...</p>
            </div>
        </div>

        <!-- Result Card -->
        <div class="result-card" id="resultCard">
            <div id="resultContent"></div>
        </div>
    </div>

    <!-- Footer -->
    <div class="footer">
        <p class="footer-text">© 2024 جامعة حمص - جميع الحقوق محفوظة</p>
        <p class="footer-text" style="margin-top: 8px; font-size: 12px;">
            نظام التحقق الإلكتروني من الشهادات | Blockchain Technology
        </p>
    </div>

    <script src="../js/verification.js"></script>
</body>

</html>
