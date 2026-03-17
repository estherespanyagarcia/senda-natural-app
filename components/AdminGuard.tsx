"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AdminGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const isAuth = localStorage.getItem("sn_admin_auth") === "true";

    if (!isAuth) {
      router.replace("/admin");
      return;
    }

    setAllowed(true);
    setChecking(false);
  }, [router]);

  if (checking) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#f7f3ee",
        }}
      >
        <p>Verificando acceso...</p>
      </main>
    );
  }

  if (!allowed) return null;

  return <>{children}</>;
}