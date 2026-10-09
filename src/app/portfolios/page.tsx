"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PortfoliosRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-subtle border-t-tech-blue"></div>
    </div>
  );
}
