import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Order, OrderStatus } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Package, Truck, CheckCircle2, Clock, MapPin, ChevronLeft } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

const STATUS_CONFIG: Record<OrderStatus, { label: string; icon: any; color: string; description: string }> = {
  'pending': { label: 'Order Received', icon: Clock, color: 'text-neutral-400', description: 'The store is confirming your order.' },
  'processing': { label: 'Preparing', icon: Package, color: 'text-amber-500', description: 'We are packing your items with care.' },
  'out-for-delivery': { label: 'On its way', icon: Truck, color: 'text-blue-500', description: 'The rider is heading to your location.' },
  'delivered': { label: 'Delivered', icon: CheckCircle2, color: 'text-green-500', description: 'Enjoy your fresh finds!' },
  'cancelled': { label: 'Cancelled', icon: CheckCircle2, color: 'text-red-500', description: 'This order was cancelled.' }
};

const STEPS: OrderStatus[] = ['pending', 'processing', 'out-for-delivery', 'delivered'];

export default function Tracking() {
  const { orderId } = useParams();
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;
    const unsubscribe = onSnapshot(doc(db, 'orders', orderId), (doc) => {
      if (doc.exists()) {
        setOrder({ id: doc.id, ...doc.data() } as Order);
      }
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.GET, `orders/${orderId}`));
    return unsubscribe;
  }, [orderId]);

  if (loading) return <div className="py-20 text-center text-neutral-500">Retrieving tracking details...</div>;
  if (!order) return <div className="py-20 text-center text-neutral-500">Order not found.</div>;

  const currentStatus = order.status;
  const currentIndex = STEPS.indexOf(currentStatus as any);

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {user ? (
        <Link to="/profile" className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:text-primary transition-colors">
          <ChevronLeft size={12} />
          <span>Back to Order History</span>
        </Link>
      ) : (
        <Link to="/" className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:text-primary transition-colors">
          <ChevronLeft size={12} />
          <span>Back to Store</span>
        </Link>
      )}

      <div className="density-card space-y-6">
        <div className="flex justify-between items-start border-b border-neutral-50 pb-4">
          <div className="space-y-0.5">
            <h1 className="text-lg font-extrabold tracking-tight text-primary uppercase">Order #{order.id.slice(-6).toUpperCase()}</h1>
            <p className="text-[10px] text-neutral-400 font-medium uppercase tracking-tighter">Placed • {order.createdAt?.toDate().toLocaleString()}</p>
          </div>
          <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${STATUS_CONFIG[currentStatus].color} bg-bg border border-border`}>
            {STATUS_CONFIG[currentStatus].label}
          </div>
        </div>

        <div className="flex justify-between relative py-6">
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-neutral-100 -translate-y-1/2" />
          <motion.div 
            className="absolute top-1/2 left-0 h-0.5 bg-primary -translate-y-1/2"
            initial={{ width: 0 }}
            animate={{ width: `${(Math.max(0, currentIndex) / (STEPS.length - 1)) * 100}%` }}
          />
          
          {STEPS.map((step, idx) => {
            const Icon = STATUS_CONFIG[step].icon;
            const isCompleted = idx <= currentIndex;
            const isCurrent = idx === currentIndex;
            return (
              <div key={step} className="relative z-10 flex flex-col items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${
                  isCompleted ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 'bg-white border-border text-neutral-100'
                } ${isCurrent ? 'ring-4 ring-primary/10 scale-110' : ''}`}>
                  <Icon size={14} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-[#F1F3F5] rounded-lg p-4 text-center border border-border/50">
          <h2 className="text-xs font-bold text-primary mb-1">{STATUS_CONFIG[currentStatus].label}</h2>
          <p className="text-[10px] text-neutral-500 font-medium leading-relaxed italic">{STATUS_CONFIG[currentStatus].description}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div className="space-y-2">
            <p className="density-title">Delivery Detail</p>
            <div className="flex gap-2">
              <MapPin size={12} className="text-primary shrink-0 mt-0.5" />
              <p className="text-[11px] text-neutral-600 leading-relaxed font-medium">{order.deliveryAddress}</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="density-title">Articles Summary</p>
            <div className="space-y-1.5">
              {order.items.map((item) => (
                <div key={item.productId} className="flex justify-between text-[11px]">
                  <span className="text-neutral-500">
                    <span className="font-bold text-primary mr-2">{item.quantity}x</span>
                    {item.name}
                  </span>
                  <span className="font-mono italic">£{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              
              <div className="pt-2 border-t border-neutral-50 space-y-1">
                {(() => {
                  const subtotal = order.items.reduce((acc, i) => acc + (i.price * i.quantity), 0);
                  const fee = order.totalAmount - subtotal;
                  return (
                    <>
                      <div className="flex justify-between text-[10px] text-neutral-400 font-medium italic">
                        <span>Items Subtotal</span>
                        <span className="font-mono">£{subtotal.toFixed(2)}</span>
                      </div>
                      {fee > 0 && (
                        <div className="flex justify-between text-[10px] text-neutral-400 font-medium italic">
                          <span>Delivery Fee</span>
                          <span className="font-mono">£{fee.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-extrabold text-xs italic text-primary pt-1">
                        <span>Total Paid</span>
                        <span className="font-mono">£{order.totalAmount.toFixed(2)}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
