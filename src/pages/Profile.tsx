import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { Order } from '../types';
import { Link } from 'react-router-dom';
import { ChevronRight, Package, Clock, LogOut, LogIn, ShoppingBag, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { STORE_CONFIG } from '../config';

export default function Profile() {
  const { user, profile, login, logout, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, 'orders'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
      setLoading(false);
    });
    return unsubscribe;
  }, [user]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-12 px-4 space-y-8 text-center">
        <div className="w-20 h-20 bg-accent/20 rounded-full flex items-center justify-center mx-auto text-primary">
          <ShoppingBag size={40} />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black uppercase tracking-tight italic">
            {STORE_CONFIG.auth.showCustomerLogin ? 'Welcome to Family Store' : 'Administrator Portal'}
          </h1>
          <p className="text-xs text-neutral-500 font-medium leading-relaxed italic">
            {STORE_CONFIG.auth.showCustomerLogin 
              ? 'Sign in to track your orders, save delivery addresses, and unlock exclusive rewards.'
              : 'Sign in to access the store management dashboard. Customer guest checkout is enabled.'}
          </p>
        </div>
        <button
          onClick={login}
          className="w-full density-btn-primary py-4 flex items-center justify-center gap-3 shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <LogIn size={20} />
          <span className="uppercase font-black italic tracking-widest text-sm">Sign In with Google</span>
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <header className="relative overflow-hidden p-6 bg-white border border-border shadow-2xl rounded-xl group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700" />
        
        <div className="relative flex flex-col sm:flex-row items-center sm:items-end justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
            <div className="w-20 h-20 bg-primary text-white rounded-2xl flex items-center justify-center text-3xl font-black uppercase shadow-2xl rotate-3 group-hover:rotate-0 transition-transform duration-500 border-4 border-white">
              {profile?.displayName?.[0] || user?.email?.[0]?.toUpperCase()}
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-black tracking-tight text-primary uppercase italic flex items-center gap-2">
                {profile?.displayName || 'Valued Customer'}
                {profile?.role === 'admin' && <ShieldCheck size={18} className="text-success" />}
              </h1>
              <p className="text-[10px] text-neutral-400 font-mono font-bold tracking-widest uppercase">{user?.email}</p>
              <div className="flex gap-2 pt-1 font-black text-[8px] uppercase tracking-[0.2em]">
                <span className={`px-2 py-1 rounded-md border ${profile?.role === 'admin' ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-bg border-border text-neutral-400'}`}>
                  {profile?.role === 'admin' ? 'ADMINISTRATOR' : 'MEMBER'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => logout()}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:border-warning hover:text-warning transition-all shadow-sm"
          >
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </header>

      <section className="space-y-6">
        <div className="flex items-center gap-2 px-1">
          <Package size={14} className="text-primary" />
          <h2 className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Order History log</h2>
        </div>
        
        {loading ? (
          <div className="flex flex-col items-center gap-2 py-12">
            <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-[9px] font-bold text-neutral-300 uppercase tracking-widest">Updating data...</p>
          </div>
        ) : orders.length > 0 ? (
          <div className="grid gap-3">
            {orders.map((order) => (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                key={order.id}
              >
                <Link
                  to={`/tracking/${order.id}`}
                  className="group block p-4 bg-white border border-border rounded-xl hover:border-primary transition-all hover:shadow-xl relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-1 bg-bg border-bl rounded-bl-lg">
                     <ChevronRight size={12} className="text-neutral-300 group-hover:text-primary transition-colors" />
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-bg rounded-lg flex items-center justify-center text-neutral-400 group-hover:bg-primary group-hover:text-white transition-all shadow-inner border border-neutral-100">
                      <Package size={20} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <div>
                          <h3 className="text-[11px] font-black text-neutral-900 group-hover:text-primary transition-colors truncate uppercase italic tracking-tighter">ORDER #{order.id.slice(-6).toUpperCase()}</h3>
                          <div className="flex items-center gap-2 text-[9px] text-neutral-400 font-bold uppercase tracking-widest">
                            <Clock size={10} />
                            {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString() : 'Pending'}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${
                            order.status === 'delivered' ? 'bg-success/5 border-success/20 text-success' : 
                            order.status === 'pending' ? 'bg-warning/5 border-warning/20 text-warning' :
                            'bg-accent/5 border-accent/20 text-primary'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-neutral-50">
                        <span className="text-[9px] font-bold text-neutral-300 uppercase italic">ITEMS: {order.items.reduce((acc, i) => acc + i.quantity, 0)}</span>
                        <span className="font-mono text-primary font-black text-xs italic">£{order.totalAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white border-2 border-dashed border-border rounded-2xl flex flex-col items-center gap-4 group hover:border-primary/50 transition-colors">
            <div className="w-12 h-12 bg-neutral-50 rounded-full flex items-center justify-center text-neutral-200 group-hover:text-primary transition-colors">
              <Package size={24} />
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-black text-neutral-400 uppercase tracking-widest">Your shelf is empty</p>
              <p className="text-[9px] text-neutral-300 italic">Historical data will appear here after your first purchase.</p>
            </div>
            <Link to="/" className="text-[10px] font-black text-primary uppercase tracking-[0.2em] underline underline-offset-4 hover:text-secondary transition-colors">Start Shopping</Link>
          </div>
        )}
      </section>
    </div>
  );
}
