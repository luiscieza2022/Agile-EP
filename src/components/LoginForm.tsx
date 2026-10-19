'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Props {
  onLoginSuccess: (cajero: any) => void;
  darkMode: boolean;
}

export default function LoginForm({ onLoginSuccess, darkMode }: Props) {
  const [dni, setDni] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data: cajero, error: dbError } = await supabase
      .from('cajeros')
      .select('*')
      .eq('dni', dni.trim())
      .single();

    setLoading(false);

    if (dbError || !cajero) {
      setError('DNI no registrado o contraseña incorrecta.');
      return;
    }

    if (cajero.password !== password) {
      setError('Contraseña incorrecta.');
      return;
    }

    onLoginSuccess(cajero);
  };

  const inputStyle = darkMode
    ? 'bg-gray-700 text-white border-gray-600 placeholder-gray-400 focus:bg-gray-600'
    : 'bg-white text-gray-900 border-gray-300 placeholder-gray-500 focus:bg-gray-50';

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div
        className={`max-w-md w-full p-8 rounded-xl shadow-xl border space-y-6 ${
          darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'
        }`}
      >
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-full bg-blue-600/10 text-blue-600 text-3xl font-bold">
            🏦
          </div>
          <h2 className="text-2xl font-bold">Acceso para Cajeros</h2>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Ingresa tu DNI y contraseña para iniciar sesión
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border-l-4 border-red-500 p-3 text-red-500 text-sm rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className={`block text-xs font-bold uppercase mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              DNI del Cajero
            </label>
            <input
              type="text"
              maxLength={8}
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              placeholder="Ej: 72345678"
              className={`w-full p-3 border rounded-lg font-medium text-base ${inputStyle}`}
              required
            />
          </div>

          <div>
            <label className={`block text-xs font-bold uppercase mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={`w-full p-3 border rounded-lg font-medium text-base ${inputStyle}`}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-md disabled:bg-gray-500"
          >
            {loading ? 'Verificando...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className={`p-3 rounded-lg text-xs space-y-1 ${darkMode ? 'bg-gray-900/50 text-gray-400' : 'bg-gray-50 text-gray-600'}`}>
          <p>Si olvidaste tu contraseña, contacta al administrador del sistema.</p>
          <p>Recuerda que tu DNI es único y no debe compartirse con nadie.</p>
        </div>
      </div>
    </div>
  );
}