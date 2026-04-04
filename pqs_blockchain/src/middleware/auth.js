import { logger } from "../utils/logger.js";
import { keyService } from "../bootstrap.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { roles, roleHierarchy } from "../config/security.js";

/**
 * Authentication & Authorization Middleware
 * -----------------------------------------
 * Provides user authentication based on request headers and role-based
 * authorization for protected routes.
 */
export const auth = {
    /**
     * Authenticate user by `x-user-id` header.
     * Attaches user data to `req.user` if valid.
     */
    authenticate: async (req, res, next) => {
            const userId = req.headers["x-user-id"];

        // Require user ID header
        if (!userId) {
            return res.status(401).json(
                ApiResponse.error(
                    "مطلوب تسجيل الدخول",
                    "AUTH_REQUIRED",
                    "يرجى توفير معرف المستخدم في الهيدر: x-user-id"
                )
            );
        }

        try {
            // Fetch user data; KeyService returns a User instance
            const user = await keyService.getUser(userId);

            if (!user) {
                return res.status(401).json(
                    ApiResponse.error("فشل التحقق من الهوية", "AUTH_FAILED", "المستخدم غير موجود")
                );
            }

            // ensure hasPermission uses central roleHierarchy
            if (!user.hasPermission) {
                user.hasPermission = (requiredRole) => {
                    const userLevel = roleHierarchy[user.role] || 0;
                    const requiredLevel = roleHierarchy[requiredRole] || 0;
                    return userLevel >= requiredLevel;
                };
            }

            req.user = user; // instance with helper methods

            logger.debug(
                `🔐 Authenticated user: ${user.username} (${user.role}) - ID: ${userId}`
            );
            next();
        } catch (error) {
            logger.error(`❌ Authentication error: ${error.message}`);
            res.status(401).json(
                ApiResponse.error("فشل التحقق من الهوية", "AUTH_ERROR", error.message)
            );
        }
    },

    /**
     * Require a specific role for access.
     * @param {string} requiredRole - Minimum role required.
     */
    requireRole: (requiredRole) => {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json(
                    ApiResponse.error("يجب تسجيل الدخول أولاً", "AUTH_REQUIRED", null)
                );
            }

            if (req.user.hasPermission(requiredRole)) {
                return next();
            }

            res.status(403).json(
                ApiResponse.error(
                    "صلاحيات غير كافية",
                    "FORBIDDEN",
                    `الدور المطلوب: ${requiredRole}`
                )
            );
        };
    },

    /**
     * Shortcut middlewares for specific roles (now using constants)
     */
};
