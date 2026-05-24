import React, { useState } from 'react';
import { ActivitySquare, Lock, Mail, ArrowRight, UserPlus } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'customer'>('admin');
  const [customerName, setCustomerName] = useState('');
  const [error, setError] = useState('');
  const login = useAuthStore(state => state.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      if (isLogin) {
        const form = new URLSearchParams();
        form.append('username', email);
        form.append('password', password);

        const res = await fetch('http://localhost:8000/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: form
        });

        if (!res.ok) throw new Error('Invalid credentials');
        
        const data = await res.json();
        
        // Fetch user profile to get role and customer_name
        const profileRes = await fetch('http://localhost:8000/users/me', {
            headers: { 'Authorization': `Bearer ${data.access_token}` }
        });
        if (!profileRes.ok) throw new Error('Failed to load profile');
        const profileData = await profileRes.json();
        
        login(data.access_token, { 
            email: profileData.email, 
            username: profileData.email.split('@')[0], 
            role: profileData.role,
            customer_name: profileData.customer_name
        });
        
        window.location.href = profileData.role === 'customer' ? '/client/tracker' : '/admin/dashboard';
      } else {
        const payload = {
            email,
            password,
            username: email.split('@')[0],
            role,
            ...(role === 'customer' && { customer_name: customerName })
        };
        const res = await fetch('http://localhost:8000/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.detail || 'Registration failed');
        }
        
        const data = await res.json();
        login(data.access_token, { 
            email, 
            username: email.split('@')[0], 
            role,
            customer_name: role === 'customer' ? customerName : undefined
        });
        
        window.location.href = role === 'customer' ? '/client/tracker' : '/admin/dashboard';
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background ambient light */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[150px] pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="flex justify-center text-indigo-500 mb-6">
          <ActivitySquare className="w-12 h-12" />
        </div>
        <h2 className="text-center text-3xl font-bold tracking-tight text-white">
          PulseSync
        </h2>
        <p className="mt-2 text-center text-sm text-gray-400">
          Sign in or create an account for the Enterprise Event Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="bg-gray-900/60 backdrop-blur-xl py-8 px-4 shadow-2xl border border-gray-800 sm:rounded-2xl sm:px-10">
          
          <div className="flex bg-gray-950 p-1 rounded-lg mb-6 border border-gray-800">
            <button 
              className={`flex-1 text-sm font-medium py-2 rounded-md transition-colors ${isLogin ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'text-gray-400 hover:text-gray-200'}`}
              onClick={() => { setIsLogin(true); setError(''); }}
            >
              Sign In
            </button>
            <button 
              className={`flex-1 text-sm font-medium py-2 rounded-md transition-colors ${!isLogin ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'text-gray-400 hover:text-gray-200'}`}
              onClick={() => { setIsLogin(false); setError(''); }}
            >
              Register
            </button>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400 text-center">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-300">Email address</label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="block w-full pl-10 bg-gray-950 border border-gray-800 rounded-lg py-2.5 text-gray-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
                  placeholder="user@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300">Password</label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="block w-full pl-10 bg-gray-950 border border-gray-800 rounded-lg py-2.5 text-gray-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {!isLogin && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300">Role</label>
                  <div className="mt-1 flex space-x-4">
                    <label className="flex items-center text-gray-300">
                      <input type="radio" value="admin" checked={role === 'admin'} onChange={() => setRole('admin')} className="mr-2 text-indigo-500 bg-gray-950 border-gray-800 focus:ring-indigo-500" />
                      Admin
                    </label>
                    <label className="flex items-center text-gray-300">
                      <input type="radio" value="customer" checked={role === 'customer'} onChange={() => setRole('customer')} className="mr-2 text-indigo-500 bg-gray-950 border-gray-800 focus:ring-indigo-500" />
                      Customer
                    </label>
                  </div>
                </div>

                {role === 'customer' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300">Customer Full Name (for Order Tracking)</label>
                    <div className="mt-1 relative">
                      <input
                        type="text"
                        required
                        value={customerName}
                        onChange={e => setCustomerName(e.target.value)}
                        className="block w-full px-3 bg-gray-950 border border-gray-800 rounded-lg py-2.5 text-gray-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
                        placeholder="e.g. Alice Smith"
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            {isLogin && (
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input type="checkbox" className="h-4 w-4 rounded border-gray-800 bg-gray-950 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-gray-900" />
                  <label className="ml-2 block text-sm text-gray-400">Remember me</label>
                </div>
                <div className="text-sm">
                  <a href="#" className="font-medium text-indigo-400 hover:text-indigo-300">Forgot password?</a>
                </div>
              </div>
            )}

            <button
              type="submit"
              className={`w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white transition-all ${isLogin ? 'bg-indigo-600 hover:bg-indigo-500 focus:ring-indigo-500' : 'bg-emerald-600 hover:bg-emerald-500 focus:ring-emerald-500'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900`}
            >
              {isLogin ? (
                <>Sign in <ArrowRight className="w-4 h-4" /></>
              ) : (
                <>Create Account <UserPlus className="w-4 h-4" /></>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
