import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { ShoppingCart, User as UserIcon, LogIn, LogOut, LayoutDashboard, Home } from 'lucide-react';
import { STORE_CONFIG } from '../config';

export default function Navbar() {
  const { user, profile, login, logout } = useAuth();
  const { totalItems } = useCart();

  return (
    <nav className="bg-primary text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14 items-center">
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-sm font-extrabold uppercase tracking-tighter flex items-center gap-1.5">
              <span className="text-xl">🏠</span> {STORE_CONFIG.name}
            </span>
          </Link>

          <div className="hidden md:flex items-center space-x-4">
            <Link to="/checkout" className="relative p-2 text-white/80 hover:text-white transition-colors">
              <ShoppingCart size={18} />
              {totalItems > 0 && (
                <span className="absolute top-0 right-0 bg-warning text-white text-[8px] font-extrabold px-1 py-0.5 rounded-full ring-2 ring-primary">
                  {totalItems}
                </span>
              )}
            </Link>

            {user ? (
              <div className="flex items-center space-x-2">
                {profile?.role === 'admin' && (
                  <Link to="/admin" className="p-2 text-white/80 hover:text-white transition-colors" title="Admin Dashboard">
                    <LayoutDashboard size={18} />
                  </Link>
                )}
                {(profile?.role === 'admin' || STORE_CONFIG.auth.showCustomerLogin) && (
                  <Link to="/profile" className="p-2 text-white/80 hover:text-white transition-colors" title="Profile">
                    <UserIcon size={18} />
                  </Link>
                )}
                <button
                  onClick={() => logout()}
                  className="p-2 text-white/60 hover:text-warning transition-colors"
                >
                  <LogOut size={18} />
                </button>
              </div>
            ) : STORE_CONFIG.auth.showCustomerLogin ? (
              <button
                onClick={() => login()}
                className="bg-accent text-primary px-3 py-1.5 rounded-md text-xs font-bold hover:bg-white transition-colors"
              >
                Sign In
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </nav>
  );
}
