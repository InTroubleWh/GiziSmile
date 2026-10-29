"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { UserCheck, Stethoscope, HeartHandshake, Loader2, ShieldCheck } from "lucide-react";

const DEMO_ACCOUNTS = [
  {
    role: "admin",
    title: "Administrator",
    desc: "Hak akses: Kelola akun & registrasi Kader dan Ahli Gizi",
    email: "admin@gizismile.id",
    password: "password123",
    icon: ShieldCheck,
    color: "bg-rose-600 hover:bg-rose-700 text-white",
  },
  {
    role: "kader",
    title: "Kader Posyandu",
    desc: "Hak akses: Input pengukuran, hitung Z-score, kelola balita",
    email: "kader@gizismile.id",
    password: "password123",
    icon: UserCheck,
    color: "bg-emerald-600 hover:bg-emerald-700 text-white",
  },
  {
    role: "nutritionist",
    title: "Ahli Gizi Puskesmas",
    desc: "Hak akses: Analitik stunting wilayah & intervensi resep",
    email: "gizi@gizismile.id",
    password: "password123",
    icon: Stethoscope,
    color: "bg-blue-600 hover:bg-blue-700 text-white",
  },
  {
    role: "parent",
    title: "Orang Tua Balita",
    desc: "Hak akses: Pantau grafik pertumbuhan & rekomendasi resep",
    email: "ortu@gizismile.id",
    password: "password123",
    icon: HeartHandshake,
    color: "bg-amber-600 hover:bg-amber-700 text-white",
  },
];

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeDemo, setActiveDemo] = useState<string | null>(null);

  const handleLogin = async (
    e?: React.FormEvent,
    customEmail?: string,
    customPassword?: string,
    demoAccount?: (typeof DEMO_ACCOUNTS)[0],
  ) => {
    if (e) e.preventDefault();
    const targetEmail = customEmail || email;
    const targetPassword = customPassword || password;

    if (!targetEmail || !targetPassword) {
      setError("Email dan password wajib diisi");
      return;
    }

    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password: targetPassword,
      });

      if (signInError) {
        // Jika akun demo belum ada di auth.users Supabase, buatkan akun secara otomatis
        if (
          demoAccount &&
          (signInError.message.toLowerCase().includes("invalid") ||
            signInError.message.toLowerCase().includes("not found"))
        ) {
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: targetEmail,
            password: targetPassword,
            options: {
              data: {
                full_name: demoAccount.title,
                role: demoAccount.role,
              },
            },
          });

          if (!signUpError && signUpData.user) {
            const destination = demoAccount.role === "admin" ? "/admin/users" : "/z-score";
            // Hard navigation untuk mereset seluruh router cache dan prefetch unauthenticated
            window.location.href = destination;
            return;
          }
        }
        throw signInError;
      }

      // Tentukan rute tujuan berdasarkan role
      let userRole = demoAccount?.role;
      if (!userRole && signInData?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", signInData.user.id)
          .maybeSingle();
        userRole = profile?.role || (signInData.user.user_metadata?.role as string);
      }

      const destination = userRole === "admin" ? "/admin/users" : "/z-score";
      // Hard navigation untuk mereset seluruh router cache dan prefetch unauthenticated
      window.location.href = destination;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal masuk ke akun");
    } finally {
      setIsLoading(false);
      setActiveDemo(null);
    }
  };

  const handleDemoLogin = (account: (typeof DEMO_ACCOUNTS)[0]) => {
    setEmail(account.email);
    setPassword(account.password);
    setActiveDemo(account.role);
    handleLogin(undefined, account.email, account.password, account);
  };

  return (
    <div className={cn("flex flex-col gap-6 max-w-md w-full mx-auto", className)} {...props}>
      <Card className="border shadow-lg">
        <CardHeader className="space-y-1">
          <div className="flex justify-center pb-2">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-2 flex items-center justify-center shadow-sm overflow-hidden">
              <Image
                src="/Logo_GiziSmile.svg"
                alt="Logo GiziSmile"
                width={48}
                height={48}
                className="w-full h-full object-contain"
                priority
              />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-center">
            Masuk ke GiziSmile
          </CardTitle>
          <CardDescription className="text-center text-sm">
            Sistem Pemantauan Stunting & Rekomendasi Gizi Presisi
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Section: One-Click Demo Login untuk Juri */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Evaluasi Cepat Dewan Juri (1-Click Demo)
              </span>
            </div>
            <div className="grid gap-2">
              {DEMO_ACCOUNTS.map((acc) => {
                const Icon = acc.icon;
                const isSelected = activeDemo === acc.role;
                return (
                  <button
                    key={acc.role}
                    type="button"
                    onClick={() => handleDemoLogin(acc)}
                    disabled={isLoading}
                    className={cn(
                      "flex items-start gap-3 p-3 text-left rounded-lg border transition-all text-sm",
                      "hover:bg-accent hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary",
                      isSelected && "ring-2 ring-primary bg-accent",
                    )}
                  >
                    <div className={cn("p-2 rounded-md shrink-0", acc.color)}>
                      {isSelected && isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-foreground flex items-center justify-between">
                        <span>{acc.title}</span>
                        <span className="text-xs font-mono text-muted-foreground">{acc.email}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {acc.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Atau masuk manual</span>
            </div>
          </div>

          {/* Form Login Manual */}
          <form onSubmit={(e) => handleLogin(e)} className="space-y-4" autoComplete="on">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="nama@contoh.id"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                suppressHydrationWarning
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/auth/forgot-password"
                  className="text-xs text-muted-foreground hover:underline"
                >
                  Lupa password?
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                suppressHydrationWarning
              />
            </div>

            {error && (
              <div className="p-3 text-xs text-destructive bg-destructive/10 rounded-md border border-destructive/20">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full font-medium"
              disabled={isLoading}
              suppressHydrationWarning
            >
              {isLoading && !activeDemo ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sedang Masuk...
                </>
              ) : (
                "Masuk ke Akun"
              )}
            </Button>
          </form>

          <div className="text-center text-xs text-muted-foreground">
            Belum punya akun?{" "}
            <Link href="/auth/sign-up" className="underline underline-offset-4 hover:text-foreground">
              Daftar akun baru
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
