import { Link, useLocation } from 'react-router-dom';
import { Home, ShoppingBag, User as UserIcon, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { STORE_CONFIG } from '../config';

export default function MobileNav() {
  const location = useLocation();
  const { user, isAdmin } = useAuth();
  const { totalItems } = useCart();

  if (!STORE_CONFIG.mobileFirst) return null;

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border z-50 mobile-safe-bottom">
      <div className="flex justify-around items-center h-16">
        <Link to="/" className={`tab-bar-item ${isActive('/') ? 'active' : ''}`}>
          <div className="mobile-touch-target">
            <Home size={20} />
          </div>
          <span>Shop</span>
        </Link>
        
        <Link to="/checkout" className={`tab-bar-item relative ${isActive('/checkout') ? 'active' : ''}`}>
          <div className="mobile-touch-target">
            <ShoppingBag size={20} />
            {totalItems > 0 && (
              <span className="absolute top-2 right-2 bg-warning text-white text-[8px] font-black px-1 py-0.5 rounded-full ring-2 ring-white">
                {totalItems}
              </span>
            )}
          </div>
          <span>Cart</span>
        </Link>

        <Link to="/profile" className={`tab-bar-item ${isActive('/profile') ? 'active' : ''}`}>
          <div className="mobile-touch-target">
            <UserIcon size={20} />
          </div>
          <span>Account</span>
        </Link>

        {isAdmin && (
          <Link to="/admin" className={`tab-bar-item ${isActive('/admin') ? 'active' : ''}`}>
            <div className="mobile-touch-target">
              <LayoutDashboard size={20} />
            </div>
            <span>Admin</span>
          </Link>
        )}
      </div>
    </div>
  );
}
