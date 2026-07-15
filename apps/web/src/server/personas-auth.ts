export function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim();
}

function getPersonaWriteSecret() {
  return (
    process.env.PERSONA_ADMIN_SECRET ?? process.env.PERSONA_AGENT_READ_SECRET
  );
}

export function isAuthorizedForPersonaWrite(request: Request) {
  const expectedSecret = getPersonaWriteSecret();

  if (!expectedSecret) {
    return process.env.NODE_ENV !== "production";
  }

  return getBearerToken(request) === expectedSecret;
}

export function personaWriteUnauthorizedResponse() {
  return Response.json(
    { error: "Unauthorized persona write request." },
    { status: 401 },
  );
}
