import { User, UserRole } from "@/shared/types/user";

export const SESSION_COOKIE_NAME = "careops_auth_session";
export const TOKEN_COOKIE_NAME = "careops_jwt_token";
export const ROLE_COOKIE_NAME = "careops_active_role";

const STORAGE_KEY = "careops_auth_session";
const TOKEN_KEY = "careops_jwt_token";

/**
 * Parses user object safely from encoded cookie value
 */
export function parseSessionFromCookieValue(cookieValue?: string | null): User | null {
  if (!cookieValue) return null;
  try {
    const decoded = decodeURIComponent(cookieValue);
    const parsed = JSON.parse(decoded);
    if (parsed && typeof parsed === "object" && parsed.id && parsed.name && parsed.role) {
      return parsed as User;
    }
  } catch (err) {
    // Malformed session cookie, ignore
  }
  return null;
}

/**
 * Saves authenticated session across both browser cookies and localStorage
 */
export function saveSession(user: User, token?: string | null): void {
  if (typeof window === "undefined") return;

  const userJson = JSON.stringify(user);
  const encodedUser = encodeURIComponent(userJson);

  // Set cookies valid for 30 days
  const maxAge = 60 * 60 * 24 * 30; // 30 days
  document.cookie = `${SESSION_COOKIE_NAME}=${encodedUser}; path=/; max-age=${maxAge}; SameSite=Lax`;
  document.cookie = `${ROLE_COOKIE_NAME}=${encodeURIComponent(user.role)}; path=/; max-age=${maxAge}; SameSite=Lax`;

  if (token) {
    document.cookie = `${TOKEN_COOKIE_NAME}=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=Lax`;
    localStorage.setItem(TOKEN_KEY, token);
  }

  try {
    localStorage.setItem(STORAGE_KEY, userJson);
  } catch (e) {
    console.error("Failed to write user to localStorage", e);
  }
}

/**
 * Clears authenticated session from both browser cookies and localStorage
 */
export function clearSession(): void {
  if (typeof window === "undefined") return;

  // Expire cookies immediately
  document.cookie = `${SESSION_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
  document.cookie = `${ROLE_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
  document.cookie = `${TOKEN_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;

  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TOKEN_KEY);
  } catch (e) {
    console.error("Failed to clear localStorage", e);
  }
}

/**
 * Retrieves stored user session on the client
 */
export function getClientSession(): User | null {
  if (typeof window === "undefined") return null;

  // 1. Try reading from cookie first for freshness
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${SESSION_COOKIE_NAME}=`));

  if (match) {
    const val = match.split("=")[1];
    const parsed = parseSessionFromCookieValue(val);
    if (parsed) return parsed;
  }

  // 2. Fall back to localStorage
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.id && parsed.role) {
        // Re-sync to cookie
        saveSession(parsed);
        return parsed;
      }
    }
  } catch (e) {
    // ignore
  }

  return null;
}

/**
 * Retrieves JWT token on the client
 */
export function getClientToken(): string | null {
  if (typeof window === "undefined") return null;

  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${TOKEN_COOKIE_NAME}=`));

  if (match) {
    return decodeURIComponent(match.split("=")[1]);
  }

  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
