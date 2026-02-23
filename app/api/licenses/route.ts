/**
 * POST /api/licenses
 *
 * Cria uma nova licença (usado pelo n8n após pagamento aprovado).
 * Requer SMARTZAP_API_KEY ou SMARTZAP_ADMIN_KEY.
 */

import { NextRequest, NextResponse } from 'next/server';
import { customAlphabet } from 'nanoid';
import { getSupabaseAdmin } from '@/lib/supabase';
import { verifyApiKey, unauthorizedResponse } from '@/lib/auth';

const licenseCodeAlphabet = customAlphabet('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 10);

export async function POST(req: NextRequest) {
  const authResult = await verifyApiKey(req);
  if (!authResult.valid) {
    return unauthorizedResponse(authResult.error);
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { email, purchaseId, expiresAt } = body as {
      email?: string;
      purchaseId?: string;
      expiresAt?: string;
    };

    // Gerar código único (tenta até 5 vezes em caso de colisão)
    let licenseCode = licenseCodeAlphabet();
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      if (attempts > 0) licenseCode = licenseCodeAlphabet();
      const { data: existing } = await supabase
        .from('licenses')
        .select('id')
        .eq('code', licenseCode)
        .maybeSingle();

      if (!existing) break;
      attempts++;
    }

    if (attempts >= maxAttempts) {
      return NextResponse.json(
        { error: 'Não foi possível gerar código único' },
        { status: 500 }
      );
    }

    const expiresAtDate = expiresAt
      ? new Date(expiresAt).toISOString()
      : null;

    const { data: license, error } = await supabase
      .from('licenses')
      .insert({
        code: licenseCode,
        status: 'active',
        email: email || null,
        purchase_id: purchaseId || null,
        expires_at: expiresAtDate,
      })
      .select('id, code')
      .single();

    if (error) {
      console.error('[licenses] Erro ao inserir:', error);
      return NextResponse.json(
        { error: 'Falha ao criar licença' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: license.id,
      code: license.code,
    });
  } catch (err) {
    console.error('[licenses] Erro:', err);
    return NextResponse.json(
      { error: 'Erro interno' },
      { status: 500 }
    );
  }
}
