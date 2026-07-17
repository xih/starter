import { NextResponse } from "next/server";

import {
  addPersonaMemory,
  getPersona,
  personaMemorySchema,
} from "~/server/personas";
import {
  isAuthorizedForPersonaWrite,
  personaWriteUnauthorizedResponse,
} from "~/server/personas-auth";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ personaId: string }> },
) {
  if (!isAuthorizedForPersonaWrite(request)) {
    return personaWriteUnauthorizedResponse();
  }

  const { personaId } = await params;
  const persona = await getPersona(personaId);

  if (!persona) {
    return NextResponse.json({ error: "Persona not found." }, { status: 404 });
  }

  const json: unknown = await request.json().catch(() => null);
  const parsed = personaMemorySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid memory request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const memory = await addPersonaMemory(persona.id, parsed.data).catch(
    (error: unknown) => {
      const message =
        error instanceof Error
          ? error.message
          : "Persona memory embedding failed.";

      return NextResponse.json(
        {
          error: "Persona memory embedding failed.",
          detail: message,
        },
        { status: 502 },
      );
    },
  );

  if (memory instanceof NextResponse) {
    return memory;
  }

  return NextResponse.json({ memory }, { status: 201 });
}
