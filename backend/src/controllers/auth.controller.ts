import { createHash, randomBytes } from "node:crypto";
import { UserModel } from "../models/user.model";
import { buildEmailHtml, sendEmailViaSmtp } from "../core/utils";

const passwordResetMessage =
  "Se houver uma conta com este e-mail, enviaremos as instruções de redefinição.";

export class AuthController {
  static async signup(
    body: { name: string; email: string; password: string },
    set: { status?: number | string },
    jwt: { sign: (payload: { sub: string; email: string }) => Promise<string> }
  ) {
    try {
      const email = body.email.trim().toLowerCase();

      if (await UserModel.findByEmail(email)) {
        set.status = 409;
        return { error: "Já existe uma conta com este e-mail." };
      }

      const passwordHash = await Bun.password.hash(body.password);
      const user = await UserModel.create(
        body.name.trim(),
        email,
        passwordHash
      );
      const token = await jwt.sign({ sub: user.id, email: user.email });

      return { user, token };
    } catch (error: any) {
      set.status = 500;
      return { error: error.message };
    }
  }

  static async signin(
    body: { email: string; password: string },
    set: { status?: number | string },
    jwt: { sign: (payload: { sub: string; email: string }) => Promise<string> }
  ) {
    try {
      const user = await UserModel.findByEmail(body.email.trim().toLowerCase());

      if (
        !user ||
        !(await Bun.password.verify(body.password, user.passwordHash))
      ) {
        set.status = 401;
        return { error: "E-mail ou senha inválidos." };
      }

      const token = await jwt.sign({ sub: user.id, email: user.email });

      return {
        user: { id: user.id, name: user.name, email: user.email },
        token,
      };
    } catch (error: any) {
      set.status = 500;
      return { error: error.message };
    }
  }

  static async requestPasswordReset(body: { email: string }) {
    try {
      const user = await UserModel.findByEmail(body.email.trim().toLowerCase());
      if (!user) return { message: passwordResetMessage };

      const token = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(token).digest("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await UserModel.saveResetToken(user.id, tokenHash, expiresAt);

      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:4321";
      const resetUrl = `${frontendUrl}/reset-password?token=${token}`;
      const html = buildEmailHtml(
        "Redefinição de senha",
        `Olá ${user.name}, clique no botão abaixo para criar uma nova senha. Este link expira em uma hora.`,
        "Redefinir senha",
        "#2563eb",
        resetUrl
      );

      sendEmailViaSmtp(user.email, "Redefinição de senha", html);

      return { message: passwordResetMessage };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  static async resetPassword(
    body: { token: string; password: string },
    set: { status?: number | string }
  ) {
    try {
      const tokenHash = createHash("sha256").update(body.token).digest("hex");
      const user = await UserModel.findByResetToken(tokenHash);

      if (!user) {
        set.status = 400;
        return { error: "O link de redefinição é inválido ou expirou." };
      }

      await UserModel.updatePassword(
        user.id,
        await Bun.password.hash(body.password)
      );

      return { success: true, message: "Senha redefinida com sucesso." };
    } catch (error: any) {
      set.status = 500;
      return { error: error.message };
    }
  }
}
