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
  const [seccionActiva, setSeccionActiva] = useState<'inicio' | 'nuevo-prestamo' | 'clientes' | 'caja'>('inicio');

  const [clientes, setClientes] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState<any | null>(null);
  
  const [cuotas, setCuotas] = useState<any[]>([]);
  const [todosLosPrestamos, setTodosLosPrestamos] = useState<any[]>([]);
  
  const [cuotaACobrar, setCuotaACobrar] = useState<any | null>(null);

  // Formulario con API SUNAT
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

    const { data: nuevoCliente } = await supabase
      .from('clientes')
      .insert([
        {
          nombre_o_razon_social: razonSocial,
          documento_identidad: rucInput,
          ruc: rucInput,
          sede,
          representante_nombre: repNombre,
          representante_dni: repDni,
          representante_telefono: repTelefono,
        },
      ])
      .select()
      .single();

    setRazonSocial('');
    setRucInput('');
    setRepNombre('');
    setRepDni('');
    setRepTelefono('');
    await cargarClientes();

    if (nuevoCliente) {
      setClienteSeleccionado({
        ...nuevoCliente,
        cliente_id: nuevoCliente.id,
        monto_total_prestado: 0,
        saldo_disponible_prestamo: 10000,
      });
      setSeccionActiva('nuevo-prestamo');
    }
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

  const fechaHoy = new Date().toLocaleDateString('es-PE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-100 text-gray-900'}`}>
      {/* BARRA SUPERIOR GENERAL */}
      <header
        className={`px-8 py-4 border-b flex flex-wrap justify-between items-center gap-4 ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}
      >
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 text-white p-2 rounded-xl font-bold text-lg">🏦</div>
          <div>
            <h2 className="font-extrabold text-base leading-tight">Sistema de Créditos</h2>
            <p className="text-xs text-gray-400 capitalize">{fechaHoy}</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-right hidden sm:block">
            <span className="bg-blue-600/20 text-blue-400 px-3 py-1 rounded-full border border-blue-500/30 text-xs font-bold mr-2">
              Asesor {cajeroActual.sede}
            </span>
            <span className="text-sm font-semibold">{cajeroActual.nombre_completo}</span>
          </div>

          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs border transition-all ${
              darkMode ? 'bg-gray-700 text-amber-300 border-gray-600 hover:bg-gray-600' : 'bg-gray-200 text-gray-800 border-gray-300'
            }`}
          >
            {darkMode ? '☀️ Claro' : '🌙 Oscuro'}
          </button>

          <button
            onClick={() => setCajeroActual(null)}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg font-bold text-xs transition-colors"
          >
            Cerrar Sesión
          </button>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL CENTRADO */}
      <main className="max-w-7xl w-full mx-auto p-6 md:p-8 space-y-6 flex-1">
        {/* NAVEGACIÓN SUPERIOR ENTRE VISTAS */}
        <div className="flex border-b border-gray-700 space-x-2">
          <button
            onClick={() => setSeccionActiva('inicio')}
            className={`px-5 py-3 font-bold text-sm rounded-t-lg transition-all border-t border-x ${
              seccionActiva === 'inicio'
                ? darkMode
                  ? 'bg-gray-800 border-gray-700 text-blue-400 border-b-2 border-b-blue-500'
                  : 'bg-white border-gray-200 text-blue-600 border-b-2 border-b-blue-600'
                : 'text-gray-400 hover:text-gray-200 border-transparent'
            }`}
          >
            🏠 Inicio
          </button>
          <button
            onClick={() => setSeccionActiva('nuevo-prestamo')}
            className={`px-5 py-3 font-bold text-sm rounded-t-lg transition-all border-t border-x ${
              seccionActiva === 'nuevo-prestamo'
                ? darkMode
                  ? 'bg-gray-800 border-gray-700 text-blue-400 border-b-2 border-b-blue-500'
                  : 'bg-white border-gray-200 text-blue-600 border-b-2 border-b-blue-600'
                : 'text-gray-400 hover:text-gray-200 border-transparent'
            }`}
          >
            ➕ Nuevo Préstamo
          </button>
          <button
            onClick={() => setSeccionActiva('clientes')}
            className={`px-5 py-3 font-bold text-sm rounded-t-lg transition-all border-t border-x ${
              seccionActiva === 'clientes'
                ? darkMode
                  ? 'bg-gray-800 border-gray-700 text-blue-400 border-b-2 border-b-blue-500'
                  : 'bg-white border-gray-200 text-blue-600 border-b-2 border-b-blue-600'
                : 'text-gray-400 hover:text-gray-200 border-transparent'
            }`}
          >
            🏢 Historial y Clientes
          </button>
          <button
            onClick={() => setSeccionActiva('caja')}
            className={`px-5 py-3 font-bold text-sm rounded-t-lg transition-all border-t border-x ${
              seccionActiva === 'caja'
                ? darkMode
                  ? 'bg-gray-800 border-gray-700 text-blue-400 border-b-2 border-b-blue-500'
                  : 'bg-white border-gray-200 text-blue-600 border-b-2 border-b-blue-600'
                : 'text-gray-400 hover:text-gray-200 border-transparent'
            }`}
          >
            💳 Control de Caja
          </button>
        </div>

        {/* SECCIÓN 1: INICIO */}
        {seccionActiva === 'inicio' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold">Hola, Asesor {cajeroActual.sede}</h1>
              <p className="text-sm text-gray-400 mt-1">Panel operativo de préstamos presenciales y control de caja.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div
                className={`p-6 rounded-xl border flex flex-col justify-between space-y-4 ${
                  darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-400 uppercase">Caja de Hoy</span>
                  <span
                    className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
                      cajaActiva ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {cajaActiva ? 'Abierta' : 'Cerrada'}
                  </span>
                </div>

                <div>
                  <p className="text-3xl font-extrabold text-blue-500">
                    S/ {cajaActiva ? parseFloat(cajaActiva.monto_apertura).toFixed(2) : '0.00'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {cajaActiva ? 'Monto aperturado en la sede' : 'Apertura caja para operar'}
                  </p>
                </div>

                <button
                  onClick={() => setSeccionActiva('caja')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg text-xs transition-colors"
                >
                  Gestionar Caja
                </button>
              </div>

              <div
                onClick={() => setSeccionActiva('nuevo-prestamo')}
                className={`p-6 rounded-xl border cursor-pointer hover:border-blue-500 transition-all flex flex-col justify-between space-y-4 ${
                  darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                }`}
              >
                <div className="text-2xl">➕</div>
                <div>
                  <h3 className="font-bold text-base">Nuevo Préstamo</h3>
                  <p className="text-xs text-gray-400 mt-1">Evalúa empresas, valida RUC en SUNAT y desembolsa.</p>
                </div>
                <span className="text-xs font-bold text-blue-400">Iniciar evaluación →</span>
              </div>

              <div
                onClick={() => setSeccionActiva('clientes')}
                className={`p-6 rounded-xl border cursor-pointer hover:border-blue-500 transition-all flex flex-col justify-between space-y-4 ${
                  darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                }`}
              >
                <div className="text-2xl">🏢</div>
                <div>
                  <h3 className="font-bold text-base">Historial y Clientes</h3>
                  <p className="text-xs text-gray-400 mt-1">Busca por RUC o DNI para cobros presenciales multi-sede.</p>
                </div>
                <span className="text-xs font-bold text-blue-400">Ver cartera completa →</span>
              </div>
            </div>

            <div
              className={`p-6 rounded-xl border space-y-4 ${
                darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}
            >
              <h3 className="font-bold text-base">Préstamos Recientes en la Sede</h3>

              {todosLosPrestamos.length === 0 ? (
                <p className="text-sm text-gray-400">No hay registros de préstamos recientes.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead
                      className={`text-xs uppercase border-b ${
                        darkMode ? 'bg-gray-900/50 text-gray-300 border-gray-700' : 'bg-gray-50 text-gray-700 border-gray-200'
                      }`}
                    >
                      <tr>
                        <th className="p-3">Fecha</th>
                        <th className="p-3">Sede</th>
                        <th className="p-3">Empresa / Cliente</th>
                        <th className="p-3">Representante DNI</th>
                        <th className="p-3">Monto Base</th>
                        <th className="p-3">Plazo</th>
                        <th className="p-3">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {todosLosPrestamos.slice(0, 5).map((p) => (
                        <tr
                          key={p.id}
                          className={`border-b ${
                            darkMode ? 'border-gray-700/50 hover:bg-gray-700/30' : 'border-gray-100 hover:bg-gray-50'
                          }`}
                        >
                          <td className="p-3">{new Date(p.fecha_desembolso).toLocaleDateString('es-PE')}</td>
                          <td className="p-3 font-semibold text-blue-400">{p.sede}</td>
                          <td className="p-3 font-bold">{p.clientes?.nombre_o_razon_social}</td>
                          <td className="p-3">{p.clientes?.representante_nombre} ({p.clientes?.representante_dni})</td>
                          <td className="p-3 font-semibold">S/ {parseFloat(p.monto_monto_base).toFixed(2)}</td>
                          <td className="p-3">{p.plazo_meses} meses</td>
                          <td className="p-3">
                            <button
                              onClick={() => {
                                setClienteSeleccionado(p.clientes);
                                cargarCuotasCliente(p.cliente_id);
                                setSeccionActiva('clientes');
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded font-semibold transition-colors"
                            >
                              Ver cronograma
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SECCIÓN 2: NUEVO PRÉSTAMO */}
        {seccionActiva === 'nuevo-prestamo' && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold">Nuevo Préstamo</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div
                className={`lg:col-span-2 p-6 rounded-xl border space-y-4 ${
                  darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                }`}
              >
                <h2 className="text-lg font-bold">1. Registrar y Validar Empresa con SUNAT</h2>

                <form onSubmit={handleCrearCliente} className="space-y-3 text-sm">
                  <div>
                    <label className="block text-xs font-bold uppercase mb-1">RUC de la Empresa (11 dígitos)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Ej: 20601234567"
                        maxLength={11}
                        value={rucInput}
                        onChange={(e) => {
                          const v = e.target.value;
                          setRucInput(v);
                          if (v.length === 11) consultarSunatApi(v);
                        }}
                        className={`flex-1 p-2.5 border rounded-lg font-bold ${inputStyle}`}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => consultarSunatApi(rucInput)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 rounded-lg text-xs"
                      >
                        {consultandoSunat ? 'Consultando...' : 'Validar SUNAT'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase mb-1">Razón Social (Oficial SUNAT)</label>
                    <input
                      type="text"
                      value={razonSocial}
                      onChange={(e) => setRazonSocial(e.target.value)}
                      placeholder="Razón social devuelta por la API"
                      className={`w-full p-2.5 border rounded-lg font-medium ${inputStyle}`}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase mb-1">Representante Legal Oficial</label>
                    <input
                      type="text"
                      value={repNombre}
                      onChange={(e) => setRepNombre(e.target.value)}
                      placeholder="Nombre completo del representante legal"
                      className={`w-full p-2.5 border rounded-lg font-medium ${inputStyle}`}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase mb-1">DNI del Representante</label>
                      <input
                        type="text"
                        maxLength={8}
                        value={repDni}
                        onChange={(e) => setRepDni(e.target.value)}
                        placeholder="DNI 8 dígitos"
                        className={`w-full p-2.5 border rounded-lg font-medium ${inputStyle}`}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase mb-1">Teléfono</label>
                      <input
                        type="text"
                        value={repTelefono}
                        onChange={(e) => setRepTelefono(e.target.value)}
                        placeholder="Teléfono contacto"
                        className={`w-full p-2.5 border rounded-lg font-medium ${inputStyle}`}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={!cajaActiva || !razonSocial}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 text-white font-bold py-3 rounded-lg text-sm transition-colors mt-2"
                  >
                    Continuar a Evaluación de Crédito →
                  </button>
                </form>
              </div>

              <div className="space-y-4">
                {clienteSeleccionado ? (
                  <NuevoPrestamoForm
                    clienteId={clienteSeleccionado.cliente_id || clienteSeleccionado.id}
                    nombreEmpresa={clienteSeleccionado.nombre_o_razon_social}
                    representanteNombre={clienteSeleccionado.representante_nombre}
                    sede={cajeroActual.sede}
                    saldoDisponible={parseFloat(clienteSeleccionado.saldo_disponible_prestamo || 10000)}
                    cajaId={cajaActiva?.id}
                    darkMode={darkMode}
                    onSuccess={() => {
                      cargarClientes();
                      cargarHistorialGeneral();
                      setSeccionActiva('clientes');
                    }}
                  />
                ) : (
                  <div
                    className={`p-6 rounded-xl border text-center space-y-2 ${
                      darkMode ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-white border-gray-200 text-gray-500'
                    }`}
                  >
                    <p className="font-bold text-sm">Paso 2. Condiciones del préstamo</p>
                    <p className="text-xs">Digita el RUC y valida primero el cliente para desbloquear las opciones de monto y plazo.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SECCIÓN 3: HISTORIAL Y CLIENTES */}
        {seccionActiva === 'clientes' && (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold">Clientes (Todas las Sedes)</h1>

            <div
              className={`p-5 rounded-xl border space-y-4 ${
                darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="🔍 Buscar cliente por RUC, Empresa o DNI del Representante..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className={`flex-1 p-2.5 border rounded-lg text-sm font-medium ${inputStyle}`}
                />
                {busqueda && (
                  <button
                    onClick={() => setBusqueda('')}
                    className="bg-gray-700 text-gray-300 px-4 py-2 rounded-lg text-xs font-bold"
                  >
                    Limpiar
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead
                    className={`text-xs uppercase border-b ${
                      darkMode ? 'bg-gray-900/50 text-gray-300 border-gray-700' : 'bg-gray-50 text-gray-700 border-gray-200'
                    }`}
                  >
                    <tr>
                      <th className="p-3">Cliente / Empresa</th>
                      <th className="p-3">Representante Legal</th>
                      <th className="p-3">Sede Origen</th>
                      <th className="p-3">Prestado</th>
                      <th className="p-3">Disponible</th>
                      <th className="p-3">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientesFiltrados.map((c) => (
                      <tr
                        key={c.cliente_id}
                        className={`border-b ${
                          darkMode ? 'border-gray-700/50 hover:bg-gray-700/30' : 'border-gray-100 hover:bg-gray-50'
                        }`}
                      >
                        <td className="p-3 font-bold">
                          {c.nombre_o_razon_social}
                          <div className="text-xs font-normal text-gray-400">RUC: {c.ruc}</div>
                        </td>
                        <td className="p-3">
                          {c.representante_nombre}
                          <div className="text-xs text-gray-400">DNI: {c.representante_dni}</div>
                        </td>
                        <td className="p-3 font-semibold text-blue-400">{c.sede}</td>
                        <td className="p-3 font-semibold">S/ {parseFloat(c.monto_total_prestado).toFixed(2)}</td>
                        <td className="p-3 font-semibold text-green-400">
                          S/ {parseFloat(c.saldo_disponible_prestamo).toFixed(2)}
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => {
                              setClienteSeleccionado(c);
                              cargarCuotasCliente(c.cliente_id);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded font-semibold transition-colors"
                          >
                            Ver Historial / Cobrar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {clienteSeleccionado && (
              <div
                className={`p-6 rounded-xl border space-y-4 ${
                  darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex justify-between items-center border-b pb-3 border-gray-500/20">
                  <div>
                    <h3 className="text-xl font-bold">{clienteSeleccionado.nombre_o_razon_social}</h3>
                    <p className="text-xs text-gray-400">
                      Representante: <strong>{clienteSeleccionado.representante_nombre}</strong> (DNI: {clienteSeleccionado.representante_dni})
                    </p>
                  </div>
                  <span className="bg-green-500/20 text-green-400 font-bold text-xs px-3 py-1 rounded-full border border-green-500/30">
                    Disp: S/ {parseFloat(clienteSeleccionado.saldo_disponible_prestamo).toFixed(2)}
                  </span>
                </div>

                <h4 className="font-bold text-sm">Cronograma de Cuotas</h4>
                {cuotas.length === 0 ? (
                  <p className="text-sm text-gray-400">El cliente no tiene cuotas registradas.</p>
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
                          <th className="p-3">Cobro Multi-Sede</th>
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
            )}
          </div>
        )}

        {/* SECCIÓN 4: CONTROL DE CAJA */}
        {seccionActiva === 'caja' && (
          <div className="space-y-6 max-w-2xl">
            <h1 className="text-2xl font-bold">Control de Caja Presencial</h1>
            <CajaControlModal
              cajeroId={cajeroActual.id}
              sede={cajeroActual.sede}
              cajaActiva={cajaActiva}
              darkMode={darkMode}
              onActualizarCaja={(caja) => setCajaActiva(caja)}
            />
          </div>
        )}
      </main>

      {/* MODAL PAGO SPLIT */}
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
    </div>
  );
}