
/**
 * Notify the application that authentication state has changed.
 * This triggers NavbarClient and other components to re-check auth status.
 */
export function notifyAuthStateChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('authStateChanged'));
  }
}

/**
 * Get a client-side cookie value
 */
export function getClientSideCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;

  return document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))
    ?.split('=')[1];
}

/**
 * Set a cookie on the client side
 */
export function setClientSideCookie(name: string, value: string, days: number = 7) {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value}; expires=${expires.toUTCString()}; path=/`;
}

/**
 * Delete a cookie on the client side
 */
export function deleteClientSideCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}