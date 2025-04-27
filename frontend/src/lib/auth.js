import { parseCookies, setCookie, destroyCookie } from 'nookies';

// Token-Ablaufzeit prüfen
export function isTokenExpired(token) {
  if (!token) return true;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch (e) {
    return true;
  }
}

// Token-Erneuerungszeitpunkt berechnen (2 Minuten vor Ablauf)
export function getRefreshTime(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiryTime = payload.exp * 1000;
    return expiryTime - Date.now() - (2 * 60 * 1000); // 2 Minuten vor Ablauf
  } catch (e) {
    return 0;
  }
}

// Token in Cookie speichern
export function setAuthToken(token) {
  setCookie(null, 'auth_token', token, {
    maxAge: 30 * 60, // 30 Minuten
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
}

// Token aus Cookies löschen
export function removeAuthToken() {
  destroyCookie(null, 'auth_token', { path: '/' });
}

// Token aus Cookies holen
export function getAuthToken() {
  const cookies = parseCookies();
  return cookies.auth_token;
}