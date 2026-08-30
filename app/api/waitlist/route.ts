import { NextResponse } from "next/server";

import { waitlistSchema } from "@/lib/validations";

const LOOPS_ENDPOINT = "https://app.loops.so/api/v1/contacts/create";

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

  const apiKey = process.env.LOOPS_API_KEY;
  if (!apiKey) {
    // Não expor detalhes de configuração ao cliente.
    console.error("LOOPS_API_KEY is not set");
    return NextResponse.json(
      { error: "Waitlist is temporarily unavailable." },
      { status: 503 },
    );
  }

  const email = parsed.data.email.toLowerCase();

  try {
    const res = await fetch(LOOPS_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        source: "landing-waitlist",
        userGroup: "waitlist",
        project: parsed.data.project ?? "",
      }),
    });

    const data = (await res.json().catch(() => null)) as {
      success?: boolean;
      message?: string;
    } | null;

    // Loops devolve 409 (ou success:false) quando o email já está na lista.
    // Do ponto de vista do utilizador isso é sucesso — já está inscrito.
    const alreadySubscribed =
      res.status === 409 ||
      (data?.message ?? "").toLowerCase().includes("already on list");

    if (alreadySubscribed) {
      return NextResponse.json({ success: true, alreadySubscribed: true });
    }

    if (!res.ok || data?.success === false) {
      console.error("Loops error", res.status, data?.message);
      return NextResponse.json(
        { error: "Could not join the waitlist. Please try again." },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Loops request failed", error);
    return NextResponse.json(
      { error: "Could not join the waitlist. Please try again." },
      { status: 502 },
    );
  }
}
