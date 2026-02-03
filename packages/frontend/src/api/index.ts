/**
 * API Client Instance
 *
 * This module exports a singleton instance of the AdminDashboardApi
 * configured with the appropriate base URL and token getters.
 */

import { getIdToken, getIdTokenForced } from '@/lib/firebase';
import { AdminDashboardApi } from './generated';

// Re-export everything from generated for convenience
export * from './generated';

// API Base URL from environment
const API_BASE_URL = process.env.VITE_API_BASE_URL || '/api';

/**
 * Singleton instance of the Admin Dashboard API client
 */
export const api = new AdminDashboardApi(API_BASE_URL, getIdToken, getIdTokenForced);

// Default export for convenience
export default api;
