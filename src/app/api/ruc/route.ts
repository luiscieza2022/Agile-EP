import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ruc = searchParams.get('ruc');

  if (!ruc || ruc.length !== 11) {
    return NextResponse.json({ error: 'El RUC debe tener exactamente 11 dígitos' }, { status: 400 });
  }

  const API_TOKEN = process.env.APISPERU_TOKEN || 'bearer_demo';

  try {
    const res = await fetch(`https://dniruc.apisperu.com/api/v1/ruc/${ruc}?token=${API_TOKEN}`, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (res.ok) {
      const data = await res.json();

      // 1. Extraer el nombre del representante según la estructura devuelta por APISPERU
      let nombreRepresentante = '';

      if (data.representanteLegal) {
        nombreRepresentante = data.representanteLegal;
      } else if (Array.isArray(data.representantes) && data.representantes.length > 0) {
        // Busca si hay un GERENTE GENERAL, GERENTE o PRESIDENTE
        const repEspecial = data.representantes.find(
          (r: any) =>
            r.cargo?.includes('GERENTE') ||
            r.cargo?.includes('REPRESENTANTE') ||
            r.cargo?.includes('PRESIDENTE')
        );
        nombreRepresentante = repEspecial ? repEspecial.nombre : data.representantes[0].nombre;
      }

      return NextResponse.json({
        razonSocial: data.razonSocial || data.nombre || `EMPRESA RUC ${ruc} S.A.C.`,
        representanteNombre: nombreRepresentante || '', // Si no hay, deja el campo vacío para que el usuario lo escriba
        direccion: data.direccion || 'Sede Principal',
        estado: data.estado || 'ACTIVO',
      });
    }
  } catch (e) {
    console.error('Error al consultar APISPERU:', e);
  }

  return NextResponse.json({
    razonSocial: `EMPRESA RUC ${ruc} S.A.C.`,
    representanteNombre: '', // Sin texto genérico para permitir ingreso manual
    direccion: 'AV. PRINCIPAL 123',
    estado: 'ACTIVO',
  });
}