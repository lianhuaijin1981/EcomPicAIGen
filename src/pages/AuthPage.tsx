/**
 * 登录/注册表单页面
 * 路由: /auth
 */
import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { trpc } from '@/providers/trpc';
import GradientButton from '@/components/GradientButton';
import { Mail, Lock, User, AlertTriangle, Eye, EyeOff } from 'lucide-react';

type AuthMode = 'login' | 'register';

interface FormErrors {
  email?: string;
  password?: string;
  nickname?: string;
  general?: string;
}

export default function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      navigate('/');
    },
    onError: (err) => {
      setErrors({ general: err.message });
    },
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      // 注册成功后自动登录
      setMode('login');
      setErrors({ general: '注册成功，请登录' });
      setPassword('');
    },
    onError: (err) => {
      setErrors({ general: err.message });
    },
  });

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!email) {
      newErrors.email = '请输入邮箱';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = '请输入有效的邮箱地址';
    }
    if (!password) {
      newErrors.password = '请输入密码';
    } else if (mode === 'register' && password.length < 8) {
      newErrors.password = '密码至少 8 位';
    }
    if (mode === 'register' && !nickname) {
      newErrors.nickname = '请输入昵称';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setErrors({});

    if (mode === 'login') {
      loginMutation.mutate({ email, password });
    } else {
      registerMutation.mutate({ email, password, nickname });
    }
  };

  const isPending = loginMutation.isPending || registerMutation.isPending;

  return (
    <div className="min-h-screen bg-[#F3F4F2] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <span className="text-2xl font-bold text-[#131415] font-display">ECOMPIC</span>
          </Link>
          <p className="text-sm text-[#666C74] mt-2">
            {mode === 'login' ? '登录账号，开始生成' : '创建账号，获取 50 积分'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl border border-[#DDDDDD] p-8 shadow-sm">
          {/* Tab Switch */}
          <div className="flex border-b border-[#DDDDDD] mb-6">
            {(['login', 'register'] as AuthMode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setErrors({}); }}
                className={`flex-1 pb-3 text-sm font-medium transition-colors border-b-2 ${
                  mode === m
                    ? 'border-[#FF003C] text-[#FF003C]'
                    : 'border-transparent text-[#666C74] hover:text-[#131415]'
                }`}
              >
                {m === 'login' ? '登录' : '注册'}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Nickname (register only) */}
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-[#131415] mb-1.5">
                  昵称 <span className="text-[#FF003C]">*</span>
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666C74]" />
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="给自己起个名字"
                    className="w-full pl-10 pr-4 py-2.5 border border-[#DDDDDD] rounded-lg text-sm text-[#131415] placeholder-[#999] focus:outline-none focus:border-[#FF003C] focus:ring-1 focus:ring-[#FF003C]/20"
                  />
                </div>
                {errors.nickname && (
                  <p className="mt-1 text-xs text-[#ef4444]">{errors.nickname}</p>
                )}
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-[#131415] mb-1.5">
                邮箱 <span className="text-[#FF003C]">*</span>
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666C74]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-2.5 border border-[#DDDDDD] rounded-lg text-sm text-[#131415] placeholder-[#999] focus:outline-none focus:border-[#FF003C] focus:ring-1 focus:ring-[#FF003C]/20"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-[#ef4444]">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-[#131415] mb-1.5">
                密码 <span className="text-[#FF003C]">*</span>
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666C74]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? '至少 8 位' : '输入密码'}
                  className="w-full pl-10 pr-10 py-2.5 border border-[#DDDDDD] rounded-lg text-sm text-[#131415] placeholder-[#999] focus:outline-none focus:border-[#FF003C] focus:ring-1 focus:ring-[#FF003C]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666C74] hover:text-[#131415]"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-[#ef4444]">{errors.password}</p>
              )}
            </div>

            {/* General Error */}
            {errors.general && (
              <div className="flex items-center gap-2 p-3 bg-[#fef2f2] border border-[#ef4444]/20 rounded-lg">
                <AlertTriangle size={14} className="text-[#ef4444] flex-shrink-0" />
                <p className="text-sm text-[#dc2626]">{errors.general}</p>
              </div>
            )}

            {/* Submit */}
            <GradientButton type="submit" className="w-full justify-center" disabled={isPending}>
              {isPending ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {mode === 'login' ? '登录中...' : '注册中...'}
                </span>
              ) : (
                mode === 'login' ? '登录' : '注册'
              )}
            </GradientButton>
          </form>

          {/* Switch Mode */}
          <p className="mt-4 text-center text-sm text-[#666C74]">
            {mode === 'login' ? (
              <>
                还没有账号？
                <button
                  onClick={() => { setMode('register'); setErrors({}); }}
                  className="ml-1 text-[#FF003C] hover:underline font-medium"
                >
                  立即注册
                </button>
              </>
            ) : (
              <>
                已有账号？
                <button
                  onClick={() => { setMode('login'); setErrors({}); }}
                  className="ml-1 text-[#FF003C] hover:underline font-medium"
                >
                  去登录
                </button>
              </>
            )}
          </p>
        </div>

        {/* Back to Home */}
        <p className="mt-4 text-center text-sm text-[#666C74]">
          <Link to="/" className="hover:text-[#131415] transition-colors">
            ← 返回首页
          </Link>
        </p>
      </div>
    </div>
  );
}
