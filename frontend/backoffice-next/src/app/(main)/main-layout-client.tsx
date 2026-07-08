"use client";

import { useEffect } from "react";

import { useRouter } from "next/navigation";

import { LoadingScreen } from "@/components/app-providers";
import { useAuth } from "@/contexts/AuthContext";
import AdminLayoutShell from "@/layouts/AdminLayout";

export default function MainLayoutClient({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return <LoadingScreen />;
  }

  return <AdminLayoutShell>{children}</AdminLayoutShell>;
}
