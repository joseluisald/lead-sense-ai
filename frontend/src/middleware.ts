import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware((context, next) => {
    const { url, cookies, redirect } = context;

    // Rotas públicas que não precisam de login
    const publicRoutes = ['/login', '/signup', '/forgot-password', '/reset-password', '/404'];
    const isAuthPage = publicRoutes.some(route => url.pathname.startsWith(route));

    // Lê o token do cookie
    const token = cookies.get('auth_token')?.value;

    // Se NÃO tem token e está tentando acessar página restrita (ex: /dashboard)
    if (!token && !isAuthPage) {
        return redirect('/login');
    }

    // Se TEM token e está tentando acessar a tela de login
    if (token && isAuthPage) {
        return redirect('/dashboard');
    }

    // Se estiver tudo certo, permite o carregamento da página
    return next();
});