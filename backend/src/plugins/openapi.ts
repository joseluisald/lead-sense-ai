import { openapi } from "@elysiajs/openapi";

export const OpenAPIPlugin = openapi({
  path: "/docs",
  provider: "scalar",
  documentation: {
    info: {
      title: "LeadSense AI - API",
      version: "1.0.0",
      description: "Documentação da API criada com ElysiaJS",
      contact: {
        name: "Suporte LeadSense AI",
        email: "support@leadsenseai.jlacode.com.br",
        url: "https://leadsenseai.jlacode.com.br",
      },
      license: {
        name: "Proprietária",
      },
    },
    servers: [
      {
        url: "https://leadsenseai.jlacode.com.br",
        description: "Servidor do ambiente de Produção",
      },
      {
        url: "http://localhost:3000",
        description: "Servidor Local de Desenvolvimento",
      },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: "apiKey",
          in: "header", // Onde a chave deve ser enviada
          name: "x-api-key", // O nome exato do header que seu LeadController espera
          description: "Insira sua API Key gerada no painel de administração",
        },
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
});
