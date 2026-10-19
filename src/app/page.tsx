'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import NuevoPrestamoForm from '@/components/NuevoPrestamoForm';
import CobroSplitModal from '@/components/CobroSplitModal';

const SEDES = ['Chimbote', 'Trujillo', 'Chiclayo', 'Tumbes', 'Piura'] as const;

export default function HomePage() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<any | null>(null);
  const [cuotas, setCuotas] = useState<any[]>([]);
  const [cuotaACobrar, setCuotaACobrar] = useState<any | null>(null);
  const [verModalNuevo, setVerModalNuevo] = useState(false);

  // Campos para Registro de Empresa y Representante
  const [razonSocial, setRazonSocial] = useState('');
  const [ruc, setRuc] = useState('');
  const [sede, setSede] = useState<typeof SEDES[number]>('Trujillo');
  const [repNombre, setRepNombre] = useState('');
  const [repDni, setRepDni] = useState('');
  const [repTelefono, setRepTelefono] = useState('');

  const cargarClientes = async () => {
    const { data } = await supabase.from('vista_resumen_cliente').select('*');
    if (data) setClientes(data);
  };

  const cargarCuotasCliente = async (clienteId: string) => {
    const { data: prestamos } = await supabase
      .from('prestamos')
      .select('id')
      .eq('cliente_id', clienteId);

    if (prestamos && prestamos.length > 0) {
      const ids = prestamos.map((p) => p.id);
      const { data: cuotasData } = await supabase
        .from('cuotas')
        .select('*')
        .in('prestamo_id', ids)
        .order('fecha_vencimiento', { ascending: true });

      setCuotas(cuotasData || []);
    } else {
      setCuotas([]);
    }
  };

  useEffect(() => {
    cargarClientes();
  }, []);

  const handleCrearCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!razonSocial || !ruc || !repNombre || !repDni) return;

    await supabase.from('clientes').insert([
      { 
        nombre_o_razon_social: razonSocial,
        documento_identidad: ruc,
        ruc,
        sede,
        representante_nombre: repNombre,
        representante_dni: repDni,
        representante_telefono: repTelefono,
      }
    ]);

    setRazonSocial('');
    setRuc('');
    setRepNombre('');
    setRepDni('');
    setRepTelefono('');
    cargarClientes();
  };

  return (
    <main className="min-h-screen bg-gray-100 p-6 space-y-6">
      <header className="bg-white p-6 rounded-lg shadow-sm border flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sistema de Préstamos Presenciales</h1>
          <p className="text-sm text-gray-500">Gestión de créditos empresariales por sede, pago flexible y alertas de riesgo</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Registro y Listado de Empresas */}
        <section className="bg-white p-5 rounded-lg shadow-sm border space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Afiliar Empresa</h2>
          
          <form onSubmit={handleCrearCliente} className="space-y-2 border-b pb-4 text-sm">
            <p className="text-xs font-bold text-gray-500 uppercase">Datos de la Empresa</p>
            <input
              type="text"
              placeholder="Razón Social / Empresa"
              value={razonSocial}
              onChange={(e) => setRazonSocial(e.target.value)}
              className="w-full p-2 border rounded-md"
              required
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="RUC (11 dígitos)"
                maxLength={11}
                value={ruc}
                onChange={(e) => setRuc(e.target.value)}
                className="w-full p-2 border rounded-md"
                required
              />
              <select
                value={sede}
                onChange={(e) => setSede(e.target.value as any)}
                className="w-full p-2 border rounded-md"
              >
                {SEDES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <p className="text-xs font-bold text-gray-500 uppercase pt-2">Datos del Encargado / Representante</p>
            <input
              type="text"
              placeholder="Nombre del Encargado/Dueño"
              value={repNombre}
              onChange={(e) => setRepNombre(e.target.value)}
              className="w-full p-2 border rounded-md"
              required
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="DNI (8 dígitos)"
                maxLength={8}
                value={repDni}
                onChange={(e) => setRepDni(e.target.value)}
                className="w-full p-2 border rounded-md"
                required
              />
              <input
                type="text"
                placeholder="Teléfono"
                value={repTelefono}
                onChange={(e) => setRepTelefono(e.target.value)}
                className="w-full p-2 border rounded-md"
              />
            </div>

            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-md font-medium mt-2">
              + Registar Afiliación
            </button>
          </form>

          <h3 className="text-sm font-bold text-gray-700 pt-2">Empresas Registradas</h3>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {clientes.map((c) => {
              const esSospechoso = c.requiere_reporte_sospechoso;
              const esSeleccionado = clienteSeleccionado?.cliente_id === c.cliente_id;

              return (
                <div
                  key={c.cliente_id}
                  onClick={() => {
                    setClienteSeleccionado(c);
                    cargarCuotasCliente(c.cliente_id);
                  }}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    esSeleccionado ? 'border-blue-500 bg-blue-50' : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-gray-800 text-sm">{c.nombre_o_razon_social}</p>
                      <p className="text-xs text-gray-500">RUC: {c.ruc} | Sede: <strong>{c.sede}</strong></p>
                      <p className="text-xs text-blue-700 font-medium mt-1">Rep: {c.representante_nombre} (DNI: {c.representante_dni})</p>
                    </div>
                    {esSospechoso && (
                      <span className="bg-red-100 text-red-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-red-300">
                        SOSPECHOSO (S/ 10k)
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-xs text-gray-600 flex justify-between border-t pt-2">
                    <span>Prestado: <strong>S/ {parseFloat(c.monto_total_prestado).toFixed(2)}</strong></span>
                    <span>Disponible: <strong>S/ {parseFloat(c.saldo_disponible_prestamo).toFixed(2)}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Detalle y Operaciones de la Empresa Seleccionada */}
        <section className="lg:col-span-2 space-y-6">
          {clienteSeleccionado ? (
            <>
              <div className="bg-white p-5 rounded-lg shadow-sm border flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">{clienteSeleccionado.nombre_o_razon_social}</h2>
                  <p className="text-xs text-gray-600">RUC: {clienteSeleccionado.ruc} | Sede: <span className="font-bold">{clienteSeleccionado.sede}</span></p>
                  <p className="text-xs text-blue-800 font-semibold mt-1">
                    Encargado: {clienteSeleccionado.representante_nombre} (DNI: {clienteSeleccionado.representante_dni} - Tlf: {clienteSeleccionado.representante_telefono || 'N/A'})
                  </p>
                  <p className="text-sm font-semibold text-green-700 mt-1">
                    Límite disponible: S/ {parseFloat(clienteSeleccionado.saldo_disponible_prestamo).toFixed(2)}
                  </p>
                </div>
                <button
                  onClick={() => setVerModalNuevo(!verModalNuevo)}
                  disabled={parseFloat(clienteSeleccionado.saldo_disponible_prestamo) <= 0}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-bold"
                >
                  {verModalNuevo ? 'Cerrar Formulario' : '+ Nuevo Préstamo'}
                </button>
              </div>

              {verModalNuevo && (
                <NuevoPrestamoForm
                  clienteId={clienteSeleccionado.cliente_id}
                  nombreEmpresa={clienteSeleccionado.nombre_o_razon_social}
                  representanteNombre={clienteSeleccionado.representante_nombre}
                  sede={clienteSeleccionado.sede}
                  saldoDisponible={parseFloat(clienteSeleccionado.saldo_disponible_prestamo)}
                  onSuccess={() => {
                    setVerModalNuevo(false);
                    cargarClientes();
                    cargarCuotasCliente(clienteSeleccionado.cliente_id);
                  }}
                />
              )}

              {/* Cronograma de Cuotas */}
              <div className="bg-white p-5 rounded-lg shadow-sm border space-y-4">
                <h3 className="text-md font-bold text-gray-800">Cronograma de Cuotas</h3>
                {cuotas.length === 0 ? (
                  <p className="text-sm text-gray-500">La empresa no tiene cuotas o préstamos activos registrados.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                      <thead className="bg-gray-50 text-xs uppercase text-gray-700">
                        <tr>
                          <th className="p-2">Cuota #</th>
                          <th className="p-2">Vencimiento</th>
                          <th className="p-2">Monto</th>
                          <th className="p-2">Estado</th>
                          <th className="p-2">Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cuotas.map((cuota) => (
                          <tr key={cuota.id} className="border-b">
                            <td className="p-2 font-medium">#{cuota.numero_cuota}</td>
                            <td className="p-2">{cuota.fecha_vencimiento}</td>
                            <td className="p-2 font-semibold">S/ {parseFloat(cuota.monto_cuota).toFixed(2)}</td>
                            <td className="p-2">
                              <span
                                className={`px-2 py-0.5 text-xs rounded-full font-bold ${
                                  cuota.estado === 'Pagado'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-yellow-100 text-yellow-700'
                                }`}
                              >
                                {cuota.estado}
                              </span>
                            </td>
                            <td className="p-2">
                              {cuota.estado !== 'Pagado' && (
                                <button
                                  onClick={() => setCuotaACobrar(cuota)}
                                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded"
                                >
                                  Cobrar Cuota
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white p-12 rounded-lg shadow-sm border text-center text-gray-500">
              Selecciona o registra una empresa para emitir préstamos y realizar cobros.
            </div>
          )}
        </section>
      </div>

      {/* Modal de Cobro */}
      {cuotaACobrar && (
        <CobroSplitModal
          cuotaId={cuotaACobrar.id}
          montoCuota={parseFloat(cuotaACobrar.monto_cuota)}
          numeroCuota={cuotaACobrar.numero_cuota}
          onClose={() => setCuotaACobrar(null)}
          onSuccess={() => {
            setCuotaACobrar(null);
            cargarClientes();
            if (clienteSeleccionado) cargarCuotasCliente(clienteSeleccionado.cliente_id);
          }}
        />
      )}
    </main>
  );
}