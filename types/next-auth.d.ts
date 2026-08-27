import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      verified: boolean;
      role: "USER" | "ADMIN";
    } & DefaultSession["user"];
  }

  interface User {
    verified?: boolean;
    role?: "USER" | "ADMIN";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    verified: boolean;
    role: "USER" | "ADMIN";
  }
}
