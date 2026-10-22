import { supabase } from './supabase';

export interface RegistrarPrestamoParams {
  clienteId: string;
  sede: 'Chimbote' | 'Trujillo' | 'Chiclayo' | 'Tumbes' | 'Piura';
  montoBase: number;
  plazoMeses: number;
  cajaId: string;
}

export async function registrarPrestamo({
  clienteId,
  sede,
  montoBase,
  plazoMeses,
  cajaId,
}: RegistrarPrestamoParams) {
  if (plazoMeses < 1 || plazoMeses > 60) {
    throw new Error('El plazo debe ser de mínimo 1 mes y máximo 5 años (60 meses).');
  }

  if (!cajaId) {
    throw new Error('No se puede realizar el préstamo sin una caja aperturada.');
  }

  // 1. Obtener monto acumulado actual en BD (Consolidado Multi-Sede)
  const { data: acumuladoActual, error: errRpc } = await supabase.rpc(
    'obtener_monto_acumulado_cliente',
    { p_cliente_id: clienteId }
  );

  if (errRpc) {
    throw new Error('Error al consultar el límite del cliente.');
  }

  const totalConNuevoPrestamo = (Number(acumuladoActual) || 0) + montoBase;

  // 2. BLOQUEO MULTI-SEDE: Excede el máximo acumulado de S/ 10,000
  if (totalConNuevoPrestamo > 10000) {
    const disponible = 10000 - (Number(acumuladoActual) || 0);
    throw new Error(
      `Operación Rechazada: El cliente tiene S/ ${acumuladoActual} prestados entre distintas sedes. Monto máximo disponible: S/ ${disponible.toFixed(2)}.`
    );
  }

  // 3. Registrar Préstamo
  const tasaInteres = 30.0;
  const montoTotalConInteres = montoBase * 1.30;
  const montoCuotaMensual = Number((montoTotalConInteres / plazoMeses).toFixed(2));

  const { data: prestamo, error: errPrestamo } = await supabase
    .from('prestamos')
    .insert([
      {
        cliente_id: clienteId,
        sede,
        monto_monto_base: montoBase,
        tasa_interes: tasaInteres,
        monto_total_con_interes: montoTotalConInteres,
        plazo_meses: plazoMeses,
        caja_id: cajaId,
      },
    ])
    .select()
    .single();

  if (errPrestamo) throw errPrestamo;

  // Marcar reporte sospechoso si alcanza exactamente los S/ 10,000 acumulados
  if (totalConNuevoPrestamo >= 10000) {
    await supabase.from('clientes').update({ es_sospechoso: true }).eq('id', clienteId);
  }

  // 4. Generar Cronograma
  const cuotas = [];
  const fechaActual = new Date();

  for (let i = 1; i <= plazoMeses; i++) {
    const fechaVencimiento = new Date(fechaActual);
    fechaVencimiento.setDate(fechaVencimiento.getDate() + (30 * i)); // Regla exacta de periodos de 30 dias

    cuotas.push({
      prestamo_id: prestamo.id,
      numero_cuota: i,
      monto_cuota: montoCuotaMensual,
      monto_pagado: 0.0,
      fecha_vencimiento: fechaVencimiento.toISOString().split('T')[0],
      estado: 'Pendiente',
    });
  }

  const { error: errCuotas } = await supabase.from('cuotas').insert(cuotas);
  if (errCuotas) throw errCuotas;

  return prestamo;
}

/**
 * Registra el pago de una cuota admitiendo hasta 2 métodos de pago (Pago Split).
 */
export async function registrarPagoSplit({
  cuotaId,
  metodo1,
  monto1,
  metodo2,
  monto2 = 0,
  referencia,
}: RegistrarPagoSplitParams) {
  const montoTotal = monto1 + monto2;

  // 1. Obtener la cuota
  const { data: cuota, error: errCuota } = await supabase
    .from('cuotas')
    .select('*')
    .eq('id', cuotaId)
    .single();

  if (errCuota || !cuota) throw new Error('No se encontró la cuota.');

  // 2. Registrar el cobro en la tabla pagos
  const { error: errPago } = await supabase.from('pagos').insert([
    {
      cuota_id: cuotaId,
      monto_total: montoTotal,
      metodo_pago_1: metodo1,
      monto_metodo_1: monto1,
      metodo_pago_2: metodo2 || null,
      monto_metodo_2: monto2,
      referencia_operacion: referencia,
    },
  ]);

  if (errPago) throw errPago;

  // 3. Actualizar estado de la cuota
  const nuevoMontoPagado = Number(cuota.monto_pagado) + montoTotal;
  const nuevoEstado = nuevoMontoPagado >= Number(cuota.monto_cuota) ? 'Pagado' : 'Pendiente';

  const { error: errUpdateCuota } = await supabase
    .from('cuotas')
    .update({
      monto_pagado: nuevoMontoPagado,
      estado: nuevoEstado,
      fecha_pago: nuevoEstado === 'Pagado' ? new Date().toISOString() : null,
    })
    .eq('id', cuotaId);

  if (errUpdateCuota) throw errUpdateCuota;

  return true;
}