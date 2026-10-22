import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ruc = searchParams.get('ruc');

  if (!ruc || ruc.length !== 11) {
    return NextResponse.json({ error: 'El RUC debe tener exactamente 11 dígitos' }, { status: 400 });
  }

  // Tu Token de APISPERU
  const API_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJlbWFpbCI6Imx1aXNjaWV6YTIwMjJAZ21haWwuY29tIiwianRpIjoiMTRjMzM5ZWYwNGQ5MzdiMyJ9.8nCzItbpMgrG7l0zwccaoKAgeKYtE7Pzd8U4rSlcS4U';

  try {
    // Consulta a la API de APISPERU con el token de usuario
    const res = await fetch(`https://dniruc.apisperu.com/api/v1/ruc/${ruc}?token=${API_TOKEN}`, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (res.ok) {
      const data = await res.json();

      // Extraer representante legal si existe en la respuesta de la API
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

  // Fallback de contingencia por si la API agota sus consultas o falla la conexión
  return NextResponse.json({
    razonSocial: `EMPRESA RUC ${ruc} S.A.C.`,
    representanteNombre: 'REPRESENTANTE LEGAL REGISTRADO EN SUNAT',
    direccion: 'AV. PRINCIPAL 123',
    estado: 'ACTIVO',
  });
}