'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { KeyRound } from 'lucide-react';
import { TokenInput } from '../TokenInput';
import { ValidatingOverlay } from '../ValidatingOverlay';
import { SuccessCheckmark } from '../SuccessCheckmark';
import { Button } from '@/components/ui/button';
import type { FormProps } from './types';

/**
 * Form de validação de licença - Tema Blade Runner.
 * Primeira tela do wizard. Valida código recebido após compra.
 */
export function LicenseForm({ data, onComplete, onBack, showBack }: FormProps) {
  const searchParams = useSearchParams();
  const codeFromUrl = searchParams?.get('code')?.trim() ?? '';

  const [code, setCode] = useState(data.licenseCode || codeFromUrl || '');
  const [validatedLicenseId, setValidatedLicenseId] = useState<string | undefined>(data.licenseId);
  const [validating, setValidating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (codeFromUrl && !data.licenseCode) {
      setCode(codeFromUrl);
    }
  }, [codeFromUrl, data.licenseCode]);

  const handleValidate = async () => {
    const trimmed = code.trim();
    if (!trimmed || trimmed.length < 6) {
      setError('Informe o código da licença (recebido por email)');
      return;
    }

    setValidating(true);
    setError(null);

    const MIN_VALIDATION_TIME = 1500;
    const startTime = Date.now();

    try {
      const res = await fetch(`/api/licenses/validate?code=${encodeURIComponent(trimmed)}`);
      const result = await res.json();

      const elapsed = Date.now() - startTime;
      if (elapsed < MIN_VALIDATION_TIME) {
        await new Promise((r) => setTimeout(r, MIN_VALIDATION_TIME - elapsed));
      }

      if (!res.ok || !result.valid) {
        throw new Error(result.error || 'Código inválido');
      }

      setValidatedLicenseId(result.license?.id);
      setSuccess(true);
    } catch (err) {
      const elapsed = Date.now() - startTime;
      if (elapsed < MIN_VALIDATION_TIME) {
        await new Promise((r) => setTimeout(r, MIN_VALIDATION_TIME - elapsed));
      }
      setError(err instanceof Error ? err.message : 'Falha ao validar');
    } finally {
      setValidating(false);
    }
  };

  const handleSuccessComplete = () => {
    onComplete({ licenseId: validatedLicenseId, licenseCode: code.trim() });
  };

  if (success) {
    return (
      <SuccessCheckmark
        message="Licença válida"
        onComplete={handleSuccessComplete}
      />
    );
  }

  return (
    <div className="relative space-y-5">
      <ValidatingOverlay
        isVisible={validating}
        message="Verificando licença..."
        subMessage="Consultando base de códigos"
      />

      <div className="flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-full bg-[var(--br-deep-navy)] border border-[var(--br-neon-cyan)]/30 flex items-center justify-center">
          <KeyRound className="w-7 h-7 text-[var(--br-neon-cyan)]" />
        </div>
        <h2 className="mt-4 text-xl font-bold tracking-wide text-[var(--br-hologram-white)] uppercase">
          Validação de Licença
        </h2>
        <p className="mt-1 text-sm text-[var(--br-muted-cyan)] font-mono">
          Informe o código recebido após a compra
        </p>
      </div>

      <TokenInput
        value={code}
        onChange={(val) => {
          setCode(val);
          setError(null);
        }}
        placeholder="Cole o código da licença..."
        validating={validating}
        error={error || undefined}
        minLength={6}
        showCharCount={false}
        accentColor="cyan"
        masked={false}
        autoFocus
      />

      <Button
        type="button"
        onClick={handleValidate}
        disabled={validating || code.trim().length < 6}
        className="w-full font-mono uppercase tracking-wider bg-[var(--br-neon-cyan)] hover:bg-[var(--br-neon-cyan)]/80 text-[var(--br-void-black)] font-bold shadow-[0_0_20px_var(--br-neon-cyan)/0.4] transition-all duration-200"
      >
        Validar
      </Button>

      {!validating && (
        <details className="w-full group">
          <summary className="flex items-center justify-center gap-1.5 text-sm font-mono text-[var(--br-dust-gray)] hover:text-[var(--br-muted-cyan)] cursor-pointer list-none transition-colors">
            Recebeu o código por email após a compra?
          </summary>
          <div className="mt-3 p-3 rounded-lg bg-[var(--br-void-black)]/50 border border-[var(--br-dust-gray)]/30 text-left">
            <p className="text-xs font-mono text-[var(--br-muted-cyan)]">
              O código é enviado automaticamente após a confirmação do pagamento.
              Verifique sua caixa de entrada e spam.
            </p>
          </div>
        </details>
      )}
    </div>
  );
}
