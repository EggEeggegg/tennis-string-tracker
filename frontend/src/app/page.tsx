"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/utils";

// Root page: redirect based on auth state
export default function Root() {
  const router = useRouter();

  useEffect(() => {
    if (getToken()) {
      router.replace("/daily");
    } else {
      router.replace("/login");
    }
  }, [router]);

  return null;
}
