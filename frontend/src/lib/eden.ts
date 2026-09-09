// src/lib/eden.ts
import { treaty } from '@elysiajs/eden';
import type { AnyElysia } from "elysia";
import type { App } from '../../../backend/src/index';

// Função auxiliar para ler cookies no frontend
function getCookie(name: string) {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
  return null;
}

type EdenApp = AnyElysia & Pick<App, "~Routes">;

export const api = treaty<EdenApp>(import.meta.env.PUBLIC_API_URL || 'http://localhost:3000', {
  onRequest(path, options) {
    // Pega o token do cookie em cada requisição
    const token = getCookie('auth_token');

    if (token) {
      options.headers = {
        ...options.headers,
        Authorization: `Bearer ${token}`
      };
    }
  }
});