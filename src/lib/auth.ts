import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export interface SessionData {
  userId?: string;
  name?: string;
  email?: string;
  role?: string;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET ?? "zdravyshot-dev-secret-change-in-production-32ch",
  cookieName: "zs_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

/** Použiť na začiatku každej server action a chránenej stránky. */
export async function requireUser(): Promise<Required<SessionData>> {
  const session = await getSession();
  if (!session.userId) redirect("/login");
  return session as Required<SessionData>;
}
