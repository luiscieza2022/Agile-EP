'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Props {
  cajeroId: string;
  sede: string;
  cajaActiva: any | null;
  darkMode: boolean;
  onActualizarCaja: (caja: any | null) => void;
}

export default function CajaControlModal({
  cajeroId,
  sede,
  cajaActiva,
  darkMode,
  onActualizarCaja,
}: Props) {
  const [monto, setMonto] = useState<number>(500);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Aperturar Caja
  const handleAperturar = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: err } = await supabase
      .from('cajas')
      .insert([
        {
          cajero_id: cajeroId,
          sede,
          monto_apertura: monto,
          estado: 'Abierta',
        },
      ])
      .select()
      .single();

    setLoading(false);

    if (err) {
      setError('Error al aperturar la caja.');
      return;
    }

    onActualizarCaja(data);
  };

  // Cerrar Caja
  const handleCerrar = async () => {
    if (!cajaActiva) return;
    setLoading(true);
    setError(null);

    const { error: err } = await supabase
      .from('cajas')
      .update({
        monto_cierre: monto,
        estado: 'Cerrada',
        fecha_cierre: new Date().toISOString(),
      })
      .eq('id', cajaActiva.id);

    setLoading(false);

    if (err) {
      setError('Error al cerrar la caja.');
      return;
    }

    onActualizarCaja(null);
  };

  const inputStyle = darkMode
    ? 'bg-gray-700 text-white border-gray-600 focus:bg-gray-600'
    : 'bg-white text-gray-900 border-gray-300 focus:bg-gray-50';

  return (
    <div className={`p-4 rounded-lg border shadow-sm ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
      <div className="flex justify-between items-center mb-3">
        <div>
          <h3 className="text-sm font-bold uppercase text-blue-500">
            Control de Caja Presencial - Sede {sede}
          </h3>
          <p className="text-xs text-gray-400">
            Estado Actual:{' '}
            <span className={`font-extrabold ${cajaActiva ? 'text-green-400' : 'text-red-400'}`}>
              {cajaActiva ? '🟢 CAJA ABIERTA' : '🔴 CAJA CERRADA (Operaciones Bloqueadas)'}
            </span>
          </p>
        </div>

        {cajaActiva && (
          <button
            onClick={handleCerrar}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded font-bold text-xs transition-colors"
          >
            {loading ? 'Procesando...' : '🔒 Cerrar Caja del Día'}
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border-l-4 border-red-500 p-2 text-red-500 text-xs mb-3">
          {error}
        </div>
      )}

      {!cajaActiva && (
        <form onSubmit={handleAperturar} className="flex gap-3 items-center bg-amber-500/10 p-3 rounded-lg border border-amber-500/30">
          <div className="flex-1">
            <label className="block text-xs font-bold text-amber-500 mb-1">
              Monto Inicial de Apertura (S/)
            </label>
            <input
              type="number"
              min="0"
              step="10"
              value={monto}
              onChange={(e) => setMonto(Number(e.target.value))}
              className={`w-full p-2 border rounded-md text-sm font-bold ${inputStyle}`}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-md font-bold text-xs mt-4 transition-colors"
          >
            {loading ? 'Aperturando...' : '🔓 Aperturar Caja'}
          </button>
        </form>
      )}
    </div>
  );
}