import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const name = process.env.ADMIN_NAME?.trim() || "Administrátor";

if (!email || !email.includes("@")) throw new Error("ADMIN_EMAIL nie je platný e-mail.");
if (!password || password.length < 12) throw new Error("ADMIN_PASSWORD musí mať aspoň 12 znakov.");

async function main() {
  const passwordHash = await bcrypt.hash(password!, 12);
  await prisma.user.upsert({
    where: { email: email! },
    create: { email: email!, name, passwordHash, role: "admin" },
    update: { name, passwordHash, role: "admin" },
  });
  console.log(`Admin účet ${email} je pripravený.`);
}

main()
  .finally(() => prisma.$disconnect())
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Vytvorenie admina zlyhalo.");
    process.exit(1);
  });
