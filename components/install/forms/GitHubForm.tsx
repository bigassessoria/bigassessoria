'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Github } from 'lucide-react';
import { TokenInput } from '../TokenInput';
import { ValidatingOverlay } from '../ValidatingOverlay';
import { SuccessCheckmark } from '../SuccessCheckmark';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { FormProps } from './types';

const GITHUB_TOKEN_MIN_LENGTH = 20;

/**
 * Form de GitHub - token + fork - Tema Blade Runner.
 * Segunda tela do wizard. Valida token e cria fork do repositório.
 */
export function GitHubForm({ data, onComplete, onBack, showBack }: FormProps) {
  const [token, setToken] = useState(data.githubToken || '');
  const [repoName, setRepoName] = useState('');
  const [validating, setValidating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forkFullName, setForkFullName] = useState<string | null>(null);
  const [forkUrl, setForkUrl] = useState<string | null>(null);

  const isValidRepoName = (name: string) => /^[a-zA-Z0-9_.-]{1,100}$/.test(name);

  const handleValidateAndFork = async () => {
    const tok = token.trim();
    const repo = repoName.trim();

    if (!repo) {
      setError('Informe o nome do repositório');
      return;
    }
    if (!isValidRepoName(repo)) {
      setError('Nome do repositório inválido (use apenas letras, números, -, _ ou .)');
      return;
    }
    if (tok.length < GITHUB_TOKEN_MIN_LENGTH) {
      setError('Token deve ter pelo menos 20 caracteres');
      return;
    }

    setValidating(true);
    setError(null);

    const MIN_VALIDATION_TIME = 3000;
    const startTime = Date.now();

    try {
      const res = await fetch('/api/installer/github/fork', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tok, repoName: repo }),
      });

      const result = await res.json();

      const elapsed = Date.now() - startTime;
      if (elapsed < MIN_VALIDATION_TIME) {
        await new Promise((r) => setTimeout(r, MIN_VALIDATION_TIME - elapsed));
      }

      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Falha ao criar fork');
      }

      setForkFullName(result.fullName || result.repoName || repo);
      setForkUrl(result.forkUrl || (result.fullName ? `https://github.com/${result.fullName}` : undefined));
      setSuccess(true);
    } catch (err) {
      const elapsed = Date.now() - startTime;
      if (elapsed < MIN_VALIDATION_TIME) {
        await new Promise((r) => setTimeout(r, MIN_VALIDATION_TIME - elapsed));
      }
      setError(err instanceof Error ? err.message : 'Falha ao conectar com GitHub');
    } finally {
      setValidating(false);
    }
  };

  const handleSuccessComplete = () => {
    onComplete({
      githubToken: token.trim(),
      githubForkUrl: forkUrl || (forkFullName ? `https://github.com/${forkFullName}` : undefined),
    });
  };

  if (success) {
    return (
      <SuccessCheckmark
        message={
          forkFullName
            ? `Fork criado: ${forkFullName}`
            : 'Fork criado no seu GitHub'
        }
        onComplete={handleSuccessComplete}
      />
    );
  }

  const inputClass = cn(
    'w-full pl-10 pr-4 py-3 rounded-lg',
    'bg-[var(--br-void-black)]/80 border border-[var(--br-dust-gray)]/50',
    'text-[var(--br-hologram-white)] placeholder:text-[var(--br-dust-gray)]',
    'font-mono text-sm',
    'focus:border-[var(--br-neon-cyan)] focus:outline-none',
    'focus:shadow-[0_0_15px_var(--br-neon-cyan)/0.3]',
    'transition-all duration-200'
  );

  return (
    <div className="relative space-y-5">
      <ValidatingOverlay
        isVisible={validating}
        message="Criando fork..."
        subMessage="Clonando repositório para sua conta"
      />

      <div className="flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-full bg-[var(--br-deep-navy)] border border-[var(--br-neon-magenta)]/30 flex items-center justify-center">
          <Github className="w-7 h-7 text-[var(--br-neon-magenta)]" />
        </div>
        <h2 className="mt-4 text-xl font-bold tracking-wide text-[var(--br-hologram-white)] uppercase">
          Configurar GitHub
        </h2>
        <p className="mt-1 text-sm text-[var(--br-muted-cyan)] font-mono">
          Token + fork do repositório
        </p>
      </div>

      {/* Nome do repositório */}
      <div>
        <label className="block text-xs font-mono text-[var(--br-muted-cyan)] mb-2 uppercase tracking-wider">
          {'>'} Nome do repositório
        </label>
        <div className="relative">
          <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--br-dust-gray)]" />
          <input
            type="text"
            value={repoName}
            onChange={(e) => {
              setRepoName(e.target.value);
              setError(null);
            }}
            placeholder="ex: cliente-minha-loja-whatsapp"
            className={inputClass}
            autoFocus
          />
        </div>
        <p className="mt-1 text-[10px] font-mono text-[var(--br-dust-gray)]">
          Use apenas letras, números, hífen (-), underline (_) ou ponto (.). Esse será o nome do repositório no seu GitHub.
        </p>
      </div>

      {/* Token */}
      <div>
        <TokenInput
          value={token}
          onChange={(val) => {
            setToken(val);
            setError(null);
          }}
          placeholder="cole o Personal Access Token aqui..."
          validating={validating}
          error={error || undefined}
          minLength={GITHUB_TOKEN_MIN_LENGTH}
          showCharCount={true}
          accentColor="magenta"
          autoSubmitLength={0}
        />
      </div>

      <Button
        type="button"
        onClick={handleValidateAndFork}
        disabled={
          validating ||
          !repoName.trim() ||
          !isValidRepoName(repoName.trim()) ||
          token.trim().length < GITHUB_TOKEN_MIN_LENGTH
        }
        className="w-full font-mono uppercase tracking-wider bg-[var(--br-neon-magenta)] hover:bg-[var(--br-neon-magenta)]/80 text-[var(--br-hologram-white)] font-bold shadow-[0_0_20px_var(--br-neon-magenta)/0.4] transition-all duration-200"
      >
        Validar e criar fork
      </Button>

      {!validating && (
        <details className="w-full group">
          <summary className="flex items-center justify-center gap-1.5 text-sm font-mono text-[var(--br-dust-gray)] hover:text-[var(--br-muted-cyan)] cursor-pointer list-none transition-colors">
            <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
            Como criar conta, token e repo?
          </summary>
          <div className="mt-3 p-3 rounded-lg bg-[var(--br-void-black)]/50 border border-[var(--br-dust-gray)]/30 text-left space-y-2">
            <ol className="text-xs font-mono text-[var(--br-muted-cyan)] space-y-2 list-decimal list-inside">
              <li>
                <span className="font-semibold text-[var(--br-hologram-white)]">Criar conta GitHub (se ainda não tiver)</span>
                <ol className="mt-1 ml-4 list-disc space-y-1">
                  <li>
                    Acesse{' '}
                    <a
                      href="https://github.com/signup"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--br-neon-magenta)] hover:underline"
                    >
                      github.com/signup
                    </a>
                  </li>
                  <li>Preencha email, senha e escolha um username.</li>
                  <li>Confirme o email para ativar a conta.</li>
                </ol>
              </li>
              <li>
                <span className="font-semibold text-[var(--br-hologram-white)]">Gerar o token de acesso</span>
                <ol className="mt-1 ml-4 list-disc space-y-1">
                  <li>
                    Acesse{' '}
                    <a
                      href="https://github.com/settings/tokens"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--br-neon-magenta)] hover:underline"
                    >
                      github.com/settings/tokens
                    </a>
                  </li>
                  <li>
                    Clique em <strong className="text-[var(--br-hologram-white)]">Generate new token (classic)</strong>.
                  </li>
                  <li>
                    Nome: <strong className="text-[var(--br-hologram-white)]">VozzySmart</strong> (ou similar).
                  </li>
                  <li>
                    Marque o scope <strong className="text-[var(--br-hologram-white)]">repo</strong> (full control).
                  </li>
                  <li>Gere o token e copie imediatamente (ele só aparece uma vez).</li>
                </ol>
              </li>
              <li>
                <span className="font-semibold text-[var(--br-hologram-white)]">Escolher o nome do repositório e colar o token</span>
                <ol className="mt-1 ml-4 list-disc space-y-1">
                  <li>Defina um nome único para o repositório (ex.: <code>cliente-minha-loja-whatsapp</code>).</li>
                  <li>Digite esse nome no campo \"Nome do repositório\" acima.</li>
                  <li>Cole o token no campo de token e clique em <strong>Validar e criar fork</strong>.</li>
                </ol>
              </li>
            </ol>
          </div>
        </details>
      )}
    </div>
  );
}
