import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LoginForm } from "@/components/login-form";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Masuk ke Akun — GiziSmile",
  description: "Masuk ke platform GiziSmile dengan 1-Click Demo Login atau email terdaftar.",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-6 md:p-10 bg-muted/20">
      <div className="w-full max-w-md space-y-4">
        <div>
          <Link href="/">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
              Kembali ke Beranda
            </Button>
          </Link>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
