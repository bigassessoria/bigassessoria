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
  const [username, setUsername] = useState(data.githubUsername || '');
  const [token, setToken] = useState(data.githubToken || '');
  const [validating, setValidating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forkFullName, setForkFullName] = useState<string | null>(null);
  const [forkUrl, setForkUrl] = useState<string | null>(null);

  const handleValidateAndFork = async () => {
    const user = username.trim();
    const tok = token.trim();

    if (!user) {
      setError('Informe seu username do GitHub');
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
        body: JSON.stringify({ token: tok, username: user }),
      });

      const result = await res.json();

      const elapsed = Date.now() - startTime;
      if (elapsed < MIN_VALIDATION_TIME) {
        await new Promise((r) => setTimeout(r, MIN_VALIDATION_TIME - elapsed));
      }

      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Falha ao criar fork');
      }

      setForkFullName(result.fullName || `${user}/repo`);
      setForkUrl(result.forkUrl || `https://github.com/${result.fullName || user}`);
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
      githubUsername: username.trim(),
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

      {/* Username */}
      <div>
        <label className="block text-xs font-mono text-[var(--br-muted-cyan)] mb-2 uppercase tracking-wider">
          {'>'} Username do GitHub
        </label>
        <div className="relative">
          <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--br-dust-gray)]" />
          <input
            type="text"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setError(null);
            }}
            placeholder="seu-usuario"
            className={inputClass}
            autoFocus
          />
        </div>
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
          !username.trim() ||
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
            Como obter o token?
          </summary>
          <div className="mt-3 p-3 rounded-lg bg-[var(--br-void-black)]/50 border border-[var(--br-dust-gray)]/30 text-left space-y-2">
            <ol className="text-xs font-mono text-[var(--br-muted-cyan)] space-y-1.5 list-decimal list-inside">
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
                Clique em <strong className="text-[var(--br-hologram-white)]">Generate new token (classic)</strong>
              </li>
              <li>
                Nome: <strong className="text-[var(--br-hologram-white)]">VozzySmart</strong> (ou outro)
              </li>
              <li>
                Marque o scope <strong className="text-[var(--br-hologram-white)]">repo</strong> (full control)
              </li>
              <li>Copie o token e cole acima</li>
            </ol>
          </div>
        </details>
      )}
    </div>
  );
}
