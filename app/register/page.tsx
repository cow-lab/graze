import AuthForm from "@/components/AuthForm";
import { registerAction } from "@/lib/actions/auth";

export default function RegisterPage() {
  return (
    <AuthForm
      title="Sign up"
      subtitle="An account gets you a board, and lets you comment on papers."
      action={registerAction}
      submitLabel="Create account"
      altHref="/login"
      altLabel="Already have an account? Log in"
      requireConsent
      fields={[
        { name: "name", label: "Name", type: "text", autoComplete: "name" },
        { name: "email", label: "Email", type: "email", autoComplete: "email" },
        { name: "password", label: "Password", type: "password", autoComplete: "new-password" },
      ]}
    />
  );
}
