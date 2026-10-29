import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SignUpForm } from "@/components/sign-up-form";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Daftar Akun Baru — GiziSmile",
  description: "Daftar akun baru di platform GiziSmile.",
};

export default function Page() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-6 md:p-10 bg-muted/20">
      <div className="w-full max-w-sm space-y-4">
        <div>
          <Link href="/auth/login">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Login
            </Button>
          </Link>
        </div>
        <SignUpForm />
      </div>
    </div>
  );
}
