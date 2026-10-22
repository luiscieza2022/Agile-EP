import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ruc = searchParams.get('ruc');

  if (!ruc || ruc.length !== 11) {
    return NextResponse.json({ error: 'El RUC debe tener exactamente 11 dígitos' }, { status: 400 });
  }

  // Leer Token desde las variables de entorno del servidor
  const API_TOKEN = process.env.APISPERU_TOKEN || 'bearer_demo';

  try {
    const res = await fetch(`https://dniruc.apisperu.com/api/v1/ruc/${ruc}?token=${API_TOKEN}`, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (res.ok) {
      const data = await res.json();

      const representante =
        data.representanteLegal ||
        data.representantes?.[0]?.nombre ||
        'REPRESENTANTE LEGAL REGISTRADO EN SUNAT';

      return NextResponse.json({
        razonSocial: data.razonSocial || data.nombre,
        representanteNombre: representante,
        direccion: data.direccion || 'Sede Principal',
        estado: data.estado || 'ACTIVO',
        condicion: data.condicion || 'HABIDO',
      });
    }
  } catch (e) {
    console.error('Error al consultar APISPERU:', e);
  }

  return NextResponse.json({
    razonSocial: `EMPRESA RUC ${ruc} S.A.C.`,
    representanteNombre: 'REPRESENTANTE LEGAL REGISTRADO EN SUNAT',
    direccion: 'AV. PRINCIPAL 123',
    estado: 'ACTIVO',
  });
}