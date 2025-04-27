import { NextResponse } from 'next/server';

// Prüfen ob Token abgelaufen ist
function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch (e) {
    return true;
  }
}

export function middleware(request) {
  // Öffentliche Pfade definieren
  const publicPaths = ['/login', '/playground'];
  const isPublicPath = publicPaths.some(path => 
    request.nextUrl.pathname === path || 
    request.nextUrl.pathname.startsWith(`${path}/`)
  );
  
  // Token aus Cookies holen
  const token = request.cookies.get('auth_token')?.value;
  
  // Bei öffentlichen Pfaden immer Zugriff erlauben
  if (isPublicPath) {
    return NextResponse.next();
  }
  
  // Bei geschützten Pfaden Token prüfen
  if (!token || isTokenExpired(token)) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ],
};