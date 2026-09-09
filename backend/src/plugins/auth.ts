import { jwt } from "@elysiajs/jwt";

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  throw new Error("JWT_SECRET must be configured before starting the API.");
}

export const jwtPlugin = jwt({ name: "jwt", secret: jwtSecret });

type AuthContext = {
  jwt: {
    verify: (token: string) => Promise<false | Record<string, unknown>>;
  };
  headers: Record<string, string | undefined>;
  set: { status?: number | string };
};

export async function authenticate({ jwt, headers, set }: AuthContext) {
  const authorization = headers.authorization;
  const token = authorization?.replace(/^Bearer\s+/i, "");
  const payload = token ? await jwt.verify(token) : false;

  if (!payload) {
    set.status = 401;
    return { error: "Autenticação necessária." };
  }
}
