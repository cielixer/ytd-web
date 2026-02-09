export async function checkAuth(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/status");
    const data = await res.json();
    return data.authenticated === true;
  } catch {
    return false;
  }
}
