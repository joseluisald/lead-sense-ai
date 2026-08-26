// src/plugins/openapi.ts
import { openapi } from "@elysiajs/openapi";

export const OpenAPIPlugin = openapi({
  path: "/docs",
  provider: "scalar",
  documentation: {
    info: {
      title: "LeadSense AI -API",
      version: "1.0.0",
      description: "Documentação da API criada com ElysiaJS",
      contact: {
        name: "Suporte LeadSense",
        email: "suporte@leadsense.ai",
        url: "https://leadsense.ai"
      },
      license: {
        name: "Proprietária"
      }
    },
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: "apiKey",
          in: "header",      // Onde a chave deve ser enviada
          name: "x-api-key", // O nome exato do header que seu LeadController espera
          description: "Insira sua API Key gerada no painel de administração"
        },
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      }
    },
  }
});