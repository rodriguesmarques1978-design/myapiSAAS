import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { waitlistSchema } from "@/lib/validations";

// Codigo do Postgres para violacao de unique constraint.
const UNIQUE_VIOLATION = "23505";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = waitlistSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  if (!supabase) {
    // Nao expor detalhes de configuracao ao cliente.
    console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set");
    return NextResponse.json(
      { error: "Waitlist is temporarily unavailable." },
      { status: 503 },
    );
  }

  const { error } = await supabase.from("waitlist").insert({
    email: parsed.data.email.toLowerCase(),
    project: parsed.data.project ?? null,
    stack: parsed.data.stack ?? null,
  });

  // Email repetido nao e erro para o utilizador — ja esta inscrito.
  if (error?.code === UNIQUE_VIOLATION) {
    return NextResponse.json({ success: true, alreadySubscribed: true });
  }

  if (error) {
    console.error("Supabase insert failed", error.code, error.message);
    return NextResponse.json(
      { error: "Could not join the waitlist. Please try again." },
      { status: 502 },
    );
  }

  return NextResponse.json({ success: true });
}
