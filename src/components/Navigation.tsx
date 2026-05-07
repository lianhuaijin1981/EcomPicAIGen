import { useState } from 'react';
import { Link } from 'react-router';
import { trpc } from '@/providers/trpc';
import GradientButton from './GradientButton';

export default function Navigation() {
  const [menuOpen, setMenuOpen] = useState(false);

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    enabled: false,
  });
  const user = meQuery.data;

  return (
    <nav className="sticky top-0 z-50 nav-blur border-b border-[#DDDDDD] h-16 flex items-center">
      <div className="w-full max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="font-display text-xl font-bold tracking-tight text-[#131415]">
          ECOMPIC
        </Link>

        {/* Nav Links */}
        <div className="hidden md:flex items-center gap-8">
          {[
            { label: '生成', href: '/#generator' },
            { label: '定价', href: '/#pricing' },
            { label: '案例', href: '/#gallery' },
            { label: '算法管理', href: '/algorithms' },
          ].map((item) => (
            <Link
              key={item.label}
              to={item.href}
              className="text-sm font-medium text-[#666C74] hover:text-[#131415] transition-colors duration-200"
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                to="/history"
                className="text-sm text-[#666C74] hover:text-[#131415] transition-colors"
              >
                我的任务
              </Link>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#E7E9E6] rounded-full">
                <div className="w-6 h-6 rounded-full bg-[#FF003C]/10 flex items-center justify-center">
                  <span className="text-xs font-bold text-[#FF003C]">
                    {(user.nickname || user.email || 'U')[0].toUpperCase()}
                  </span>
                </div>
                <span className="text-xs text-[#131415]">{user.credits} 积分</span>
              </div>
            </>
          ) : (
            <>
              <Link
                to="/auth"
                className="text-sm text-[#666C74] hover:text-[#131415] transition-colors"
              >
                登录
              </Link>
              <GradientButton
                onClick={() => window.location.href = '/auth'}
                className="h-9 text-xs"
              >
                免费试用
              </GradientButton>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
