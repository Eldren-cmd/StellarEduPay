import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export function useAdminAuth() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [schoolId, setSchoolId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [checked, setChecked] = useState(false);

  // Fetch user context from /auth/me — includes schoolId from authenticated session.
  // The HttpOnly cookie is sent automatically by the browser; we never touch it from JS.
  useEffect(() => {
    fetch(`${API_URL}/auth/me`, { credentials: 'include' })
      .then((r) => {
        if (r.ok) {
          return r.json();
        }
        throw new Error('Not authenticated');
      })
      .then((data) => {
        setIsAdmin(true);
        setSchoolId(data.schoolId || null);
        setUserId(data.userId || null);
        // Store school context for API interceptor to use
        if (typeof window !== 'undefined') {
          if (data.schoolId) {
            localStorage.setItem('schoolId', data.schoolId);
          }
          if (data.userId) {
            localStorage.setItem('userId', data.userId);
          }
        }
      })
      .catch(() => {
        setIsAdmin(false);
        setSchoolId(null);
        setUserId(null);
      })
      .finally(() => setChecked(true));
  }, []);

  const login = useCallback(() => {
    // Called after a successful POST /auth/login — the cookie is already set.
    // Fetch user context to get the school ID
    fetch(`${API_URL}/auth/me`, { credentials: 'include' })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) {
          setSchoolId(data.schoolId || null);
          setUserId(data.userId || null);
          // Store school context for API interceptor to use
          if (typeof window !== 'undefined') {
            if (data.schoolId) {
              localStorage.setItem('schoolId', data.schoolId);
            }
            if (data.userId) {
              localStorage.setItem('userId', data.userId);
            }
          }
        }
        setIsAdmin(true);
      })
      .catch(() => {
        setIsAdmin(true);
        // Fall back to no school ID if unable to fetch
        setSchoolId(null);
        setUserId(null);
      });
  }, []);

  const logout = useCallback(async () => {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => console.debug('[useAdminAuth] logout request failed'));
    setIsAdmin(false);
    setSchoolId(null);
    setUserId(null);
    // Clear school context from storage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('schoolId');
      localStorage.removeItem('userId');
    }
    router.push('/login');
  }, [router]);

  return { isAdmin, checked, login, logout, schoolId, userId };
}
