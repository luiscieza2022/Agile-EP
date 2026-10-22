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
  const [tipoCliente, setTipoCliente] = useState<'RUC_NATURAL' | 'RUC_JURIDICA'>('RUC_JURIDICA');
  const [documentoInput, setDocumentoInput] = useState('');
  const [loadingValidacion, setLoadingValidacion] = useState(false);
  const [clienteValidado, setClienteValidado] = useState<any | null>(null);

  // Parámetros de préstamo
  const [monto, setMonto] = useState<number>(2000);
  const [plazo, setPlazo] = useState<number>(12);
  const [loadingProceso, setLoadingProceso] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hoyFecha = new Date().toISOString().split('T')[0];
  const montoTotalConInteres = monto * 1.30;
  const cuotaMensual = (montoTotalConInteres / (plazo || 1)).toFixed(2);

  // Primera cuota a 30 días exactos
  const fechaPrimeraCuota = new Date();
  fechaPrimeraCuota.setDate(fechaPrimeraCuota.getDate() + 30);

  const handleValidarCliente = async () => {
    if (!documentoInput.trim()) return;
    setLoadingValidacion(true);
    setError(null);
    setClienteValidado(null);

    try {
      const res = await fetch(`/api/ruc?ruc=${documentoInput.trim()}`);
      if (res.ok) {
        const dataSunat = await res.json();

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
    } catch (e: any) {
      setError('Ocurrió un error al consultar el número de RUC en SUNAT.');
    } finally {
      setLoadingValidacion(false);
    }
  };

  const saldoDisponible = clienteValidado
    ? parseFloat(clienteValidado.saldo_disponible_prestamo)
    : 10000;
  const excedeLimite = monto > saldoDisponible;

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
      setError(err.message || 'Error al procesar el desembolso.');
    } finally {
      setLoadingProceso(false);
    }
  };

  const cardStyle = darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900';
  const inputStyle = darkMode ? 'bg-gray-900 text-white border-gray-600 focus:border-blue-500' : 'bg-gray-50 text-gray-900 border-gray-300 focus:border-blue-600';

  return (
    <div className="space-y-6">
      {/* HEADER DE MÓDULO */}
      <div className={`p-6 rounded-2xl border shadow-sm ${cardStyle}`}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-gray-700/50">
          <div>
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Módulo de Originación de Crédito</span>
            <h1 className="text-2xl font-extrabold mt-0.5">Emisión de Préstamo Empresarial</h1>
          </div>
          <div className="flex items-center space-x-2 text-xs font-semibold bg-blue-600/10 text-blue-400 px-3 py-1.5 rounded-lg border border-blue-500/20">
            <span>Sede Operativa:</span>
            <strong className="uppercase">{cajeroSede}</strong>
          </div>
        </div>

        {/* PASOS DE EVALUACIÓN */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 text-xs font-bold">
          <div className={`flex items-center space-x-3 p-2.5 rounded-xl border ${clienteValidado ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-gray-900/30 border-gray-700 text-gray-400'}`}>
            <span className="h-6 w-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-extrabold">1</span>
            <span>Consulta & Validación SUNAT</span>
          </div>

          <div className={`flex items-center space-x-3 p-2.5 rounded-xl border ${clienteValidado ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-gray-900/30 border-gray-700 text-gray-400'}`}>
            <span className="h-6 w-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-extrabold">2</span>
            <span>Parametrización de Crédito</span>
          </div>

          <div className={`flex items-center space-x-3 p-2.5 rounded-xl border ${clienteValidado && !excedeLimite ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-gray-900/30 border-gray-700 text-gray-400'}`}>
            <span className="h-6 w-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-extrabold">3</span>
            <span>Aprobación y Desembolso</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border-l-4 border-red-500 p-4 text-red-400 text-sm font-semibold rounded-lg">
          ⚠️ {error}
        </div>
      )}

      {/* CUERPO PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COLUMNA IZQUIERDA */}
        <div className="lg:col-span-2 space-y-6">
          {/* BLOQUE 1: IDENTIFICACIÓN DEL CLIENTE */}
          <div className={`p-6 rounded-2xl border space-y-5 ${cardStyle}`}>
            <div className="flex justify-between items-center">
              <h2 className="text-base font-bold flex items-center space-x-2">
                <span className="text-blue-500">🏢</span>
                <span>Selección del Tipo de Titular</span>
              </h2>
              <span className="text-xs text-gray-400 font-medium">Servicio API SUNAT Activo</span>
            </div>

            {/* ÚNICAMENTE RUC 20 Y RUC 10 */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setTipoCliente('RUC_JURIDICA');
                  setClienteValidado(null);
                }}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                  tipoCliente === 'RUC_JURIDICA'
                    ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                    : 'bg-gray-900/40 text-gray-300 border-gray-700 hover:bg-gray-700/50'
                }`}
              >
                🏢 Persona Jurídica (RUC 20)
              </button>

              <button
                type="button"
                onClick={() => {
                  setTipoCliente('RUC_NATURAL');
                  setClienteValidado(null);
                }}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                  tipoCliente === 'RUC_NATURAL'
                    ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                    : 'bg-gray-900/40 text-gray-300 border-gray-700 hover:bg-gray-700/50'
                }`}
              >
                👤 Persona Natural con RUC (RUC 10)
              </button>
            </div>

            {/* BUSCADOR */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase text-gray-400">
                Número de RUC (11 Dígitos)
              </label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    maxLength={11}
                    value={documentoInput}
                    onChange={(e) => setDocumentoInput(e.target.value)}
                    placeholder="Ingrese el número de RUC de 11 dígitos"
                    className={`w-full p-3 border rounded-xl font-mono text-base font-bold tracking-wider ${inputStyle}`}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleValidarCliente}
                  disabled={loadingValidacion || !documentoInput.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white font-bold px-6 py-3 rounded-xl text-xs transition-all shadow-md flex items-center space-x-2"
                >
                  {loadingValidacion ? (
                    <span>Consultando...</span>
                  ) : (
                    <>
                      <span>🔍</span>
                      <span>Consultar Documento</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* BLOQUE 2: ESTRUCTURA FINANCIERA */}
          <div className={`p-6 rounded-2xl border space-y-5 ${cardStyle}`}>
            <h2 className="text-base font-bold flex items-center space-x-2">
              <span className="text-blue-500">💰</span>
              <span>Estructura Financiera del Préstamo</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Fecha de Desembolso</label>
                <input
                  type="date"
                  value={hoyFecha}
                  disabled
                  className={`w-full p-3 border rounded-xl font-bold text-sm ${darkMode ? 'bg-gray-900 border-gray-700 text-gray-400' : 'bg-gray-100 border-gray-300 text-gray-600'}`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Monto Solicitado (S/)</label>
                <input
                  type="number"
                  min="100"
                  max="10000"
                  step="100"
                  value={monto}
                  onChange={(e) => setMonto(Number(e.target.value))}
                  disabled={!clienteValidado}
                  className={`w-full p-3 border rounded-xl font-bold text-base ${inputStyle} ${excedeLimite ? 'border-red-500 bg-red-500/10' : ''}`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Plazo de Devolución</label>
                <select
                  value={plazo}
                  onChange={(e) => setPlazo(Number(e.target.value))}
                  disabled={!clienteValidado}
                  className={`w-full p-3 border rounded-xl font-bold text-sm ${inputStyle}`}
                >
                  <option value={1}>1 Mes (30 días)</option>
                  <option value={3}>3 Meses</option>
                  <option value={6}>6 Meses</option>
                  <option value={12}>12 Meses (1 Año)</option>
                  <option value={24}>24 Meses (2 Años)</option>
                  <option value={36}>36 Meses (3 Años)</option>
                  <option value={60}>60 Meses (5 Años)</option>
                </select>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-blue-600/10 border border-blue-500/20 text-xs text-blue-300 flex justify-between items-center">
              <span>Tasa Fija de Interés: <strong>30% Global</strong></span>
              <span>Ciclo de Facturación: <strong>30 Días Estrictos</strong></span>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: FICHA OPERATIVA */}
        <div className="space-y-6">
          <div className={`p-6 rounded-2xl border space-y-4 ${cardStyle}`}>
            <div className="flex justify-between items-center border-b pb-3 border-gray-700/50">
              <h3 className="text-sm font-bold uppercase tracking-wider text-blue-400">Ficha de Evaluación</h3>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${clienteValidado ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
                {clienteValidado ? '✓ VALIDADO' : 'PENDIENTE'}
              </span>
            </div>

            {!clienteValidado ? (
              <div className="py-8 text-center text-xs text-gray-400 space-y-2">
                <div className="text-3xl">📋</div>
                <p>Ingresa el número de RUC de 11 dígitos y presiona <strong>Consultar Documento</strong> para verificar en SUNAT.</p>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Razón Social / Titular</span>
                  <p className="font-extrabold text-sm text-white">{clienteValidado.nombre_o_razon_social}</p>
                  <p className="text-gray-400">RUC: {clienteValidado.ruc}</p>
                </div>

                <div className="p-3 rounded-xl bg-gray-900/50 border border-gray-700/50 space-y-1">
                  <span className="text-blue-400 font-bold block text-[10px] uppercase">Representante Legal (SUNAT)</span>
                  <p className="font-bold text-gray-200">{clienteValidado.representante_nombre}</p>
                  <p className="text-gray-400">DNI: {clienteValidado.representante_dni}</p>
                </div>

                <div className="border-t pt-3 border-gray-700/50 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Monto del Préstamo:</span>
                    <strong className="text-white">S/ {monto.toFixed(2)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total con Interés (30%):</span>
                    <strong className="text-white">S/ {montoTotalConInteres.toFixed(2)}</strong>
                  </div>
                  <div className="flex justify-between text-sm pt-1 border-t border-gray-700/30">
                    <span className="font-bold text-blue-400">Cuota Mensual:</span>
                    <strong className="font-extrabold text-blue-400">S/ {cuotaMensual}</strong>
                  </div>
                  <div className="flex justify-between text-[11px] text-gray-400 pt-1">
                    <span>Vencimiento 1ª Cuota:</span>
                    <strong>{fechaPrimeraCuota.toLocaleDateString('es-PE')}</strong>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex justify-between font-bold">
                  <span>Límite Disponible:</span>
                  <span>S/ {saldoDisponible.toFixed(2)} / S/ 10,000</span>
                </div>
              </div>
            )}

            {excedeLimite && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold">
                ⚠️ El monto ingresado excede el crédito máximo disponible acumulado (S/ {saldoDisponible.toFixed(2)}).
              </div>
            )}

            <button
              type="button"
              onClick={handleEmitirPrestamo}
              disabled={!clienteValidado || excedeLimite || loadingProceso}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white font-extrabold py-3.5 px-4 rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-blue-600/20 mt-2"
            >
              {loadingProceso ? 'Emitiendo Préstamo...' : 'Aprobar y Emitir Desembolso'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}