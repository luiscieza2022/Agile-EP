'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import NuevoPrestamoForm from '@/components/NuevoPrestamoForm';
import CobroSplitModal from '@/components/CobroSplitModal';
import LoginForm from '@/components/LoginForm';

const SEDES = ['Chimbote', 'Trujillo', 'Chiclayo', 'Tumbes', 'Piura'] as const;

export default function HomePage() {
  const [darkMode, setDarkMode] = useState(false);
  const [cajeroActual, setCajeroActual] = useState<any | null>(null);

  const [clientes, setClientes] = useState<any[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<any | null>(null);
  const [cuotas, setCuotas] = useState<any[]>([]);
  const [cuotaACobrar, setCuotaACobrar] = useState<any | null>(null);
  const [verModalNuevo, setVerModalNuevo] = useState(false);

  // Formulario
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
    if (cajeroActual) {
      cargarClientes();
    }
  }, [cajeroActual]);

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
      },
    ]);

    setRazonSocial('');
    setRuc('');
    setRepNombre('');
    setRepDni('');
    setRepTelefono('');
    cargarClientes();
  };

  const inputStyle = darkMode
    ? 'bg-gray-800 text-white border-gray-600 placeholder-gray-400 focus:bg-gray-700'
    : 'bg-white text-gray-900 border-gray-300 placeholder-gray-500 focus:bg-gray-50';

  // Si no hay cajero autenticado, muestra la pantalla de inicio de sesión
  if (!cajeroActual) {
    return (
      <main className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className="absolute top-4 right-4">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs border transition-all ${
              darkMode ? 'bg-gray-800 text-amber-300 border-gray-700' : 'bg-white text-gray-800 border-gray-300'
            }`}
          >
            {darkMode ? '☀️ Modo Claro' : '🌙 Modo Oscuro'}
          </button>
        </div>
        <LoginForm onLoginSuccess={(cajero) => setCajeroActual(cajero)} darkMode={darkMode} />
      </main>
    );
  }

  return (
    <main
      className={`min-h-screen p-6 space-y-6 transition-colors duration-200 ${
        darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-100 text-gray-900'
      }`}
    >
      {/* Header con Info del Cajero Autenticado */}
      <header
        className={`p-6 rounded-lg shadow-sm border flex justify-between items-center ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}
      >
        <div>
          <h1 className="text-2xl font-bold">Sistema de Préstamos Presenciales</h1>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Cajero en turno: <strong className="text-blue-500">{cajeroActual.nombre_completo}</strong> (DNI: {cajeroActual.dni}) | Sede: <span className="font-bold text-green-500">{cajeroActual.sede}</span>
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`px-3 py-2 rounded-lg font-bold text-xs border transition-all ${
              darkMode
                ? 'bg-gray-700 text-amber-300 border-gray-600 hover:bg-gray-600'
                : 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200'
            }`}
          >
            {darkMode ? '☀️ Claro' : '🌙 Oscuro'}
          </button>
          <button
            onClick={() => setCajeroActual(null)}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg font-bold text-xs transition-colors"
          >
            Cerrar Sesión
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda: Registro y Clientes */}
        <section
          className={`p-5 rounded-lg shadow-sm border space-y-4 ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}
        >
          <h2 className="text-lg font-semibold">Afiliar Empresa</h2>

          <form onSubmit={handleCrearCliente} className="space-y-2 border-b pb-4 text-sm border-gray-500/20">
            <p className="text-xs font-bold text-blue-500 uppercase">Datos de la Empresa</p>
            <input
              type="text"
              placeholder="Razón Social / Empresa"
              value={razonSocial}
              onChange={(e) => setRazonSocial(e.target.value)}
              className={`w-full p-2.5 border rounded-md font-medium ${inputStyle}`}
              required
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="RUC (11 dígitos)"
                maxLength={11}
                value={ruc}
                onChange={(e) => setRuc(e.target.value)}
                className={`w-full p-2.5 border rounded-md font-medium ${inputStyle}`}
                required
              />
              <select
                value={sede}
                onChange={(e) => setSede(e.target.value as any)}
                className={`w-full p-2.5 border rounded-md font-medium ${inputStyle}`}
              >
                {SEDES.map((s) => (
                  <option key={s} value={s} className={darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <p className="text-xs font-bold text-blue-500 uppercase pt-2">Datos del Encargado / Representante</p>
            <input
              type="text"
              placeholder="Nombre del Encargado/Dueño"
              value={repNombre}
              onChange={(e) => setRepNombre(e.target.value)}
              className={`w-full p-2.5 border rounded-md font-medium ${inputStyle}`}
              required
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="DNI (8 dígitos)"
                maxLength={8}
                value={repDni}
                onChange={(e) => setRepDni(e.target.value)}
                className={`w-full p-2.5 border rounded-md font-medium ${inputStyle}`}
                required
              />
              <input
                type="text"
                placeholder="Teléfono"
                value={repTelefono}
                onChange={(e) => setRepTelefono(e.target.value)}
                className={`w-full p-2.5 border rounded-md font-medium ${inputStyle}`}
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-md font-bold mt-2 transition-colors"
            >
              + Registrar Afiliación
            </button>
          </form>

          <h3 className="text-sm font-bold pt-2">Empresas Registradas</h3>
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
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
                    esSeleccionado
                      ? 'border-blue-500 bg-blue-500/10'
                      : darkMode
                      ? 'bg-gray-900/40 hover:bg-gray-700/50 border-gray-700'
                      : 'bg-white hover:bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-sm">{c.nombre_o_razon_social}</p>
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        RUC: {c.ruc} | Sede: <strong>{c.sede}</strong>
                      </p>
                      <p className="text-xs text-blue-500 font-semibold mt-1">
                        Rep: {c.representante_nombre} (DNI: {c.representante_dni})
                      </p>
                    </div>
                    {esSospechoso && (
                      <span className="bg-red-500/20 text-red-400 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-red-500/30">
                        SOSPECHOSO (S/ 10k)
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-xs flex justify-between border-t border-gray-500/20 pt-2">
                    <span>
                      Prestado: <strong>S/ {parseFloat(c.monto_total_prestado).toFixed(2)}</strong>
                    </span>
                    <span>
                      Disponible: <strong>S/ {parseFloat(c.saldo_disponible_prestamo).toFixed(2)}</strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Columna Derecha: Operaciones */}
        <section className="lg:col-span-2 space-y-6">
          {clienteSeleccionado ? (
            <>
              <div
                className={`p-5 rounded-lg shadow-sm border flex justify-between items-center ${
                  darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                }`}
              >
                <div>
                  <h2 className="text-xl font-bold">{clienteSeleccionado.nombre_o_razon_social}</h2>
                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    RUC: {clienteSeleccionado.ruc} | Sede: <span className="font-bold">{clienteSeleccionado.sede}</span>
                  </p>
                  <p className="text-xs text-blue-400 font-semibold mt-1">
                    Encargado: {clienteSeleccionado.representante_nombre} (DNI: {clienteSeleccionado.representante_dni} - Tlf:{' '}
                    {clienteSeleccionado.representante_telefono || 'N/A'})
                  </p>
                  <p className="text-sm font-semibold text-green-500 mt-1">
                    Límite disponible: S/ {parseFloat(clienteSeleccionado.saldo_disponible_prestamo).toFixed(2)}
                  </p>
                </div>
                <button
                  onClick={() => setVerModalNuevo(!verModalNuevo)}
                  disabled={parseFloat(clienteSeleccionado.saldo_disponible_prestamo) <= 0}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-500 text-white px-4 py-2 rounded-md text-sm font-bold transition-colors"
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
                  darkMode={darkMode}
                  onSuccess={() => {
                    setVerModalNuevo(false);
                    cargarClientes();
                    cargarCuotasCliente(clienteSeleccionado.cliente_id);
                  }}
                />
              )}

              {/* Cronograma de Cuotas */}
              <div
                className={`p-5 rounded-lg shadow-sm border space-y-4 ${
                  darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                }`}
              >
                <h3 className="text-md font-bold">Cronograma de Cuotas</h3>
                {cuotas.length === 0 ? (
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    La empresa no tiene cuotas o préstamos activos registrados.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead
                        className={`text-xs uppercase border-b ${
                          darkMode ? 'bg-gray-900/50 text-gray-300 border-gray-700' : 'bg-gray-50 text-gray-700 border-gray-200'
                        }`}
                      >
                        <tr>
                          <th className="p-3">Cuota #</th>
                          <th className="p-3">Vencimiento</th>
                          <th className="p-3">Monto</th>
                          <th className="p-3">Estado</th>
                          <th className="p-3">Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cuotas.map((cuota) => (
                          <tr
                            key={cuota.id}
                            className={`border-b ${
                              darkMode ? 'border-gray-700/50 hover:bg-gray-700/30' : 'border-gray-100 hover:bg-gray-50'
                            }`}
                          >
                            <td className="p-3 font-medium">#{cuota.numero_cuota}</td>
                            <td className="p-3">{cuota.fecha_vencimiento}</td>
                            <td className="p-3 font-semibold">S/ {parseFloat(cuota.monto_cuota).toFixed(2)}</td>
                            <td className="p-3">
                              <span
                                className={`px-2.5 py-1 text-xs rounded-full font-bold ${
                                  cuota.estado === 'Pagado'
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-yellow-500/20 text-yellow-400'
                                }`}
                              >
                                {cuota.estado}
                              </span>
                            </td>
                            <td className="p-3">
                              {cuota.estado !== 'Pagado' && (
                                <button
                                  onClick={() => setCuotaACobrar(cuota)}
                                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded font-semibold transition-colors"
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
            <div
              className={`p-12 rounded-lg shadow-sm border text-center ${
                darkMode ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-white border-gray-200 text-gray-500'
              }`}
            >
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
          darkMode={darkMode}
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