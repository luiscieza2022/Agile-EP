'use client';

import { useState } from 'react';
import { registrarPagoSplit } from '@/lib/loans';

interface Props {
  cuotaId: string;
  montoCuota: number;
  numeroCuota: number;
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

export default function CobroSplitModal({ cuotaId, montoCuota, numeroCuota, onSuccess, onClose }: Props) {
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
      setError(`La suma de los montos (S/ ${sumaActual.toFixed(2)}) debe ser exactamente igual al total de la cuota (S/ ${montoCuota.toFixed(2)}).`);
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full space-y-4">
        <h3 className="text-lg font-bold text-gray-800">Cobrar Cuota #{numeroCuota} - Total: S/ {montoCuota.toFixed(2)}</h3>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-2 text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Primer Método de Pago */}
          <div className="border p-3 rounded-md bg-gray-50 space-y-2">
            <label className="block text-xs font-bold text-gray-600 uppercase">Método de Pago 1</label>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={metodo1}
                onChange={(e) => setMetodo1(e.target.value)}
                className="p-2 border rounded-md text-sm"
              >
                {METODOS_PAGO.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <input
                type="number"
                step="0.01"
                value={monto1}
                onChange={(e) => setMonto1(Number(e.target.value))}
                className="p-2 border rounded-md text-sm"
                placeholder="Monto 1"
                required
              />
            </div>
          </div>

          {/* Toggle para Activar Segundo Método de Pago */}
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
              className="h-4 w-4 text-blue-600"
            />
            <label htmlFor="splitToggle" className="text-sm font-medium text-gray-700">
              Dividir el pago usando 2 métodos a la vez (Pago Split)
            </label>
          </div>

          {/* Segundo Método de Pago */}
          {usarDosMetodos && (
            <div className="border p-3 rounded-md bg-blue-50 space-y-2">
              <label className="block text-xs font-bold text-blue-800 uppercase">Método de Pago 2</label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={metodo2}
                  onChange={(e) => setMetodo2(e.target.value)}
                  className="p-2 border rounded-md text-sm"
                >
                  {METODOS_PAGO.filter((m) => m !== metodo1).map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.01"
                  value={monto2}
                  onChange={(e) => setMonto2(Number(e.target.value))}
                  className="p-2 border rounded-md text-sm"
                  placeholder="Monto 2"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600">N° de Operación / Referencia (Opcional)</label>
            <input
              type="text"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              className="mt-1 block w-full p-2 border rounded-md text-sm"
              placeholder="Ej: Op-984214"
            />
          </div>

          {/* Estado de cuadre de caja */}
          <div className={`p-2 rounded-md text-xs font-semibold ${estaCuadrado ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            Monto ingresado: S/ {sumaActual.toFixed(2)} / S/ {montoCuota.toFixed(2)}
          </div>

          <div className="flex space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 rounded-md text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !estaCuadrado}
              className="w-1/2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-md text-sm disabled:bg-gray-400"
            >
              {loading ? 'Procesando...' : 'Confirmar Pago'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}