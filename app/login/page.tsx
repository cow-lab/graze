import AuthForm from "@/components/AuthForm";
import { loginAction } from "@/lib/actions/auth";

export default function LoginPage() {
  return (
    <div>
      <h1 className="font-heading text-2xl font-semibold text-center">Log in</h1>
      <AuthForm
        action={loginAction}
        submitLabel="Log in"
        altHref="/register"
        altLabel="Need an account? Sign up"
        fields={[
          { name: "email", label: "Email", type: "email", autoComplete: "email" },
          { name: "password", label: "Password", type: "password", autoComplete: "current-password" },
        ]}
      />
    </div>
  );
}
