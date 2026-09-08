import { randomBytes } from 'node:crypto';
import { jwt } from '@elysiajs/jwt';
import { Elysia, t } from 'elysia';
import { AuthController } from '../controllers/auth.controller';

const jwtSecret = process.env.JWT_SECRET || randomBytes(32).toString('hex');
if (!process.env.JWT_SECRET) console.warn('JWT_SECRET não definido. As sessões serão encerradas quando o servidor reiniciar.');

export const authRoutes = new Elysia({ prefix: "/auth" })
  .use(jwt({ name: "jwt", secret: jwtSecret }))
  .post(
    "/signup",
    ({ body, set, jwt }) => AuthController.signup(body, set, jwt),
    {
      body: t.Object({
        name: t.String({ minLength: 2, maxLength: 255 }),
        email: t.String({ format: "email", maxLength: 255 }),
        password: t.String({ minLength: 8, maxLength: 128 }),
      }),
      detail: {
        tags: ["Auth"],
        summary: "Criar uma conta de usuário",
      },
    }
  )
  .post(
    "/signin",
    ({ body, set, jwt }) => AuthController.signin(body, set, jwt),
    {
      body: t.Object({
        email: t.String({ format: "email", maxLength: 255 }),
        password: t.String({ minLength: 1, maxLength: 128 }),
      }),
      detail: {
        tags: ["Auth"],
        summary: "Autenticar um usuário",
      },
    }
  )
  .post(
    "/reset-password/request",
    ({ body }) => AuthController.requestPasswordReset(body),
    {
      body: t.Object({
        email: t.String({ format: "email", maxLength: 255 }),
      }),
      detail: {
        tags: ["Auth"],
        summary: "Solicitar link de redefinição de senha",
      },
    }
  )
  .post(
    "/reset-password",
    ({ body, set }) => AuthController.resetPassword(body, set),
    {
      body: t.Object({
        token: t.String({ minLength: 64, maxLength: 64 }),
        password: t.String({ minLength: 8, maxLength: 128 }),
      }),
      detail: {
        tags: ["Auth"],
        summary: "Redefinir a senha com token válido",
      },
    }
  );
