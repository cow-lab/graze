import AuthForm from "@/components/AuthForm";
import { registerAction } from "@/lib/actions/auth";

export default function RegisterPage() {
  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold text-center">Sign up</h1>
      <p className="text-center text-sm text-fg-muted mt-1">
        Add and verify your affiliations from your profile after signing up.
      </p>
      <AuthForm
        action={registerAction}
        submitLabel="Create account"
        altHref="/login"
        altLabel="Already have an account? Log in"
        fields={[
          { name: "name", label: "Name", type: "text", autoComplete: "name" },
          { name: "email", label: "Email", type: "email", autoComplete: "email" },
          { name: "password", label: "Password", type: "password", autoComplete: "new-password" },
        ]}
      />
    </div>
  );
}
