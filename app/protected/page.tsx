import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InfoIcon } from "lucide-react";
import { Suspense } from "react";

async function UserDetails() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return JSON.stringify(data.claims, null, 2);
}

export default function ProtectedPage() {
  return (
    <div className="flex-1 w-full flex flex-col gap-12">
      <div className="w-full">
        <div className="bg-accent text-sm p-3 px-5 rounded-md text-foreground flex gap-3 items-center">
          <InfoIcon size="16" strokeWidth={2} />
          Halaman ini dilindungi dan hanya dapat diakses setelah masuk ke akun GiziSmile.
        </div>
      </div>
      <div className="flex flex-col gap-2 items-start">
        <h2 className="font-bold text-2xl mb-4">Informasi Sesi Pengguna</h2>
        <pre className="text-xs font-mono p-3 rounded border max-h-48 overflow-auto w-full">
          <Suspense fallback={<div>Memuat sesi...</div>}>
            <UserDetails />
          </Suspense>
        </pre>
      </div>
    </div>
  );
}
