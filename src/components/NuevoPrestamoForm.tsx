'use client';

import { useState } from 'react';
import { registrarPrestamo } from '@/lib/loans';

interface Props {
  clienteId: string;
  nombreEmpresa: string;
  representanteNombre: string;
  sede: 'Chimbote' | 'Trujillo' | 'Chiclayo' | 'Tumbes' | 'Piura';
  saldoDisponible: number;
  cajaId: string;
  darkMode: boolean;
  onSuccess: () => void;
}

export default function NuevoPrestamoForm({
  clienteId,
  nombreEmpresa,
  representanteNombre,
  sede,
  saldoDisponible,
  cajaId,
  darkMode,
  onSuccess,
}: Props) {
  const [monto, setMonto] = useState<number>(1000);
  const [plazo, setPlazo] = useState<number>(12);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const montoTotalConInteres = monto * 1.30;
  const cuotaMensual = (montoTotalConInteres / (plazo || 1)).toFixed(2);
  const excedeLimite = monto > saldoDisponible;

  // Cálculo de primera cuota exacta a 30 días
  const hoy = new Date();
  const primeraCuota = new Date(hoy);
  primeraCuota.setDate(primeraCuota.getDate() + 30);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!cajaId) {
      setError('Debes aperturar caja antes de emitir un préstamo.');
      return;
    }

    if (excedeLimite) {
      setError(`El monto excede el saldo máximo disponible de S/ ${saldoDisponible.toFixed(2)}.`);
      return;
    }

    try {
      setLoading(true);
      await registrarPrestamo({
        clienteId,
        sede,
        montoBase: monto,
        plazoMeses: plazo,
        cajaId,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Error al procesar el préstamo.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = darkMode
    ? 'bg-gray-700 text-white border-gray-600 placeholder-gray-400 focus:bg-gray-600'
    : 'bg-white text-gray-900 border-gray-300 placeholder-gray-500 focus:bg-gray-50';

  return (
    <form
      onSubmit={handleSubmit}
      className={`p-6 rounded-lg shadow-md border space-y-4 ${
        darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'
      }`}
    >
      <div className="border-b pb-3 flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold">Nuevo Préstamo - {nombreEmpresa}</h2>
          <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Representante Legal: <strong>{representanteNombre}</strong> | Sede:{' '}
            <span className="font-semibold text-blue-500">{sede}</span>
          </p>
        </div>
        <span className="bg-green-500/20 text-green-400 text-xs font-bold px-2.5 py-1 rounded border border-green-500/30">
          Caja Vinc. Activa
        </span>
      </div>

      {error && (
        <div className="bg-red-500/10 border-l-4 border-red-500 p-3 text-red-500 text-sm font-bold">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className={`block text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
            Monto a Prestar (Máx disp: S/ {saldoDisponible.toFixed(2)})
          </label>
          <input
            type="number"
            min="100"
            max="10000"
            value={monto}
            onChange={(e) => setMonto(Number(e.target.value))}
            className={`mt-1 block w-full p-2.5 border rounded-md font-semibold text-base ${inputStyle} ${
              excedeLimite ? 'border-red-500 bg-red-500/10' : ''
            }`}
            required
          />
        </div>

        <div>
          <label className={`block text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
            Plazo (Meses: 1 a 60)
          </label>
          <input
            type="number"
            min="1"
            max="60"
            value={plazo}
            onChange={(e) => setPlazo(Number(e.target.value))}
            className={`mt-1 block w-full p-2.5 border rounded-md font-semibold text-base ${inputStyle}`}
            required
          />
        </div>

        <div>
          <label className={`block text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
            Tasa de Interés
          </label>
          <input
            type="text"
            value="30% Fijo"
            disabled
            className={`mt-1 block w-full p-2.5 border rounded-md font-bold text-base ${
              darkMode ? 'bg-gray-700 text-gray-300 border-gray-600' : 'bg-gray-100 text-gray-800 border-gray-300'
            }`}
          />
        </div>
      </div>

      <div
        className={`p-4 rounded-md space-y-1 text-sm ${
          darkMode ? 'bg-blue-950/50 text-blue-200 border border-blue-800' : 'bg-blue-50 text-blue-900'
        }`}
      >
        <p>
          <strong>Monto Total a Devolver (con 30%):</strong> S/ {montoTotalConInteres.toFixed(2)}
        </p>
        <p>
          <strong>Valor por Cuota Mensual:</strong> S/ {cuotaMensual} ({plazo} cuotas)
        </p>
        <p className="text-xs text-blue-400 font-semibold pt-1">
          📅 Primera cuota vence exactamente a los 30 días: <strong>{primeraCuota.toLocaleDateString('es-PE')}</strong>
        </p>
      </div>

      <button
        type="submit"
        disabled={loading || excedeLimite}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-md disabled:bg-gray-500 transition-colors"
      >
        {loading ? 'Procesando Desembolso...' : 'Aprobar y Registrar Préstamo'}
      </button>
    </form>
  );
}