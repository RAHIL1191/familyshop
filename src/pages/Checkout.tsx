import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { Trash2, Minus, Plus, CreditCard, ShoppingBag, MapPin, Truck, Mail, Phone, User as UserIcon } from 'lucide-react';
import { Order } from '../types';
import { sendOrderNotifications } from '../services/notificationService';
import { STORE_CONFIG } from '../config';

export default function Checkout() {
  const { cart, updateQuantity, removeFromCart, totalPrice, clearCart } = useCart();
  const { user, profile } = useAuth();
  
  const [formData, setFormData] = useState({
    customerName: profile?.displayName || '',
    customerEmail: user?.email || '',
    customerPhone: '',
    addressLine: profile?.address || '',
    postcode: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Postcode validation using config
  const validateKentPostcode = (pc: string) => {
    const prefixes = STORE_CONFIG.postcodePrefixes;
    const prefix = pc.trim().toUpperCase().slice(0, 2);
    return prefixes.includes(prefix);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    
    // Minimum order check
    if (totalPrice < STORE_CONFIG.delivery.minimumOrderValue) {
      return setError(`Minimum order value is ${STORE_CONFIG.currency}${STORE_CONFIG.delivery.minimumOrderValue.toFixed(2)}.`);
    }

    const v = STORE_CONFIG.validation;
    
    // Validation based on config
    if (v.nameRequired && !formData.customerName) return setError("Recipient name is required.");
    if (v.emailRequired && !formData.customerEmail) return setError("Email is required for order confirmation.");
    if (v.phoneRequired && !formData.customerPhone) return setError("Phone number is required for delivery contact.");
    if (v.addressRequired && !formData.addressLine) return setError("Delivery address is required.");
    if (v.postcodeRequired && !formData.postcode) return setError("Postcode is required.");
    
    if (v.postcodeRequired && !validateKentPostcode(formData.postcode)) {
      return setError(`We only deliver to Kent County (Postcodes: ${STORE_CONFIG.postcodePrefixes.join(', ')}).`);
    }

    setError(null);
    setLoading(true);

    try {
      const deliveryFee = totalPrice >= STORE_CONFIG.delivery.minOrderForFreeDelivery ? 0 : STORE_CONFIG.delivery.fee;
      
      const orderData: Omit<Order, 'id'> = {
        userId: user?.uid || 'guest',
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        customerPhone: formData.customerPhone,
        items: cart.map(({ stock, ...rest }) => rest),
        status: 'pending',
        totalAmount: totalPrice + deliveryFee,
        createdAt: serverTimestamp(),
        deliveryAddress: `${formData.addressLine}, ${formData.postcode}, Kent`,
      };
      
      const docRef = await addDoc(collection(db, 'orders'), orderData);
      
      // Deduct stock
      const stockUpdates = cart.map(async (item) => {
        const productRef = doc(db, 'products', item.productId);
        try {
          await updateDoc(productRef, {
            stockQuantity: increment(-item.quantity)
          });
        } catch (err) {
          console.error(`Failed to update stock for ${item.productId}:`, err);
        }
      });
      
      await Promise.all(stockUpdates);
      
      // Simulation of email sending
      const finalOrder = { id: docRef.id, ...orderData } as Order;
      await sendOrderNotifications(finalOrder);

      clearCart();
      navigate(`/tracking/${docRef.id}`);
    } catch (err) {
      console.error("Error placing order:", err);
      setError("Failed to place order. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
        <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center text-neutral-400">
          <ShoppingBag size={40} />
        </div>
        <h2 className="text-2xl font-bold">Your cart is empty</h2>
        <p className="text-neutral-500">Pick some essentials from our store and they'll appear here.</p>
        <button onClick={() => navigate('/')} className="text-neutral-900 underline font-medium">Browse Products</button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {/* Basket Review */}
        <div className="density-card !p-0 overflow-hidden">
          <div className="p-4 border-b border-neutral-50 bg-[#F1F3F5]/30 flex justify-between items-center">
            <h2 className="text-sm font-extrabold uppercase tracking-tight text-primary">Your Basket</h2>
            <span className="text-[10px] font-mono text-primary/50">{cart.length} Items</span>
          </div>
          <div className="divide-y divide-neutral-50 max-h-[400px] overflow-y-auto">
            {cart.map((item) => (
              <div key={item.productId} className="p-4 flex items-center gap-4 hover:bg-neutral-50/50 transition-colors">
                <div className="flex-1">
                  <h3 className="text-xs font-bold text-neutral-900">{item.name}</h3>
                  <p className="text-[10px] text-neutral-400 font-mono tracking-tighter">£{item.price.toFixed(2)} / unit</p>
                </div>
                <div className="flex items-center gap-2 bg-[#F1F3F5] px-2 py-0.5 rounded-md border border-border">
                  <button onClick={() => updateQuantity(item.productId, -1)} className="p-0.5 hover:text-primary transition-colors">
                    <Minus size={12} />
                  </button>
                  <span className="w-6 text-center text-[11px] font-bold">{item.quantity}</span>
                  <button 
                    onClick={() => updateQuantity(item.productId, 1)} 
                    disabled={item.stock !== undefined && item.quantity >= item.stock}
                    className="p-0.5 hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Plus size={12} />
                  </button>
                </div>
                <div className="text-right min-w-[70px]">
                  <p className="price-tag text-xs italic">£{(item.price * item.quantity).toFixed(2)}</p>
                </div>
                <button onClick={() => removeFromCart(item.productId)} className="p-1.5 text-neutral-300 hover:text-warning transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="density-card space-y-5">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <Truck size={16} className="text-primary" />
            <p className="density-title">Shipping & Contact</p>
          </div>

          {!user && (
            <div className="p-3 bg-accent/10 border border-accent/20 rounded-md mb-4 group hover:bg-accent/20 transition-all">
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                <ShoppingBag size={10} /> Checking out as Guest
              </p>
              <p className="text-[10px] text-primary/60 mt-1 italic">Sign in to earn rewards and track orders easily.</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 flex-1">
              <label className="text-[10px] font-bold text-neutral-500 uppercase flex items-center gap-1.5">
                <UserIcon size={10} /> Recipient Name <span className="text-warning">*</span>
              </label>
              <input
                name="customerName"
                placeholder="Full Name"
                className="checkout-input"
                value={formData.customerName}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-1.5 flex-1">
              <label className="text-[10px] font-bold text-neutral-500 uppercase flex items-center gap-1.5">
                <Mail size={10} /> Email <span className="text-warning">*</span>
              </label>
              <input
                name="customerEmail"
                type="email"
                placeholder="your@email.com"
                className="checkout-input"
                value={formData.customerEmail}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 flex-1">
              <label className="text-[10px] font-bold text-neutral-500 uppercase flex items-center gap-1.5">
                <Phone size={10} /> Phone {STORE_CONFIG.validation.phoneRequired ? <span className="text-warning">*</span> : '(Optional)'}
              </label>
              <input
                name="customerPhone"
                placeholder="+44 7..."
                className="checkout-input"
                value={formData.customerPhone}
                onChange={handleChange}
                required={STORE_CONFIG.validation.phoneRequired}
              />
            </div>
            <div className="space-y-1.5 flex-1">
              <label className="text-[10px] font-bold text-neutral-500 uppercase flex items-center gap-1.5">
                <MapPin size={10} /> Postcode <span className="text-warning">*</span>
              </label>
              <input
                name="postcode"
                placeholder="e.g. ME14 XXX"
                className="checkout-input"
                value={formData.postcode}
                onChange={handleChange}
                onBlur={() => {
                  if (formData.postcode && !validateKentPostcode(formData.postcode)) {
                    setError("Invalid Kent Postcode. We only serve Kent (BR, CT, DA, ME, TN).");
                  } else {
                    setError(null);
                  }
                }}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5 pt-2">
            <label className="text-[10px] font-bold text-neutral-500 uppercase flex items-center gap-1.5">
              <MapPin size={10} /> Street Address <span className="text-warning">*</span>
            </label>
            <textarea
              name="addressLine"
              placeholder="House number and street name..."
              className="checkout-input h-24 pt-3 leading-relaxed"
              value={formData.addressLine}
              onChange={handleChange}
              onBlur={() => {
                if (!formData.addressLine) {
                  setError("Street address is required.");
                } else if (error === "Street address is required.") {
                  setError(null);
                }
              }}
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-warning/10 border border-warning/20 rounded-md flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
              <div className="w-1.5 h-1.5 bg-warning rounded-full animate-pulse" />
              <p className="text-[10px] text-warning font-bold uppercase tracking-tight">{error}</p>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <div className="density-card space-y-6 sticky top-20 bg-accent/20 border-accent/40 backdrop-blur-sm shadow-xl">
          <p className="density-title !text-primary/70">Order Summary</p>
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-neutral-500 font-medium">
              <span>Subtotal</span>
              <span className="font-mono">{STORE_CONFIG.currency}{totalPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs text-neutral-500 font-medium">
              <span>Delivery</span>
              <span className="font-mono text-success">
                {totalPrice >= STORE_CONFIG.delivery.minOrderForFreeDelivery || STORE_CONFIG.delivery.fee === 0 
                  ? 'FREE' 
                  : `${STORE_CONFIG.currency}${STORE_CONFIG.delivery.fee.toFixed(2)}`}
              </span>
            </div>
            {totalPrice < STORE_CONFIG.delivery.minOrderForFreeDelivery && STORE_CONFIG.delivery.fee > 0 && (
              <p className="text-[9px] text-primary/60 italic text-right">
                Add {STORE_CONFIG.currency}{(STORE_CONFIG.delivery.minOrderForFreeDelivery - totalPrice).toFixed(2)} more for FREE delivery
              </p>
            )}
            <div className="pt-4 border-t border-accent/30 flex justify-between font-extrabold text-primary text-base italic">
              <span>Grand Total</span>
              <span className="font-mono">
                {STORE_CONFIG.currency}{(totalPrice + (totalPrice >= STORE_CONFIG.delivery.minOrderForFreeDelivery ? 0 : STORE_CONFIG.delivery.fee)).toFixed(2)}
              </span>
            </div>
          </div>

          <button
            onClick={handlePlaceOrder}
            disabled={loading}
            className="w-full density-btn-primary py-3 flex items-center justify-center gap-2 group relative overflow-hidden"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Confirming...</span>
              </div>
            ) : (
              <>
                <CreditCard size={16} />
                <span>Submit Order</span>
              </>
            )}
          </button>
          
          <div className="flex items-start gap-2 text-[10px] text-primary/60 italic leading-relaxed bg-white/50 p-3 rounded-md border border-accent/20">
            <ShoppingBag size={12} className="shrink-0 mt-0.5" />
            <p>Direct from {STORE_CONFIG.name}. Live tracking starts immediately after confirmation.</p>
          </div>
        </div>
      </div>

      <style>{`
        .checkout-input {
          @apply w-full px-3 py-2 bg-[#F1F3F5] border border-border rounded-md text-xs font-bold focus:outline-none focus:ring-1 focus:ring-primary transition-all placeholder:text-neutral-300 placeholder:font-normal;
        }
      `}</style>
    </div>
  );
}
