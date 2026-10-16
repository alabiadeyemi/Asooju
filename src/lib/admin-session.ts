const KEY = "asooju_admin_token";
const EMAIL_KEY = "asooju_admin_email";

export function readAdminToken(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function readAdminEmail(): string | null {
  try {
    return localStorage.getItem(EMAIL_KEY);
  } catch {
    return null;
  }
}

export function writeAdminSession(token: string, email: string) {
  localStorage.setItem(KEY, token);
  localStorage.setItem(EMAIL_KEY, email);
}

export function clearAdminSession() {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(EMAIL_KEY);
  } catch {
    /* ignore */
  }
}

export function hasAdminSession(): boolean {
  return Boolean(readAdminToken());
}
