import { SignIn } from "@clerk/nextjs";

const SignInPage = () => {
  return <SignIn fallbackRedirectUrl="/select-workspace" />;
};

export default SignInPage;
