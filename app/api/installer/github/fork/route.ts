/**
 * POST /api/installer/github/fork
 *
 * Valida o token GitHub e cria fork do repositório fonte.
 * Usado no step 2 do wizard de instalação.
 */

import { NextRequest, NextResponse } from 'next/server';

const GITHUB_API = 'https://api.github.com';
const REPO_NAME_REGEX = /^[a-zA-Z0-9_.-]{1,100}$/;

export async function POST(req: NextRequest) {
  if (process.env.INSTALLER_ENABLED === 'false') {
    return NextResponse.json({ error: 'Installer desabilitado' }, { status: 403 });
  }

  const sourceRepo = process.env.GITHUB_SOURCE_REPO?.trim();
  if (!sourceRepo || !sourceRepo.includes('/')) {
    return NextResponse.json(
      { error: 'GITHUB_SOURCE_REPO não configurado (formato: owner/repo)' },
      { status: 500 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { token, repoName } = body as { token?: string; repoName?: string };

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Token GitHub é obrigatório' },
        { status: 400 }
      );
    }

    if (!repoName || typeof repoName !== 'string') {
      return NextResponse.json(
        { error: 'Nome do repositório é obrigatório' },
        { status: 400 }
      );
    }

    const normalizedRepoName = repoName.trim().toLowerCase();
    if (!REPO_NAME_REGEX.test(normalizedRepoName)) {
      return NextResponse.json(
        { error: 'Nome do repositório inválido. Use apenas letras, números, -, _ ou . (até 100 caracteres).' },
        { status: 400 }
      );
    }

    const tokenTrimmed = token.trim();

    // 1. Validar token e obter usuário
    const userRes = await fetch(`${GITHUB_API}/user`, {
      headers: {
        Authorization: `Bearer ${tokenTrimmed}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!userRes.ok) {
      if (userRes.status === 401) {
        return NextResponse.json(
          { error: 'Token inválido ou expirado. Gere um novo token em github.com/settings/tokens' },
          { status: 401 }
        );
      }
      const errData = await userRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: errData?.message || 'Falha ao validar token GitHub' },
        { status: userRes.status }
      );
    }

    const userData = (await userRes.json()) as { login?: string; id?: number };
    const resolvedUsername = userData.login;
    if (!resolvedUsername) {
      return NextResponse.json(
        { error: 'Não foi possível obter o usuário do GitHub a partir do token informado.' },
        { status: 400 }
      );
    }

    // 2. Criar fork com nome específico
    const forkRes = await fetch(`${GITHUB_API}/repos/${sourceRepo}/forks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenTrimmed}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        organization: undefined, // fork na conta do usuário autenticado
        name: normalizedRepoName,
        default_branch_only: false,
      }),
    });

    if (!forkRes.ok) {
      const forkErr = await forkRes.json().catch(() => ({}));
      const msg = forkErr?.message || '';

      if (forkRes.status === 404) {
        return NextResponse.json(
          { error: 'Repositório fonte não encontrado. Verifique GITHUB_SOURCE_REPO.' },
          { status: 404 }
        );
      }
      if (forkRes.status === 403 && /rate limit/i.test(msg)) {
        return NextResponse.json(
          { error: 'Limite de requisições do GitHub excedido. Tente novamente em alguns minutos.' },
          { status: 429 }
        );
      }
      if (msg.includes('already exists') || msg.includes('fork already exists')) {
        // Fork já existe - buscar URL do fork do usuário com o nome informado
        const repoRes = await fetch(
          `${GITHUB_API}/repos/${resolvedUsername}/${normalizedRepoName}`,
          {
            headers: {
              Authorization: `Bearer ${tokenTrimmed}`,
              Accept: 'application/vnd.github.v3+json',
            },
          }
        );
        if (repoRes.ok) {
          const repo = (await repoRes.json()) as { html_url?: string; clone_url?: string; full_name?: string };
          return NextResponse.json({
            success: true,
            forkUrl: repo.html_url,
            cloneUrl: repo.clone_url,
            fullName: repo.full_name,
            alreadyExisted: true,
          });
        }
        return NextResponse.json(
          { error: 'Já existe um repositório com esse nome na sua conta GitHub. Escolha outro nome.' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: msg || 'Falha ao criar fork' },
        { status: forkRes.status }
      );
    }

    const forkData = (await forkRes.json()) as {
      html_url?: string;
      clone_url?: string;
      full_name?: string;
    };

    return NextResponse.json({
      success: true,
      forkUrl: forkData.html_url,
      cloneUrl: forkData.clone_url,
      fullName: forkData.full_name,
    });
  } catch (err) {
    console.error('[installer/github/fork] Erro:', err);
    return NextResponse.json(
      { error: 'Erro interno ao criar fork' },
      { status: 500 }
    );
  }
}
