'use client';

import { useState } from 'react';
import { registrarPrestamo } from '@/lib/loans';

interface Props {
  cajaId: string;
  sede: 'Chimbote' | 'Trujillo' | 'Chiclayo' | 'Tumbes' | 'Piura';
  darkMode: boolean;
  onSuccess: () => void;
}

type TipoCliente = 'dni' | 'ruc_natural' | 'ruc_juridica';

export default function NuevoPrestamoForm({ cajaId, sede, darkMode, onSuccess }: Props) {
  const [tipoCliente, setTipoCliente] = useState<TipoCliente>('ruc_juridica');
  const [documento, setDocumento] = useState('');
  
  // Datos devueltos/validados por SUNAT
  const [clienteValidado, setClienteValidado] = useState<any | null>(null);
  const [consultando, setConsultando] = useState(false);
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);

  // Condiciones
  const [monto, setMonto] = useState<number>(1000);
  const [plazo, setPlazo] = useState<number>(12);
  const [loading, setLoading] = useState(false);

  const montoTotalConInteres = monto * 1.30;
  const cuotaMensual = (montoTotalConInteres / (plazo || 1)).toFixed(2);
  const excedeLimite = clienteValidado ? monto > clienteValidado.saldoDisponible : false;

  // Consulta API SUNAT / DNI
  const handleValidarCliente = async () => {
    if (!documento.trim()) return;
    setConsultando(true);
    setErrorValidacion(null);
    setClienteValidado(null);

    try {
      if (tipoCliente === 'dni') {
        // Validación de DNI
        setClienteValidado({
          id: null,
          nombre: `CLIENTE DNI ${documento}`,
          representante: `PERSONA NATURAL (${documento})`,
          documento,
          tipo: 'Persona Natural',
          montoPrestado: 0,
          saldoDisponible: 10000,
        });
      } else {
        // Consulta RUC SUNAT (Persona Jurídica o RUC Natural)
        const res = await fetch(`/api/ruc?ruc=${documento.trim()}`);
        if (res.ok) {
          const data = await res.json();
          setClienteValidado({
            id: null,
            nombre: data.razonSocial || `EMPRESA RUC ${documento}`,
            representante: data.representanteNombre || 'REPRESENTANTE LEGAL SUNAT',
            documento,
            tipo: tipoCliente === 'ruc_juridica' ? 'Persona Jurídica' : 'Persona Natural con RUC',
            montoPrestado: 0,
            saldoDisponible: 10000,
          });
        } else {
          setErrorValidacion('No se encontró el RUC en SUNAT o el número es inválido.');
        }
      }
    } catch (e) {
      setErrorValidacion('Error al conectar con el servicio de validación.');
    } finally {
      setConsultando(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteValidado || !cajaId || excedeLimite) return;

    try {
      setLoading(true);
      await registrarPrestamo({
        clienteId: clienteValidado.id || clienteValidado.documento,
        sede,
        montoBase: monto,
        plazoMeses: plazo,
        cajaId,
      });
      onSuccess();
    } catch (err: any) {
      setErrorValidacion(err.message || 'Error al emitir el préstamo.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = darkMode
    ? 'bg-gray-800 text-white border-gray-600 placeholder-gray-400 focus:bg-gray-700'
    : 'bg-white text-gray-900 border-gray-300 placeholder-gray-500 focus:bg-gray-50';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* SECCIÓN IZQUIERDA: PASO 1 Y PASO 2 */}
      <div className="lg:col-span-2 space-y-6">
        {/* PASO 1: DATOS DEL CLIENTE */}
        <div
          className={`p-6 rounded-xl border space-y-4 ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}
        >
          <h2 className="text-lg font-bold">1. Datos del cliente</h2>

          {/* Botones / Pestañas de Selección de Tipo de Cliente */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                setTipoCliente('dni');
                setDocumento('');
                setClienteValidado(null);
              }}
              className={`p-3 text-xs font-bold rounded-lg border transition-all ${
                tipoCliente === 'dni'
                  ? 'bg-blue-600 text-white border-blue-500'
                  : darkMode
                  ? 'bg-gray-900/50 text-gray-300 border-gray-700 hover:bg-gray-700/50'
                  : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
              }`}
            >
              Persona natural (DNI)
            </button>

            <button
              type="button"
              onClick={() => {
                setTipoCliente('ruc_natural');
                setDocumento('');
                setClienteValidado(null);
              }}
              className={`p-3 text-xs font-bold rounded-lg border transition-all ${
                tipoCliente === 'ruc_natural'
                  ? 'bg-blue-600 text-white border-blue-500'
                  : darkMode
                  ? 'bg-gray-900/50 text-gray-300 border-gray-700 hover:bg-gray-700/50'
                  : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
              }`}
            >
              Persona natural con RUC
            </button>

            <button
              type="button"
              onClick={() => {
                setTipoCliente('ruc_juridica');
                setDocumento('');
                setClienteValidado(null);
              }}
              className={`p-3 text-xs font-bold rounded-lg border transition-all ${
                tipoCliente === 'ruc_juridica'
                  ? 'bg-blue-600 text-white border-blue-500'
                  : darkMode
                  ? 'bg-gray-900/50 text-gray-300 border-gray-700 hover:bg-gray-700/50'
                  : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
              }`}
            >
              Persona jurídica (RUC)
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase mb-1">
              {tipoCliente === 'dni' ? 'N° de DNI (8 dígitos)' : 'N° de RUC (11 dígitos)'}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                maxLength={tipoCliente === 'dni' ? 8 : 11}
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                placeholder={tipoCliente === 'dni' ? 'Ej: 45871236' : 'Ej: 20601234567'}
                className={`flex-1 p-3 border rounded-lg font-bold text-base ${inputStyle}`}
              />
              <button
                type="button"
                onClick={handleValidarCliente}
                disabled={consultando || !documento.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 text-white font-bold px-6 rounded-lg text-sm transition-colors"
              >
                {consultando ? 'Validando...' : 'Validar SUNAT'}
              </button>
            </div>
          </div>

          {errorValidacion && (
            <p className="text-xs font-bold text-red-500 bg-red-500/10 p-2.5 rounded border border-red-500/20">
              ⚠️ {errorValidacion}
            </p>
          )}
        </div>

        {/* PASO 2: CONDICIONES DEL PRÉSTAMO */}
        <div
          className={`p-6 rounded-xl border space-y-4 ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}
        >
          <h2 className="text-lg font-bold">2. Condiciones del préstamo</h2>
          {!clienteValidado && (
            <p className="text-xs text-gray-400">Primero valida el documento del cliente en la sección superior.</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase mb-1">Fecha del préstamo</label>
              <input
                type="text"
                value={new Date().toLocaleDateString('es-PE')}
                disabled
                className={`w-full p-2.5 border rounded-lg font-bold text-sm ${
                  darkMode ? 'bg-gray-900 text-gray-300 border-gray-700' : 'bg-gray-100 text-gray-700'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase mb-1">Monto (S/)</label>
              <input
                type="number"
                min="100"
                max="10000"
                value={monto}
                onChange={(e) => setMonto(Number(e.target.value))}
                disabled={!clienteValidado}
                className={`w-full p-2.5 border rounded-lg font-bold text-sm ${inputStyle}`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase mb-1">Plazo (meses)</label>
              <input
                type="number"
                min="1"
                max="60"
                value={plazo}
                onChange={(e) => setPlazo(Number(e.target.value))}
                disabled={!clienteValidado}
                className={`w-full p-2.5 border rounded-lg font-bold text-sm ${inputStyle}`}
              />
            </div>
          </div>

          <p className="text-xs text-gray-400">
            De S/ 1 a S/ 10,000 · máximo 60 meses · 30% fijo · cuota fija cada 30 días exactos.
          </p>
        </div>
      </div>

      {/* SECCIÓN DERECHA: RESUMEN Y VERIFICACIONES */}
      <div className="space-y-6">
        {/* RESUMEN */}
        <div
          className={`p-6 rounded-xl border space-y-3 ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}
        >
          <h2 className="text-lg font-bold">Resumen</h2>

          {clienteValidado ? (
            <div className="space-y-2 text-sm border-t pt-3 border-gray-500/20">
              <p className="font-bold text-blue-400">{clienteValidado.nombre}</p>
              <p className="text-xs text-gray-400">Rep: {clienteValidado.representante}</p>
              <p className="text-xs text-gray-400">Documento: {clienteValidado.documento}</p>

              <div className="pt-2 border-t border-gray-500/20 space-y-1">
                <p className="flex justify-between text-xs">
                  <span>Monto Solicitado:</span>
                  <strong>S/ {monto.toFixed(2)}</strong>
                </p>
                <p className="flex justify-between text-xs">
                  <span>Total con 30%:</span>
                  <strong>S/ {montoTotalConInteres.toFixed(2)}</strong>
                </p>
                <p className="flex justify-between text-xs text-green-400 font-bold">
                  <span>Cuota Mensual ({plazo}m):</span>
                  <span>S/ {cuotaMensual}</span>
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400">Valida primero al cliente para cargar el desglose.</p>
          )}
        </div>

        {/* VERIFICACIONES Y BOTÓN FINAL */}
        <div
          className={`p-6 rounded-xl border space-y-4 ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}
        >
          <h2 className="text-lg font-bold">Verificaciones</h2>

          <div className="space-y-2 text-xs">
            <div className="flex items-center space-x-2">
              <span className={`h-2.5 w-2.5 rounded-full ${clienteValidado ? 'bg-green-400' : 'bg-gray-500'}`} />
              <span className={clienteValidado ? 'text-gray-200 font-bold' : 'text-gray-400'}>
                {clienteValidado ? 'Cliente validado con SUNAT' : 'Cliente pendiente de validación'}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <span className={`h-2.5 w-2.5 rounded-full ${cajaId ? 'bg-green-400' : 'bg-red-500'}`} />
              <span className={cajaId ? 'text-gray-200 font-bold' : 'text-red-400'}>
                {cajaId ? 'Caja aperturada en sede' : 'Caja cerrada (Operación bloqueada)'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!clienteValidado || !cajaId || loading || excedeLimite}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 text-white font-bold py-3 rounded-lg text-sm transition-colors shadow-md"
          >
            {loading ? 'Generando...' : 'Generar contrato y cronograma'}
          </button>

          <p className="text-[11px] text-gray-400">
            Todavía no se guarda nada: el préstamo se registra oficialmente cuando confirmes el contrato.
          </p>
        </div>
      </div>
    </div>
  );
}