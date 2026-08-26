// src/lib/eden.ts
import { edenTreaty } from '@elysiajs/eden';
// A tipagem 'App' deve ser exportada do seu arquivo principal (index.ts) da API no Bun
import type { App } from '../../../backend/src/index'; 

// Cria o cliente tipado apontando para a sua API LeadSense
export const api = edenTreaty<App>('http://localhost:3000');