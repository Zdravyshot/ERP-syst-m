import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export interface SessionData {
  userId?: string;
  name?: string;
  email?: string;
  role?: string;
}

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32 && !secret.includes("change-in-production")) return secret;
  if (process.env.NODE_ENV !== "production") return "zdravyshot-dev-secret-change-in-production-32ch";
  throw new Error("SESSION_SECRET musí byť v produkcii nastavený na náhodnú hodnotu s aspoň 32 znakmi.");
}

export const sessionOptions: SessionOptions = {
  password: getSessionSecret(),
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
