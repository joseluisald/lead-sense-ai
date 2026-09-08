import { edenTreaty } from '@elysiajs/eden';
import type { AnyElysia } from 'elysia';
import type { App } from '../../../backend/src/index.ts';

type EdenApp = AnyElysia & Pick<App, '~Routes'>;

export const api = edenTreaty<EdenApp>('http://localhost:3000');
