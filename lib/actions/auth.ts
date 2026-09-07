"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth, signIn, signOut } from "@/lib/auth";
import { isAutoVerifiedEmail } from "@/lib/verification";

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

export async function loginAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return "Invalid email or password.";
        default:
          return "Something went wrong signing in.";
      }
    }
    throw error;
  }
}

export async function registerAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name || !email || !password) {
    return "All fields are required.";
  }
  // Checked here as well as in the browser: the checkbox is `required` in the markup, but
  // that is a client-side courtesy, and an account must not be creatable without a record
  // of the person having agreed.
  if (formData.get("consent") !== "yes") {
    return "Please agree to the Terms & Conditions and Privacy Policy to create an account.";
  }
  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return "An account with that email already exists.";
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      verified: isAutoVerifiedEmail(email),
    },
  });

  await signIn("credentials", { email, password, redirectTo: "/" });
}

// Every write action that uses session.user.id as a foreign key should go through this
// rather than calling auth() directly. A JWT session stays "valid" (correctly signed)
// even if the underlying user row is gone — e.g. the database got reset since this
// browser last logged in — so without this check, the first vote/comment/post after that
// crashes with a raw Prisma foreign-key error instead of just asking the user to log in
// again.
export async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true },
  });
  if (!user) {
    await signOut({ redirectTo: "/login" });
    redirect("/login"); // unreachable in practice — signOut always redirects — but keeps this function's return type honest
  }

  return user.id;
}
