import GradientButton from './GradientButton';

const navItems = ['生成', '定价', '案例', 'API'];

export default function Navigation() {
  return (
    <nav className="sticky top-0 z-50 nav-blur border-b border-[#DDDDDD] h-16 flex items-center">
      <div className="w-full max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Brand */}
        <div className="font-display text-xl font-bold tracking-tight text-[#131415]">
          ECOMPIC
        </div>

        {/* Nav Links */}
        <div className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <a
              key={item}
              href={`#${item}`}
              className="text-sm font-medium text-[#666C74] hover:text-[#131415] transition-colors duration-200"
            >
              {item}
            </a>
          ))}
        </div>

        {/* CTA */}
        <GradientButton className="h-9 text-xs">
          免费试用
        </GradientButton>
      </div>
    </nav>
  );
}
