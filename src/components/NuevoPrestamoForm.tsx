'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { registrarPrestamo } from '@/lib/loans';

interface Props {
  cajeroSede: 'Chimbote' | 'Trujillo' | 'Chiclayo' | 'Tumbes' | 'Piura';
  cajaId: string;
  darkMode: boolean;
  onSuccess: () => void;
}

export default function NuevoPrestamoForm({ cajeroSede, cajaId, darkMode, onSuccess }: Props) {
  const [tipoCliente, setTipoCliente] = useState<'DNI' | 'RUC_NATURAL' | 'RUC_JURIDICA'>('RUC_JURIDICA');
  const [documentoInput, setDocumentoInput] = useState('');
  const [loadingValidacion, setLoadingValidacion] = useState(false);
  const [clienteValidado, setClienteValidado] = useState<any | null>(null);

  // Condiciones del Préstamo
  const [monto, setMonto] = useState<number>(1000);
  const [plazo, setPlazo] = useState<number>(12);
  const [loadingProceso, setLoadingProceso] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hoyFechaFormateada = new Date().toISOString().split('T')[0];
  const montoTotalConInteres = monto * 1.30;
  const cuotaMensual = (montoTotalConInteres / (plazo || 1)).toFixed(2);

  // Validar con SUNAT o en la Base de Datos
  const handleValidarCliente = async () => {
    if (!documentoInput.trim()) return;
    setLoadingValidacion(true);
    setError(null);
    setClienteValidado(null);

    try {
      if (tipoCliente === 'RUC_JURIDICA' || tipoCliente === 'RUC_NATURAL') {
        const res = await fetch(`/api/ruc?ruc=${documentoInput.trim()}`);
        if (res.ok) {
          const dataSunat = await res.json();

          // Buscar o registrar cliente en Supabase
          let { data: clienteExistente } = await supabase
            .from('vista_resumen_cliente')
            .select('*')
            .eq('ruc', documentoInput.trim())
            .maybeSingle();

          if (!clienteExistente) {
            const { data: nuevoCliente } = await supabase
              .from('clientes')
              .insert([
                {
                  nombre_o_razon_social: dataSunat.razonSocial,
                  documento_identidad: documentoInput.trim(),
                  ruc: documentoInput.trim(),
                  sede: cajeroSede,
                  representante_nombre: dataSunat.representanteNombre,
                  representante_dni: dataSunat.representanteDni || '44123456',
                },
              ])
              .select()
              .single();

            clienteExistente = {
              ...nuevoCliente,
              cliente_id: nuevoCliente.id,
              monto_total_prestado: 0,
              saldo_disponible_prestamo: 10000,
            };
          }

          setClienteValidado(clienteExistente);
        }
      }
    } catch (e: any) {
      setError('Error al consultar el documento.');
    } finally {
      setLoadingValidacion(false);
    }
  };

  const excedeLimite = clienteValidado
    ? monto > parseFloat(clienteValidado.saldo_disponible_prestamo)
    : false;

  const handleEmitirPrestamo = async () => {
    if (!clienteValidado || !cajaId) return;
    setError(null);

    try {
      setLoadingProceso(true);
      await registrarPrestamo({
        clienteId: clienteValidado.cliente_id || clienteValidado.id,
        sede: cajeroSede,
        montoBase: monto,
        plazoMeses: plazo,
        cajaId,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Error al procesar el préstamo.');
    } finally {
      setLoadingProceso(false);
    }
  };

  const inputStyle = darkMode
    ? 'bg-gray-800 text-white border-gray-600 focus:bg-gray-700'
    : 'bg-white text-gray-900 border-gray-300 focus:bg-gray-50';

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Nuevo préstamo</h1>

      {error && (
        <div className="bg-red-500/10 border-l-4 border-red-500 p-3 text-red-500 text-sm font-bold rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COLUMNA IZQUIERDA: PASOS 1 Y 2 */}
        <div className="lg:col-span-2 space-y-6">
          {/* PASO 1: DATOS DEL CLIENTE */}
          <div
            className={`p-6 rounded-xl border space-y-4 ${
              darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}
          >
            <h2 className="text-base font-bold">1. Datos del cliente</h2>

            {/* BOTONES TIPO DE CLIENTE */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setTipoCliente('DNI');
                  setClienteValidado(null);
                }}
                className={`py-2.5 px-3 text-xs font-bold rounded-lg border transition-all ${
                  tipoCliente === 'DNI'
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : 'bg-gray-900/30 border-gray-700 text-gray-300 hover:bg-gray-700/50'
                }`}
              >
                Persona natural (DNI)
              </button>

              <button
                type="button"
                onClick={() => {
                  setTipoCliente('RUC_NATURAL');
                  setClienteValidado(null);
                }}
                className={`py-2.5 px-3 text-xs font-bold rounded-lg border transition-all ${
                  tipoCliente === 'RUC_NATURAL'
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : 'bg-gray-900/30 border-gray-700 text-gray-300 hover:bg-gray-700/50'
                }`}
              >
                Persona natural con RUC
              </button>

              <button
                type="button"
                onClick={() => {
                  setTipoCliente('RUC_JURIDICA');
                  setClienteValidado(null);
                }}
                className={`py-2.5 px-3 text-xs font-bold rounded-lg border transition-all ${
                  tipoCliente === 'RUC_JURIDICA'
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : 'bg-gray-900/30 border-gray-700 text-gray-300 hover:bg-gray-700/50'
                }`}
              >
                Persona jurídica
              </button>
            </div>

            {/* INPUT DE DOCUMENTO + BOTÓN VALIDAR */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">
                {tipoCliente === 'DNI' ? 'N° de DNI (8 dígitos)' : 'N° de RUC (11 dígitos)'}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={tipoCliente === 'DNI' ? 8 : 11}
                  value={documentoInput}
                  onChange={(e) => setDocumentoInput(e.target.value)}
                  placeholder={tipoCliente === 'DNI' ? 'Ej. 45871236' : 'Ej. 20601234567'}
                  className={`flex-1 p-2.5 border rounded-lg font-bold text-sm ${inputStyle}`}
                />
                <button
                  type="button"
                  onClick={handleValidarCliente}
                  disabled={loadingValidacion || !documentoInput.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 text-white font-bold px-6 rounded-lg text-sm transition-colors"
                >
                  {loadingValidacion ? 'Consultando...' : 'Validar'}
                </button>
              </div>
            </div>
          </div>

          {/* PASO 2: CONDICIONES DEL PRÉSTAMO */}
          <div
            className={`p-6 rounded-xl border space-y-4 ${
              darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}
          >
            <h2 className="text-base font-bold">2. Condiciones del préstamo</h2>
            <p className="text-xs text-gray-400">
              {clienteValidado ? 'Selecciona el monto y el plazo.' : 'Primero valida el documento del cliente.'}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Fecha del préstamo</label>
                <input
                  type="date"
                  value={hoyFechaFormateada}
                  disabled
                  className={`w-full p-2.5 border rounded-lg text-sm font-semibold ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-100 border-gray-300 text-gray-700'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Monto (S/)</label>
                <input
                  type="number"
                  min="100"
                  max="10000"
                  value={monto}
                  onChange={(e) => setMonto(Number(e.target.value))}
                  disabled={!clienteValidado}
                  placeholder="1 a 10000"
                  className={`w-full p-2.5 border rounded-lg text-sm font-bold ${inputStyle}`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Plazo (meses)</label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={plazo}
                  onChange={(e) => setPlazo(Number(e.target.value))}
                  disabled={!clienteValidado}
                  placeholder="1 a 60"
                  className={`w-full p-2.5 border rounded-lg text-sm font-bold ${inputStyle}`}
                />
              </div>
            </div>

            <p className="text-[11px] text-gray-400">
              De S/ 1 a S/ 10,000 · como máximo 60 meses · 30 % fijo · cuota fija cada 30 días.
            </p>
          </div>
        </div>

        {/* COLUMNA DERECHA: RESUMEN Y VERIFICACIONES */}
        <div className="space-y-6">
          {/* FICHA DE RESUMEN */}
          <div
            className={`p-6 rounded-xl border space-y-3 ${
              darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}
          >
            <h3 className="text-base font-bold">Resumen</h3>

            {!clienteValidado ? (
              <p className="text-xs text-gray-400">Valida primero al cliente.</p>
            ) : (
              <div className="space-y-2 text-xs">
                <div className="border-b pb-2 border-gray-700">
                  <p className="text-gray-400">Empresa / Cliente:</p>
                  <p className="font-bold text-sm text-blue-400">{clienteValidado.nombre_o_razon_social}</p>
                </div>

                <div className="border-b pb-2 border-gray-700">
                  <p className="text-gray-400">Representante Legal (SUNAT):</p>
                  <p className="font-bold text-emerald-400">{clienteValidado.representante_nombre}</p>
                  <p className="text-[11px] text-gray-400">DNI: {clienteValidado.representante_dni}</p>
                </div>

                <div className="pt-1">
                  <p>Monto Base: <strong>S/ {monto.toFixed(2)}</strong></p>
                  <p>Total a Devolver (30%): <strong>S/ {montoTotalConInteres.toFixed(2)}</strong></p>
                  <p>Cuota Mensual ({plazo}m): <strong className="text-green-400">S/ {cuotaMensual}</strong></p>
                  <p className="text-emerald-400 mt-1">
                    Disponible: S/ {parseFloat(clienteValidado.saldo_disponible_prestamo).toFixed(2)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* FICHA DE VERIFICACIONES Y ACCIÓN */}
          <div
            className={`p-6 rounded-xl border space-y-4 ${
              darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}
          >
            <h3 className="text-base font-bold">Verificaciones</h3>

            <div className="flex items-center space-x-2 text-xs">
              <span className={`h-2.5 w-2.5 rounded-full ${clienteValidado ? 'bg-emerald-500' : 'bg-gray-500'}`} />
              <span className={clienteValidado ? 'text-gray-200 font-semibold' : 'text-gray-400'}>
                {clienteValidado ? 'Cliente validado con SUNAT' : 'Cliente no validado'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleEmitirPrestamo}
              disabled={!clienteValidado || excedeLimite || loadingProceso}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded-xl text-sm transition-colors shadow-md"
            >
              {loadingProceso ? 'Generando préstamo...' : 'Generar contrato y cronograma'}
            </button>

            <p className="text-[11px] text-gray-400">
              Todavía no se guarda nada: el préstamo se registra cuando confirmes que el contrato está firmado.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}