import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'administrateur') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const parametres = await query('SELECT * FROM parametres ORDER BY cle ASC');
    return NextResponse.json(parametres);
  } catch (error) {
    console.error('Erreur API parametres GET:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
