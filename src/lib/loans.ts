import { supabase } from './supabase';

export interface RegistrarPrestamoParams {
  clienteId: string;
  sede: 'Chimbote' | 'Trujillo' | 'Chiclayo' | 'Tumbes' | 'Piura';
  montoBase: number;
  plazoMeses: number;
  cajaId: string;
}

export interface RegistrarPagoSplitParams {
  cuotaId: string;
  metodo1: string;
  monto1: number;
  metodo2?: string;
  monto2?: number;
  referencia?: string;
  cajaId?: string;
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
    throw new Error('No se puede realizar un préstamo sin una caja aperturada en la sede.');
  }

  // 1. VALIDACIÓN DE DINERO FÍSICO EN CAJA (Se descuenta del saldo)
  const { data: saldoCajaActual, error: errCaja } = await supabase.rpc(
    'obtener_saldo_actual_caja',
    { p_caja_id: cajaId }
  );

  if (errCaja) {
    throw new Error('Error al verificar el saldo en efectivo disponible en la caja.');
  }

  const efectivoEnCaja = Number(saldoCajaActual) || 0;

  if (montoBase > efectivoEnCaja) {
    throw new Error(
      `Fondo Insuficiente en Caja: La caja cuenta con S/ ${efectivoEnCaja.toFixed(
        2
      )} disponibles en efectivo y no alcanza para desembolsar S/ ${montoBase.toFixed(2)}.`
    );
  }

  // 2. VALIDACIÓN DEL LÍMITE GLOBAL ACUMULADO MULTI-SEDE (Máximo S/ 10,000)
  const { data: acumuladoActual, error: errRpc } = await supabase.rpc(
    'obtener_monto_acumulado_cliente',
    { p_cliente_id: clienteId }
  );

  if (errRpc) {
    throw new Error('Error al consultar el límite acumulado global del cliente.');
  }

  const totalConNuevoPrestamo = (Number(acumuladoActual) || 0) + montoBase;

  if (totalConNuevoPrestamo > 10000) {
    const disponible = 10000 - (Number(acumuladoActual) || 0);
    throw new Error(
      `Operación Rechazada por Riesgo: El cliente registra un acumulado de S/ ${Number(
        acumuladoActual
      ).toFixed(2)} entre distintas sedes. Crédito máximo disponible: S/ ${disponible.toFixed(
        2
      )}.`
    );
  }

  // 3. REGISTRO DEL PRÉSTAMO
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

  // Marcar alerta de sospechoso si alcanza exactamente los S/ 10,000 acumulados
  if (totalConNuevoPrestamo >= 10000) {
    await supabase.from('clientes').update({ es_sospechoso: true }).eq('id', clienteId);
  }

  // 4. GENERAR CRONOGRAMA CON INTERVALOS DE 30 DÍAS EXACTOS
  const cuotas = [];
  const fechaActual = new Date();

  for (let i = 1; i <= plazoMeses; i++) {
    const fechaVencimiento = new Date(fechaActual);
    fechaVencimiento.setDate(fechaVencimiento.getDate() + 30 * i);

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

export async function registrarPagoSplit({
  cuotaId,
  metodo1,
  monto1,
  metodo2,
  monto2 = 0,
  referencia,
  cajaId,
}: RegistrarPagoSplitParams) {
  const montoTotal = monto1 + monto2;

  const { data: cuota, error: errCuota } = await supabase
    .from('cuotas')
    .select('*')
    .eq('id', cuotaId)
    .single();

  if (errCuota || !cuota) throw new Error('No se encontró la cuota a cobrar.');

  // Registrar el ingreso del pago vinculado a la caja activa
  const { error: errPago } = await supabase.from('pagos').insert([
    {
      cuota_id: cuotaId,
      caja_id: cajaId || null,
      monto_total: montoTotal,
      metodo_pago_1: metodo1,
      monto_metodo_1: monto1,
      metodo_pago_2: metodo2 || null,
      monto_metodo_2: monto2,
      referencia_operacion: referencia,
    },
  ]);

  if (errPago) throw errPago;

  const nuevoMontoPagado = Number(cuota.monto_pagado) + montoTotal;
  const nuevoEstado = nuevoMontoPagado >= Number(cuota.monto_cuota) ? 'Pagado' : 'Pendiente';

  // Actualizar estado de la cuota
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
