import { SignIn } from "@clerk/nextjs";

export default function AcceptInvitationPage() {
  return <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 py-12"><SignIn fallbackRedirectUrl="/select-workspace" signUpFallbackRedirectUrl="/select-workspace" /></main>;
}
