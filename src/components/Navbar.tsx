import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Layers,
  LogIn,
  LogOut,
  Percent,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Store,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useStoreUi } from '../context/StoreUiContext';

const ANNOUNCEMENTS = [
  'PRECIOS REGULADOS POR COMPETENCIA LEAL',
  'INVENTARIO EN TIEMPO REAL DE MULTIPLES TALLERES',
  'COMPARA Y ELIGE LA MEJOR OPCION DISPONIBLE',
  'TALLERES VERIFICADOS EN UNA SOLA PLATAFORMA',
];

export function Navbar() {
  const { user, logout } = useAuth();
  const { searchTerm, setSearchTerm, setSelectedCategory, setCartOpen, cartCount } = useStoreUi();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  function linkClass(path: string) {
    const active = location.pathname === path;
    return `inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider transition ${
      active
        ? 'bg-zinc-950 text-white'
        : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950'
    }`;
  }

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    if (location.pathname !== '/') {
      navigate('/');
    }
    setTimeout(() => {
      document.getElementById('productos')?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  }

  return (
    <div className="sticky top-0 z-40">
      <div className="overflow-hidden bg-zinc-950 py-2 text-[11px] font-semibold tracking-[0.2em] text-zinc-100">
        <div className="animate-marquee gap-12">
          {[...ANNOUNCEMENTS, ...ANNOUNCEMENTS].map((text, idx) => (
            <span key={idx} className="whitespace-nowrap px-6">
              {text}
            </span>
          ))}
        </div>
      </div>

      <header className="border-b border-zinc-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-6">
            <Link
              to="/"
              onClick={() => {
                setSelectedCategory('Todas');
                setSearchTerm('');
              }}
              className="text-xl font-black uppercase tracking-tighter text-zinc-950"
            >
              ECOPANTA<span className="font-light text-zinc-400">STORE</span>
            </Link>

            <nav className="hidden items-center gap-1 lg:flex">
              <Link to="/" className={linkClass('/')}>
                <ShoppingBag className="h-3.5 w-3.5" />
                Tienda
              </Link>
              <Link to="/categorias" className={linkClass('/categorias')}>
                <Layers className="h-3.5 w-3.5" />
                Categorias
              </Link>
              <Link to="/ofertas" className={linkClass('/ofertas')}>
                <Percent className="h-3.5 w-3.5" />
                Ofertas
              </Link>
              {(user?.role === 'taller' || user?.role === 'admin') && (
                <Link to="/taller" className={linkClass('/taller')}>
                  <Store className="h-3.5 w-3.5" />
                  Panel Taller
                </Link>
              )}
              {user?.role === 'admin' && (
                <Link to="/admin" className={linkClass('/admin')}>
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Admin
                </Link>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {searchOpen ? (
              <form onSubmit={handleSearchSubmit} className="relative flex items-center">
                <input
                  type="text"
                  autoFocus
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar producto..."
                  className="w-40 rounded-full border border-zinc-300 bg-zinc-50 py-1.5 pr-8 pl-4 text-xs outline-none focus:border-zinc-950 sm:w-64"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setSearchOpen(false);
                  }}
                  className="absolute right-2.5 text-zinc-400 hover:text-zinc-900"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </form>
            ) : (
              <button
                onClick={() => setSearchOpen(true)}
                aria-label="Buscar"
                className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-950"
              >
                <Search className="h-4 w-4" />
              </button>
            )}

            <button
              onClick={() => setCartOpen(true)}
              aria-label="Carrito"
              className="relative flex h-9 w-9 items-center justify-center rounded-full text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-950"
            >
              <ShoppingCart className="h-4 w-4" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-zinc-950 px-1 text-[10px] font-bold text-white">
                  {cartCount}
                </span>
              )}
            </button>

            {user ? (
              <>
                <div className="hidden text-right sm:block">
                  <p className="text-xs font-semibold text-zinc-900">{user.displayName}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                    {user.role}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-800 transition hover:border-zinc-950 hover:bg-zinc-950 hover:text-white"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Salir
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-full bg-zinc-950 px-5 py-2 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-zinc-800"
              >
                <LogIn className="h-3.5 w-3.5" />
                Iniciar sesion
              </Link>
            )}
          </div>
        </div>

        <nav className="flex items-center gap-1.5 overflow-x-auto border-t border-zinc-100 px-4 py-2 lg:hidden">
          <Link to="/" className={linkClass('/')}>
            <ShoppingBag className="h-3.5 w-3.5" />
            Tienda
          </Link>
          <Link to="/categorias" className={linkClass('/categorias')}>
            <Layers className="h-3.5 w-3.5" />
            Categorias
          </Link>
          <Link to="/ofertas" className={linkClass('/ofertas')}>
            <Percent className="h-3.5 w-3.5" />
            Ofertas
          </Link>
          {(user?.role === 'taller' || user?.role === 'admin') && (
            <Link to="/taller" className={linkClass('/taller')}>
              <Store className="h-3.5 w-3.5" />
              Panel Taller
            </Link>
          )}
          {user?.role === 'admin' && (
            <Link to="/admin" className={linkClass('/admin')}>
              <ShieldCheck className="h-3.5 w-3.5" />
              Admin
            </Link>
          )}
        </nav>
      </header>
    </div>
  );
}