'use client';

import { useState } from 'react';
import { registrarPrestamo } from '@/lib/loans';

interface Props {
  clienteId: string;
  nombreEmpresa: string;
  representanteNombre: string;
  sede: 'Chimbote' | 'Trujillo' | 'Chiclayo' | 'Tumbes' | 'Piura';
  saldoDisponible: number;
  onSuccess: () => void;
}

export default function NuevoPrestamoForm({
  clienteId,
  nombreEmpresa,
  representanteNombre,
  sede,
  saldoDisponible,
  onSuccess,
}: Props) {
  const [monto, setMonto] = useState<number>(1000);
  const [plazo, setPlazo] = useState<number>(12);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const montoTotalConInteres = monto * 1.3;
  const cuotaMensual = (montoTotalConInteres / (plazo || 1)).toFixed(2);
  const excedeLimite = monto > saldoDisponible;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

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
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Error al procesar el préstamo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md border space-y-4">
      <div className="border-b pb-3">
        <h2 className="text-xl font-bold text-gray-800">Nuevo Préstamo - {nombreEmpresa}</h2>
        <p className="text-sm text-gray-600">
          Atendido por: <strong>{representanteNombre}</strong> | Sede: <span className="font-semibold text-blue-700">{sede}</span>
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Monto a Prestar (Máx disp: S/ {saldoDisponible.toFixed(2)})
          </label>
          <input
            type="number"
            min="100"
            max="10000"
            value={monto}
            onChange={(e) => setMonto(Number(e.target.value))}
            className={`mt-1 block w-full p-2 border rounded-md ${excedeLimite ? 'border-red-500 bg-red-50' : ''}`}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Plazo (Meses: 1 a 60)</label>
          <input
            type="number"
            min="1"
            max="60"
            value={plazo}
            onChange={(e) => setPlazo(Number(e.target.value))}
            className="mt-1 block w-full p-2 border rounded-md"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Tasa de Interés</label>
          <input
            type="text"
            value="30% Fijo"
            disabled
            className="mt-1 block w-full p-2 border bg-gray-100 rounded-md text-gray-600 font-semibold"
          />
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-md space-y-1 text-sm text-blue-900">
        <p><strong>Monto Total a Devolver (con 30%):</strong> S/ {montoTotalConInteres.toFixed(2)}</p>
        <p><strong>Valor por Cuota Mensual:</strong> S/ {cuotaMensual} ({plazo} meses)</p>
        {monto === saldoDisponible && (
          <p className="text-amber-700 font-medium mt-1">
            ⚠️ Al aprobar este monto, el cliente alcanzará el límite total de S/ 10,000 y se reportará internamente como Transacción Sospechosa.
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={loading || excedeLimite}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md disabled:bg-gray-400"
      >
        {loading ? 'Procesando Desembolso...' : 'Aprobar y Registrar Préstamo'}
      </button>
    </form>
  );
}