"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { clearAllOfflineStorage } from "@/lib/offline";

export function LogoutButton() {
  const logout = async () => {
    try {
      // Bersihkan seluruh antrean mutasi offline dan cache pengguna agar tidak bocor ke sesi berikutnya
      clearAllOfflineStorage();
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Gagal saat logout:", err);
    } finally {
      // Gunakan hard redirect agar router cache & in-memory state komponen bersih total
      window.location.href = "/auth/login";
    }
  };

  return <Button onClick={logout}>Logout</Button>;
}
