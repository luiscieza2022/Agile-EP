'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import NuevoPrestamoForm from '@/components/NuevoPrestamoForm';
import CobroSplitModal from '@/components/CobroSplitModal';
import LoginForm from '@/components/LoginForm';
import CajaControlModal from '@/components/CajaControlModal';

const SEDES = ['Chimbote', 'Trujillo', 'Chiclayo', 'Tumbes', 'Piura'] as const;

export default function HomePage() {
  const [darkMode, setDarkMode] = useState(true);
  const [cajeroActual, setCajeroActual] = useState<any | null>(null);
  const [cajaActiva, setCajaActiva] = useState<any | null>(null);
  const [tabActiva, setTabActiva] = useState<'empresas' | 'prestamos'>('empresas');

  const [clientes, setClientes] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState<any | null>(null);
  
  const [cuotas, setCuotas] = useState<any[]>([]);
  const [todosLosPrestamos, setTodosLosPrestamos] = useState<any[]>([]);
  
  const [cuotaACobrar, setCuotaACobrar] = useState<any | null>(null);
  const [verModalNuevo, setVerModalNuevo] = useState(false);

  // Formulario de Afiliación con API SUNAT
  const [rucInput, setRucInput] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [sede, setSede] = useState<typeof SEDES[number]>('Trujillo');
  const [repNombre, setRepNombre] = useState('');
  const [repDni, setRepDni] = useState('');
  const [repTelefono, setRepTelefono] = useState('');
  const [consultandoSunat, setConsultandoSunat] = useState(false);

  const cargarClientes = async () => {
    const { data } = await supabase.from('vista_resumen_cliente').select('*');
    if (data) setClientes(data);
  };

  const cargarCajaActiva = async (cajeroId: string) => {
    const { data } = await supabase
      .from('cajas')
      .select('*')
      .eq('cajero_id', cajeroId)
      .eq('estado', 'Abierta')
      .order('fecha_apertura', { ascending: false })
      .maybeSingle();

    setCajaActiva(data || null);
  };

  const cargarHistorialGeneral = async () => {
    const { data } = await supabase
      .from('prestamos')
      .select(`
        *,
        clientes (
          nombre_o_razon_social,
          ruc,
          representante_nombre,
          representante_dni
        ),
        cuotas (*)
      `)
      .order('fecha_desembolso', { ascending: false });

    if (data) setTodosLosPrestamos(data);
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
      cargarCajaActiva(cajeroActual.id);
      cargarClientes();
      cargarHistorialGeneral();
      setSede(cajeroActual.sede);
    }
  }, [cajeroActual]);

  // Consulta automática a la API de SUNAT al ingresar 11 dígitos de RUC
  const consultarSunatApi = async (ruc: string) => {
    if (ruc.length !== 11) return;
    setConsultandoSunat(true);

    try {
      const res = await fetch(`/api/ruc?ruc=${ruc}`);
      if (res.ok) {
        const data = await res.json();
        setRazonSocial(data.razonSocial || '');
        setRepNombre(data.representanteNombre || '');
      }
    } catch (e) {
      console.error('Error al consultar SUNAT', e);
    } finally {
      setConsultandoSunat(false);
    }
  };

  const handleCrearCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!razonSocial || !rucInput || !repNombre || !repDni) return;

    await supabase.from('clientes').insert([
      {
        nombre_o_razon_social: razonSocial,
        documento_identidad: rucInput,
        ruc: rucInput,
        sede,
        representante_nombre: repNombre,
        representante_dni: repDni,
        representante_telefono: repTelefono,
      },
    ]);

    setRazonSocial('');
    setRucInput('');
    setRepNombre('');
    setRepDni('');
    setRepTelefono('');
    cargarClientes();
  };

  const clientesFiltrados = clientes.filter((c) => {
    const q = busqueda.toLowerCase().trim();
    return (
      c.nombre_o_razon_social?.toLowerCase().includes(q) ||
      c.ruc?.toLowerCase().includes(q) ||
      c.representante_nombre?.toLowerCase().includes(q) ||
      c.representante_dni?.toLowerCase().includes(q)
    );
  });

  const totalPrestamosCount = todosLosPrestamos.length;
  const prestamosCompletados = todosLosPrestamos.filter((p) => {
    const cuotasP = p.cuotas || [];
    return cuotasP.length > 0 && cuotasP.every((c: any) => c.estado === 'Pagado');
  }).length;
  const prestamosPendientes = totalPrestamosCount - prestamosCompletados;

  const inputStyle = darkMode
    ? 'bg-gray-800 text-white border-gray-600 placeholder-gray-400 focus:bg-gray-700'
    : 'bg-white text-gray-900 border-gray-300 placeholder-gray-500 focus:bg-gray-50';

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
      {/* Header General */}
      <header
        className={`p-6 rounded-lg shadow-sm border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}
      >
        <div>
          <h1 className="text-2xl font-bold">Sistema de Préstamos Presenciales</h1>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Cajero en turno: <strong className="text-blue-500">{cajeroActual.nombre_completo}</strong> (DNI: {cajeroActual.dni}) | Sede Operativa: <span className="font-bold text-green-500">{cajeroActual.sede}</span>
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

      {/* Módulo de Apertura / Cierre de Caja Obligatorio */}
      <CajaControlModal
        cajeroId={cajeroActual.id}
        sede={cajeroActual.sede}
        cajaActiva={cajaActiva}
        darkMode={darkMode}
        onActualizarCaja={(caja) => setCajaActiva(caja)}
      />

      {/* Menú de Pestañas Superior */}
      <div className="flex border-b border-gray-700 space-x-2">
        <button
          onClick={() => setTabActiva('empresas')}
          className={`px-5 py-3 font-bold text-sm rounded-t-lg transition-all border-t border-x ${
            tabActiva === 'empresas'
              ? darkMode
                ? 'bg-gray-800 border-gray-700 text-blue-400 border-b-2 border-b-blue-500'
                : 'bg-white border-gray-200 text-blue-600 border-b-2 border-b-blue-600'
              : 'text-gray-400 hover:text-gray-200 border-transparent'
          }`}
        >
          🏢 Gestión de Empresas (Cobranza y Préstamos)
        </button>
        <button
          onClick={() => setTabActiva('prestamos')}
          className={`px-5 py-3 font-bold text-sm rounded-t-lg transition-all border-t border-x ${
            tabActiva === 'prestamos'
              ? darkMode
                ? 'bg-gray-800 border-gray-700 text-blue-400 border-b-2 border-b-blue-500'
                : 'bg-white border-gray-200 text-blue-600 border-b-2 border-b-blue-600'
              : 'text-gray-400 hover:text-gray-200 border-transparent'
          }`}
        >
          💳 Historial General Multi-Sede
        </button>
      </div>

      {tabActiva === 'empresas' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section
            className={`p-5 rounded-lg shadow-sm border space-y-4 ${
              darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}
          >
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">Búsqueda / Cobro por DNI o RUC</h2>
              <div className="relative">
                <input
                  type="text"
                  placeholder="🔍 Escribe DNI del Representante, RUC o Empresa..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className={`w-full p-2.5 pl-3 border rounded-lg text-sm font-medium transition-all ${inputStyle}`}
                />
                {busqueda && (
                  <button
                    onClick={() => setBusqueda('')}
                    className="absolute right-3 top-2.5 text-xs text-gray-400 hover:text-gray-200"
                  >
                    ✖
                  </button>
                )}
              </div>
            </div>

            {/* Formulario con Integración SUNAT */}
            <form onSubmit={handleCrearCliente} className="space-y-2 border-t pt-3 border-b pb-4 text-sm border-gray-500/20">
              <p className="text-xs font-bold text-blue-500 uppercase flex justify-between">
                <span>Afiliar Empresa SUNAT</span>
                {consultandoSunat && <span className="animate-pulse text-amber-400">Consultando SUNAT...</span>}
              </p>
              
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="RUC (11 dígitos)"
                  maxLength={11}
                  value={rucInput}
                  onChange={(e) => {
                    const v = e.target.value;
                    setRucInput(v);
                    if (v.length === 11) consultarSunatApi(v);
                  }}
                  className={`w-full p-2 border rounded-md font-bold ${inputStyle}`}
                  required
                />
                <select
                  value={sede}
                  onChange={(e) => setSede(e.target.value as any)}
                  className={`w-full p-2 border rounded-md font-medium ${inputStyle}`}
                >
                  {SEDES.map((s) => (
                    <option key={s} value={s} className={darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}>
                      Sede {s}
                    </option>
                  ))}
                </select>
              </div>

              <input
                type="text"
                placeholder="Razón Social (Autocompletado SUNAT)"
                value={razonSocial}
                onChange={(e) => setRazonSocial(e.target.value)}
                className={`w-full p-2 border rounded-md font-medium ${inputStyle}`}
                required
              />

              <input
                type="text"
                placeholder="Representante Legal Oficial"
                value={repNombre}
                onChange={(e) => setRepNombre(e.target.value)}
                className={`w-full p-2 border rounded-md font-medium ${inputStyle}`}
                required
              />

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="DNI Rep. (8 dígitos)"
                  maxLength={8}
                  value={repDni}
                  onChange={(e) => setRepDni(e.target.value)}
                  className={`w-full p-2 border rounded-md font-medium ${inputStyle}`}
                  required
                />
                <input
                  type="text"
                  placeholder="Teléfono"
                  value={repTelefono}
                  onChange={(e) => setRepTelefono(e.target.value)}
                  className={`w-full p-2 border rounded-md font-medium ${inputStyle}`}
                />
              </div>

              <button
                type="submit"
                disabled={!cajaActiva}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 text-white p-2 rounded-md font-bold mt-1 transition-colors"
              >
                + Registrar Afiliación
              </button>
            </form>

            {/* Lista Filtrada para Cobro Multi-Sede */}
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {clientesFiltrados.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">No se encontraron registros coincidentes.</p>
              ) : (
                clientesFiltrados.map((c) => {
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
                            RUC: {c.ruc} | Sede Origen: <strong>{c.sede}</strong>
                          </p>
                          <p className="text-xs text-blue-400 font-semibold mt-1">
                            Rep: {c.representante_nombre} (DNI: {c.representante_dni})
                          </p>
                        </div>
                        {esSospechoso && (
                          <span className="bg-red-500/20 text-red-400 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-red-500/30">
                            SOSPECHOSO (S/ 10k)
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section className="lg:col-span-2 space-y-6">
            {clienteSeleccionado ? (
              <>
                <div
                  className={`p-6 rounded-lg shadow-sm border space-y-4 ${
                    darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-4 border-gray-500/20 gap-3">
                    <div>
                      <span className="bg-blue-600/20 text-blue-400 text-xs font-bold px-2.5 py-1 rounded-md uppercase">
                        Sede Registrada: {clienteSeleccionado.sede}
                      </span>
                      <h2 className="text-2xl font-bold mt-1">{clienteSeleccionado.nombre_o_razon_social}</h2>
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        RUC: <strong className="text-gray-200">{clienteSeleccionado.ruc}</strong>
                      </p>
                    </div>

                    <button
                      onClick={() => setVerModalNuevo(!verModalNuevo)}
                      disabled={!cajaActiva || parseFloat(clienteSeleccionado.saldo_disponible_prestamo) <= 0}
                      className="bg-green-600 hover:bg-green-700 disabled:bg-gray-500 text-white px-4 py-2 rounded-md text-sm font-bold transition-colors"
                    >
                      {verModalNuevo ? 'Cerrar Formulario' : '+ Nuevo Préstamo'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className={`p-3 rounded-lg border ${darkMode ? 'bg-gray-900/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                      <p className="text-xs font-bold text-blue-400 uppercase mb-1">👤 Representante Legal (Habilitado para Cobro Multi-Sede)</p>
                      <p><strong>Nombre:</strong> {clienteSeleccionado.representante_nombre}</p>
                      <p><strong>DNI:</strong> {clienteSeleccionado.representante_dni}</p>
                      <p><strong>Teléfono:</strong> {clienteSeleccionado.representante_telefono || 'No registrado'}</p>
                    </div>

                    <div className={`p-3 rounded-lg border ${darkMode ? 'bg-gray-900/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                      <p className="text-xs font-bold text-green-400 uppercase mb-1">📊 Estado Crediticio Consolidado</p>
                      <p><strong>Monto Prestado Total:</strong> S/ {parseFloat(clienteSeleccionado.monto_total_prestado).toFixed(2)}</p>
                      <p><strong>Límite Disponible:</strong> <span className="text-green-400 font-bold">S/ {parseFloat(clienteSeleccionado.saldo_disponible_prestamo).toFixed(2)}</span> / S/ 10,000</p>
                    </div>
                  </div>
                </div>

                {verModalNuevo && cajaActiva && (
                  <NuevoPrestamoForm
                    clienteId={clienteSeleccionado.cliente_id}
                    nombreEmpresa={clienteSeleccionado.nombre_o_razon_social}
                    representanteNombre={clienteSeleccionado.representante_nombre}
                    sede={cajeroActual.sede}
                    saldoDisponible={parseFloat(clienteSeleccionado.saldo_disponible_prestamo)}
                    cajaId={cajaActiva.id}
                    darkMode={darkMode}
                    onSuccess={() => {
                      setVerModalNuevo(false);
                      cargarClientes();
                      cargarHistorialGeneral();
                      cargarCuotasCliente(clienteSeleccionado.cliente_id);
                    }}
                  />
                )}

                <div
                  className={`p-5 rounded-lg shadow-sm border space-y-4 ${
                    darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                  }`}
                >
                  <h3 className="text-md font-bold">Cronograma de Cuotas de la Empresa</h3>
                  {cuotas.length === 0 ? (
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      La empresa no tiene cuotas activas.
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
                            <th className="p-3">Vencimiento (30 Días)</th>
                            <th className="p-3">Monto</th>
                            <th className="p-3">Estado</th>
                            <th className="p-3">Acción (Sede {cajeroActual.sede})</th>
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
                                    disabled={!cajaActiva}
                                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 text-white text-xs px-3 py-1.5 rounded font-semibold transition-colors"
                                  >
                                    Cobrar en Sede {cajeroActual.sede}
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
                Busca o selecciona un cliente para gestionar préstamos y cobros presenciales.
              </div>
            )}
          </section>
        </div>
      )}

      {tabActiva === 'prestamos' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-5 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <p className="text-xs font-bold text-gray-400 uppercase">Total Préstamos Emitidos</p>
              <p className="text-3xl font-extrabold text-blue-500 mt-1">{totalPrestamosCount}</p>
            </div>
            <div className={`p-5 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <p className="text-xs font-bold text-gray-400 uppercase">Préstamos Pendientes / Activos</p>
              <p className="text-3xl font-extrabold text-amber-400 mt-1">{prestamosPendientes}</p>
            </div>
            <div className={`p-5 rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <p className="text-xs font-bold text-gray-400 uppercase">Préstamos Completados</p>
              <p className="text-3xl font-extrabold text-green-400 mt-1">{prestamosCompletados}</p>
            </div>
          </div>

          <div
            className={`p-5 rounded-lg shadow-sm border space-y-4 ${
              darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}
          >
            <h2 className="text-lg font-bold">Historial Consolidado de Préstamos</h2>
            
            {todosLosPrestamos.length === 0 ? (
              <p className="text-sm text-gray-400">No hay registros de préstamos en el sistema.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead
                    className={`text-xs uppercase border-b ${
                      darkMode ? 'bg-gray-900/50 text-gray-300 border-gray-700' : 'bg-gray-50 text-gray-700 border-gray-200'
                    }`}
                  >
                    <tr>
                      <th className="p-3">Empresa / RUC</th>
                      <th className="p-3">Representante Legal</th>
                      <th className="p-3">Sede Origen</th>
                      <th className="p-3">Monto Base</th>
                      <th className="p-3">Total c/Interés</th>
                      <th className="p-3">Plazo</th>
                      <th className="p-3">Pagado / Total</th>
                      <th className="p-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todosLosPrestamos.map((p) => {
                      const cuotasP = p.cuotas || [];
                      const cuotasPagadas = cuotasP.filter((c: any) => c.estado === 'Pagado').length;
                      const esCompletado = cuotasP.length > 0 && cuotasPagadas === cuotasP.length;

                      return (
                        <tr
                          key={p.id}
                          className={`border-b ${
                            darkMode ? 'border-gray-700/50 hover:bg-gray-700/30' : 'border-gray-100 hover:bg-gray-50'
                          }`}
                        >
                          <td className="p-3 font-bold">
                            {p.clientes?.nombre_o_razon_social}
                            <div className="text-xs font-normal text-gray-400">RUC: {p.clientes?.ruc}</div>
                          </td>
                          <td className="p-3">
                            {p.clientes?.representante_nombre}
                            <div className="text-xs text-gray-400">DNI: {p.clientes?.representante_dni}</div>
                          </td>
                          <td className="p-3">
                            <span className="font-semibold text-blue-400">{p.sede}</span>
                          </td>
                          <td className="p-3 font-medium">S/ {parseFloat(p.monto_monto_base).toFixed(2)}</td>
                          <td className="p-3 font-semibold">S/ {parseFloat(p.monto_total_con_interes).toFixed(2)}</td>
                          <td className="p-3">{p.plazo_meses} meses</td>
                          <td className="p-3 font-medium">
                            {cuotasPagadas} / {p.plazo_meses} cuotas
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2.5 py-1 text-xs rounded-full font-bold ${
                                esCompletado
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-amber-500/20 text-amber-400'
                              }`}
                            >
                              {esCompletado ? 'Completado' : 'Pendiente'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

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
            cargarHistorialGeneral();
            if (clienteSeleccionado) cargarCuotasCliente(clienteSeleccionado.cliente_id);
          }}
        />
      )}
    </main>
  );
}