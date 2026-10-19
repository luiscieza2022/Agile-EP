import { supabase } from './supabase';

export interface RegistrarPrestamoParams {
  clienteId: string;
  sede: 'Chimbote' | 'Trujillo' | 'Chiclayo' | 'Tumbes' | 'Piura';
  montoBase: number;
  plazoMeses: number; // 1 a 60
}

/**
 * Registra un nuevo prestamo validando el limite acumulado de S/ 10,000.
 */
export async function registrarPrestamo({
  clienteId,
  sede,
  montoBase,
  plazoMeses,
}: RegistrarPrestamoParams) {
  if (plazoMeses < 1 || plazoMeses > 60) {
    throw new Error('El plazo debe ser de mínimo 1 mes y máximo 5 años (60 meses).');
  }

  // 1. Obtener total prestado previo del cliente
  const { data: resumen, error: errResumen } = await supabase
    .from('vista_resumen_cliente')
    .select('*')
    .eq('cliente_id', clienteId)
    .single();

  if (errResumen && errResumen.code !== 'PGRST116') {
    throw new Error('Error al verificar el historial crediticio del cliente.');
  }

  const acumuladoActual = resumen ? parseFloat(resumen.monto_total_prestado) : 0;
  const nuevoTotal = acumuladoActual + montoBase;

  // Si excede los 10,000 Soles, bloquear operacion
  if (nuevoTotal > 10000) {
    throw new Error(
      `El cliente excede el limite maximo de S/ 10,000. Acumulado actual: S/ ${acumuladoActual}.`
    );
  }

  // 2. Calcular interes del 30%
  const tasaInteres = 30.0;
  const montoTotalConInteres = montoBase * (1 + tasaInteres / 100);
  const montoCuotaMensual = Number((montoTotalConInteres / plazoMeses).toFixed(2));

  // 3. Crear Préstamo
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
      },
    ])
    .select()
    .single();

  if (errPrestamo) throw errPrestamo;

  // Si con este préstamo alcanza o llega exactamente a 10,000 soles, marcar cliente como sospechoso
  if (nuevoTotal >= 10000) {
    await supabase
      .from('clientes')
      .update({ es_sospechoso: true })
      .eq('id', clienteId);
  }

  // 4. Generar Cronograma de Cuotas
  const cuotas = [];
  const fechaActual = new Date();

  for (let i = 1; i <= plazoMeses; i++) {
    const fechaVencimiento = new Date(fechaActual);
    fechaVencimiento.setMonth(fechaVencimiento.getMonth() + i);

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

export interface RegistrarPagoSplitParams {
  cuotaId: string;
  metodo1: string;
  monto1: number;
  metodo2?: string;
  monto2?: number;
  referencia?: string;
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