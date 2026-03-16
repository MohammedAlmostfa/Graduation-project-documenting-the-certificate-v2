<?php

use Psr\Log\LogLevel;
use Illuminate\Http\Request;
use Illuminate\Support\Lottery;
use App\Exceptions\CustomException;
use function Laravel\Prompts\error;
use Illuminate\Support\Facades\Log;
use Illuminate\Foundation\Application;
use Illuminate\Database\QueryException;
use App\Http\Middleware\CheckPermission;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Session\TokenMismatchException;
use Illuminate\Validation\ValidationException;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'auth' => \App\Http\Middleware\Authenticate::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {

        // 1. تجاهل استثناءات معينة عن الإبلاغ
        $exceptions->dontReport([
            AuthenticationException::class,
            ValidationException::class,
            AuthorizationException::class,
            NotFoundHttpException::class,
            ModelNotFoundException::class,
            TokenMismatchException::class,
        ]);

        // 3. منع تكرار الإبلاغ عن نفس الاستثناء
        $exceptions->dontReportDuplicates();

        // 4. تحديد مستوى log لاستثناءات معينة
        $exceptions->level(\PDOException::class, LogLevel::CRITICAL);
        $exceptions->level(QueryException::class, LogLevel::CRITICAL);
        $exceptions->level(NotFoundHttpException::class, LogLevel::NOTICE);
        $exceptions->level(MethodNotAllowedHttpException::class, LogLevel::WARNING);

        // 5. المعالجة العامة لجميع الاستثناءات - الإبلاغ
        $exceptions->report(function (Throwable $e) {
            if ($e instanceof \PDOException || $e instanceof QueryException) {
                Log::channel('database')->critical('Database Error: ' . $e->getMessage(), [
                    'exception' => $e,
                    'connection' => $e instanceof \PDOException ? $e->getMessage() : 'unknown'
                ]);
            }

            if (app()->environment('production') && !$e instanceof ValidationException) {
                // \Sentry\captureException($e);
            }
        });

        // 6. المعالجة العامة لجميع الاستثناءات - العرض
        $exceptions->render(function (Throwable $e, Request $request) {
            if (app()->environment('local')) {
                Log::debug('Exception occurred', [
                    'exception' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                    'trace' => $e->getTraceAsString()
                ]);
            }

            return null;
        });

        // 7. معالجة أخطاء 404
        $exceptions->render(function (NotFoundHttpException $e, Request $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'success' => 'error',
                    'message' => 'المورد المطلوب غير موجود',
                    'error_code' => 'RESOURCE_NOT_FOUND',
                    'status' => 404
                ], 404);
            }

            return null;
        });


        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'success' => 'error',
                    'message' => 'غير مسجل دخول',
                    'error_code' => 'UNAUTHENTICATED',
                    'status' => 401
                ], 401);
            }

            return redirect()->guest(route('login'))->with('error', 'يجب تسجيل الدخول أولاً');
        });

        $exceptions->render(function (AuthorizationException $e, Request $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'success' => 'error',
                    'message' => 'غير مسموح بهذا الإجراء',
                    'error_code' => 'UNAUTHORIZED',
                    'status' => 403
                ], 403);
            }

            return null;
        });

        $exceptions->render(function (ValidationException $e, Request $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'success' => 'error',
                    'message' => 'بيانات غير صالحة',
                    'errors' => $e->errors(),
                    'error_code' => 'VALIDATION_ERROR',
                    'status' => 422
                ], 422);
            }

            return redirect()->back()->withErrors($e->errors())->withInput();
        });

        // 11. معالجة أخطاء الطرق غير المسموحة
        $exceptions->render(function (MethodNotAllowedHttpException $e, Request $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'success' => 'error',
                    'message' => 'طريقة الطلب غير مسموحة',
                    'error_code' => 'METHOD_NOT_ALLOWED',
                    'status' => 405
                ], 405);
            }

            return null;
        });

        // 12. معالجة أخطاء CSRF Token
        $exceptions->render(function (TokenMismatchException $e, Request $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'success' => 'error',
                    'message' => 'انتهت صلاحية الجلسة',
                    'error_code' => 'CSRF_TOKEN_MISMATCH',
                    'status' => 419
                ], 419);
            }

            return redirect()->back()->with('error', 'انتهت صلاحية الجلسة، يرجى المحاولة مرة أخرى');
        });

        // 13. معالجة أخطاء قاعدة البيانات
        $exceptions->render(function (QueryException $e, Request $request) {
            $message = 'حدث خطأ في قاعدة البيانات';

            if (app()->environment('production')) {
                $message = 'حدث خطأ أثناء معالجة الطلب';
            }

            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'success' => 'error',
                    'message' => $message,
                    'error_code' => 'DATABASE_ERROR',
                    'status' => 500
                ], 500);
            }

            return null;
        });

        // 14. تحديد متى يُرجع JSON
        $exceptions->shouldRenderJsonWhen(function (Request $request, Throwable $e) {
            return $request->expectsJson() ||
                $request->is('api/*') ||
                $request->is('ajax/*') ||
                $request->header('X-Requested-With') === 'XMLHttpRequest';
        });

        // 15. الحد من الإبلاغ عن الاستثناءات
        $exceptions->throttle(function (Throwable $e) {
            if ($e instanceof QueryException) {
                return Limit::perMinute(100)->by('database_errors');
            }

            if ($e instanceof NotFoundHttpException) {
                return Lottery::odds(5, 100);
            }

            return Limit::perHour(500)->by('general_errors');
        });

        // 16. تخصيص response العام لجميع الأخطاء
        $exceptions->respond(function (SymfonyResponse $response, Throwable $e) {
            $response->headers->set('X-Content-Type-Options', 'nosniff');
            $response->headers->set('X-Frame-Options', 'DENY');
            $response->headers->set('X-XSS-Protection', '1; mode=block');

            if ($response->getStatusCode() >= 500) {
                if (app()->environment('production')) {
                    Log::error('Server Error', [
                        'exception' => $e->getMessage(),
                        'url' => request()->fullUrl(),
                        'ip' => request()->ip()
                    ]);
                }
            }

            return $response;
        });

    })->create();
