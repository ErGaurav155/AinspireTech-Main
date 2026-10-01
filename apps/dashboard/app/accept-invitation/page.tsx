import { SignIn } from "@clerk/nextjs";
import { ThemeToggle } from "@rocketreplai/ui";

export default function AcceptInvitationPage() {
  return <main className="relative flex min-h-screen items-center justify-center bg-slate-50 px-5 py-12 transition-colors dark:bg-slate-950"><div className="absolute right-5 top-5"><ThemeToggle /></div><SignIn fallbackRedirectUrl="/select-workspace" signUpFallbackRedirectUrl="/select-workspace" /></main>;
}
