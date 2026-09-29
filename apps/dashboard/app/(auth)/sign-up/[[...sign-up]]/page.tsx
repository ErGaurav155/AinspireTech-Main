import { SignUp } from "@clerk/nextjs";

const SignUpPage = () => {
  return <SignUp fallbackRedirectUrl="/select-workspace" />;
};

export default SignUpPage;
