// ============================================================================
// BASED DATA v10.0 - Session Management
// Anonymous session tracking for history persistence
// ============================================================================

const SESSION_STORAGE_KEY = 'baseddata_session_id';

/**
 * Get or create a persistent session ID for anonymous users.
 * This ID is used to track query history across browser sessions.
 */
export function getSessionId(): string {
  // Check if we have an existing session ID
  let sessionId = localStorage.getItem(SESSION_STORAGE_KEY);
  
  if (!sessionId) {
    // Generate a new session ID
    sessionId = `sess_${crypto.randomUUID()}`;
    localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  }
  
  return sessionId;
}

/**
 * Clear the current session (useful for logout or reset)
 */
export function clearSession(): void {
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

/**
 * Check if a session exists
 */
export function hasSession(): boolean {
  return !!localStorage.getItem(SESSION_STORAGE_KEY);
}
