import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import {
  clearStoredSession,
  getAdminProfile,
  getStoredSession,
  restoreStoredSession,
  setStoredSession,
} from "../services/adminApi";

export default function ProtectedRoute() {
  const [status, setStatus] = useState("checking");
  const session = getStoredSession();

  useEffect(() => {
    let isMounted = true;

    const validateSession = async () => {
      if (!session?.token) {
        try {
          await restoreStoredSession();
          if (isMounted) {
            setStatus("authenticated");
          }
        } catch {
          if (isMounted) {
            setStatus("unauthenticated");
          }
        }
        return;
      }

      try {
        const response = await getAdminProfile();

        if (isMounted) {
          setStoredSession({
            token: session.token,
            user: response.user,
          });
          setStatus("authenticated");
        }
      } catch {
        clearStoredSession();

        if (isMounted) {
          setStatus("unauthenticated");
        }
      }
    };

    validateSession();

    return () => {
      isMounted = false;
    };
  }, [session?.token]);

  if (status === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="rounded-[28px] border border-slate-200 bg-white px-8 py-7 text-center shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">
            Admin Session
          </p>
          <p className="mt-3 text-lg font-semibold text-slate-900">
            Validating access...
          </p>
        </div>
      </div>
    );
  }

  if (status !== "authenticated") {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
