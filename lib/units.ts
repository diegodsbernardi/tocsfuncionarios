import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type Unit = {
  id: string;
  slug: string;
  name: string;
};

const COOKIE_NAME = "tocs_unit";

export async function listUnits(): Promise<Unit[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("units")
    .select("id, slug, name")
    .order("name");
  return (data || []) as Unit[];
}

export async function getCurrentUnit(): Promise<Unit | null> {
  const units = await listUnits();
  if (units.length === 0) return null;

  const cookieStore = cookies();
  const stored = cookieStore.get(COOKIE_NAME)?.value;
  if (stored) {
    const found = units.find((u) => u.id === stored);
    if (found) return found;
  }

  // Fallback: default_unit_id do profile
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("default_unit_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (profile?.default_unit_id) {
      const found = units.find((u) => u.id === profile.default_unit_id);
      if (found) return found;
    }
  }

  return units[0];
}

export async function getCurrentProfile() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("user_id, full_name, role, default_unit_id")
    .eq("user_id", user.id)
    .maybeSingle();
  return data as {
    user_id: string;
    full_name: string | null;
    role: "admin" | "funcionario";
    default_unit_id: string | null;
  } | null;
}

export const UNIT_COOKIE = COOKIE_NAME;
