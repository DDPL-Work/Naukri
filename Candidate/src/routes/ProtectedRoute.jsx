import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import {
  getCandidateMe,
  restoreStoredSession,
  setStoredUser,
  clearStoredUser,
  getStoredUser,
} from "../services/candidateApi";

export default function ProtectedRoute() {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    let isMounted = true;

    const validateSession = async () => {
      try {
        const response = await getCandidateMe();
        if (!isMounted) return;

        setStoredUser({
          user: response.user,
          profile: response.profile,
        });
        setStatus("authenticated");
      } catch {
        if (!isMounted) return;

        try {
          const refreshed = await restoreStoredSession();
          if (!isMounted) return;
          setStoredUser({
            user: refreshed.user,
            profile: refreshed.profile,
          });
          setStatus("authenticated");
        } catch {
          if (!isMounted) return;
          clearStoredUser();
          setStatus("unauthenticated");
        }
      }
    };

    validateSession();

    return () => {
      isMounted = false;
    };
  }, []);

  if (status === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="rounded-[28px] border border-slate-200 bg-white px-8 py-7 text-center shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">
            Candidate Session
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
