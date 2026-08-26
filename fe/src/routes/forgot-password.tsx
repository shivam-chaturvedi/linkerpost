import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthSidePanel } from "@/components/site/AuthSidePanel";
import { Logo } from "@/components/site/Logo";
import { supportMailto } from "@/lib/support";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Forgot Password — Linker Post" },
      { name: "description", content: "Reset your Linker Post password." },
    ],
  }),
  component: ForgotPassword,
});

function ForgotPassword() {
  return (
    <div className="grid min-h-screen grid-cols-1 bg-background sm:grid-cols-2">
      <div className="flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <Logo className="mb-10" />

          <h1 className="font-display text-3xl tracking-tight">Forgot password?</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Contact support from the email address associated with your account for account
            recovery.
          </p>
          <a
            href={supportMailto("Account recovery")}
            className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-black px-5 py-3 text-sm font-medium text-white hover:bg-black/90"
          >
            Contact support
          </a>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Remember your password?{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
          <div className="mt-6 flex justify-center gap-4 text-xs text-muted-foreground">
            <Link to="/terms-of-service" className="hover:underline">
              Terms of Service
            </Link>
            <span>·</span>
            <Link to="/privacy-policy" className="hover:underline">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
      <AuthSidePanel />
    </div>
  );
}
