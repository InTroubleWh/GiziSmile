import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = {
  title: "Verifikasi Email Terkirim — GiziSmile",
  description: "Cek email Anda untuk konfirmasi pendaftaran akun GiziSmile.",
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
        <Card className="border shadow-lg">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">
              Pendaftaran Berhasil!
            </CardTitle>
            <CardDescription>
              Cek kotak masuk atau folder spam email Anda
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center leading-relaxed">
              Tautan konfirmasi telah dikirimkan ke alamat email Anda. Silakan klik tautan tersebut sebelum masuk ke akun.
            </p>
            <Link href="/auth/login" className="block w-full">
              <Button className="w-full" size="default">
                Masuk ke Akun
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
