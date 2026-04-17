"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { UNIT_COOKIE } from "@/lib/units";

export async function setUnit(unitId: string) {
  cookies().set(UNIT_COOKIE, unitId, {
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
  return { ok: true };
}
