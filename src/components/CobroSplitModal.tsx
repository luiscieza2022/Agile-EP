'use client';

import { useState } from 'react';
import { registrarPagoSplit } from '@/lib/loans';

interface Props {
  cuotaId: string;
  montoCuota: number;
  numeroCuota: number;
  darkMode: boolean;
  onSuccess: () => void;
  onClose: () => void;
}

const METODOS_PAGO = [
  'Efectivo',
  'Tarjeta de Credito',
  'Tarjeta de Debito',
  'Yape',
  'Plin',
  'Transferencia'
];

export default function CobroSplitModal({
  cuotaId,
  montoCuota,
  numeroCuota,
  darkMode,
  onSuccess,
  onClose,
}: Props) {
  const [usarDosMetodos, setUsarDosMetodos] = useState(false);
  const [metodo1, setMetodo1] = useState('Efectivo');
  const [monto1, setMonto1] = useState<number>(montoCuota);

  const [metodo2, setMetodo2] = useState('Yape');
  const [monto2, setMonto2] = useState<number>(0);

  const [referencia, setReferencia] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sumaActual = monto1 + (usarDosMetodos ? monto2 : 0);
  const estaCuadrado = Math.abs(sumaActual - montoCuota) < 0.01;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!estaCuadrado) {
      setError(
        `La suma de los montos (S/ ${sumaActual.toFixed(
          2
        )}) debe ser exactamente igual al total de la cuota (S/ ${montoCuota.toFixed(2)}).`
      );
      return;
    }

    try {
      setLoading(true);
      await registrarPagoSplit({
        cuotaId,
        metodo1,
        monto1,
        metodo2: usarDosMetodos ? metodo2 : undefined,
        monto2: usarDosMetodos ? monto2 : 0,
        referencia,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Error al procesar el pago.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = darkMode
    ? 'bg-gray-700 text-white border-gray-600 focus:bg-gray-600'
    : 'bg-white text-gray-900 border-gray-300 focus:bg-gray-50';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center p-4 z-50">
      <div
        className={`rounded-lg shadow-2xl p-6 max-w-lg w-full space-y-4 border ${
          darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'
        }`}
      >
        <h3 className="text-lg font-bold">
          Cobrar Cuota #{numeroCuota} - Total: S/ {montoCuota.toFixed(2)}
        </h3>

        {error && (
          <div className="bg-red-500/10 border-l-4 border-red-500 p-2 text-red-500 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className={`border p-3 rounded-md space-y-2 ${darkMode ? 'bg-gray-900/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
            <label className="block text-xs font-bold text-blue-500 uppercase">Método de Pago 1</label>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={metodo1}
                onChange={(e) => setMetodo1(e.target.value)}
                className={`p-2 border rounded-md text-sm font-medium ${inputStyle}`}
              >
                {METODOS_PAGO.map((m) => (
                  <option key={m} value={m} className={darkMode ? 'bg-gray-800' : 'bg-white'}>{m}</option>
                ))}
              </select>
              <input
                type="number"
                step="0.01"
                value={monto1}
                onChange={(e) => setMonto1(Number(e.target.value))}
                className={`p-2 border rounded-md text-sm font-semibold ${inputStyle}`}
                placeholder="Monto 1"
                required
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="splitToggle"
              checked={usarDosMetodos}
              onChange={(e) => {
                setUsarDosMetodos(e.target.checked);
                if (e.target.checked) {
                  setMonto1(Number((montoCuota / 2).toFixed(2)));
                  setMonto2(Number((montoCuota / 2).toFixed(2)));
                } else {
                  setMonto1(montoCuota);
                  setMonto2(0);
                }
              }}
              className="h-4 w-4 text-blue-600 rounded"
            />
            <label htmlFor="splitToggle" className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Dividir el pago usando 2 métodos a la vez (Pago Split)
            </label>
          </div>

          {usarDosMetodos && (
            <div className={`border p-3 rounded-md space-y-2 ${darkMode ? 'bg-blue-950/40 border-blue-800' : 'bg-blue-50 border-blue-200'}`}>
              <label className="block text-xs font-bold text-blue-400 uppercase">Método de Pago 2</label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={metodo2}
                  onChange={(e) => setMetodo2(e.target.value)}
                  className={`p-2 border rounded-md text-sm font-medium ${inputStyle}`}
                >
                  {METODOS_PAGO.filter((m) => m !== metodo1).map((m) => (
                    <option key={m} value={m} className={darkMode ? 'bg-gray-800' : 'bg-white'}>{m}</option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.01"
                  value={monto2}
                  onChange={(e) => setMonto2(Number(e.target.value))}
                  className={`p-2 border rounded-md text-sm font-semibold ${inputStyle}`}
                  placeholder="Monto 2"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className={`block text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              N° de Operación / Referencia (Opcional)
            </label>
            <input
              type="text"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              className={`mt-1 block w-full p-2 border rounded-md text-sm ${inputStyle}`}
              placeholder="Ej: Op-984214"
            />
          </div>

          <div
            className={`p-2 rounded-md text-xs font-semibold ${
              estaCuadrado
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}
          >
            Monto ingresado: S/ {sumaActual.toFixed(2)} / S/ {montoCuota.toFixed(2)}
          </div>

          <div className="flex space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={`w-1/2 py-2 rounded-md text-sm font-medium ${
                darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              }`}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !estaCuadrado}
              className="w-1/2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-md text-sm disabled:bg-gray-500"
            >
              {loading ? 'Procesando...' : 'Confirmar Pago'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}