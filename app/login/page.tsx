import { LoginForm } from "@/components/login-form";

export const metadata = {
  title: "Masuk ke Akun — GiziSmile",
  description: "Masuk ke platform GiziSmile dengan 1-Click Demo Login atau email terdaftar.",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-muted/20">
      <div className="w-full max-w-md">
        <LoginForm />
      </div>
    </div>
  );
}
