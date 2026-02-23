/**
 * GET /api/licenses/validate?code=ABC123
 *
 * Valida um código de licença. Endpoint público (usado na tela 1 do wizard).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { valid: false, error: 'Database not configured' },
      { status: 503 }
    );
  }

  const code = req.nextUrl.searchParams.get('code')?.trim();
  if (!code) {
    return NextResponse.json(
      { valid: false, error: 'Código não informado' },
      { status: 400 }
    );
  }

  try {
    const { data: license, error } = await supabase
      .from('licenses')
      .select('id, code, status, email, expires_at')
      .eq('code', code)
      .maybeSingle();

    if (error) {
      console.error('[licenses/validate] Erro:', error);
      return NextResponse.json(
        { valid: false, error: 'Erro ao validar' },
        { status: 500 }
      );
    }

    if (!license) {
      return NextResponse.json({ valid: false });
    }

    if (license.status !== 'active') {
      return NextResponse.json({
        valid: false,
        error: license.status === 'used' ? 'Licença já utilizada' : 'Licença inválida',
      });
    }

    if (license.expires_at && new Date(license.expires_at) < new Date()) {
      return NextResponse.json({
        valid: false,
        error: 'Licença expirada',
      });
    }

    return NextResponse.json({
      valid: true,
      license: {
        id: license.id,
        email: license.email,
      },
    });
  } catch (err) {
    console.error('[licenses/validate] Erro:', err);
    return NextResponse.json(
      { valid: false, error: 'Erro interno' },
      { status: 500 }
    );
  }
}
