import { NextResponse } from "next/server";

/**
 * Stub pre budúce napojenie externého modelu na sledovanie konkurencie.
 * Kontrakt sa dohodne pri integrácii — zatiaľ vracia not_implemented.
 */
export async function GET() {
  return NextResponse.json({
    status: "not_implemented",
    message: "Model na sledovanie konkurencie zatiaľ nie je pripojený.",
  });
}
