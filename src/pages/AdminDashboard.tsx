import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { Product, Order, OrderStatus } from '../types';
import { LayoutGrid, Package, Plus, Trash2, Edit3, Save, X, Check, Truck, AlertCircle, User as UserIcon, Mail, Phone, MapPin, ShieldAlert, ShoppingBag, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { STORE_CONFIG } from '../config';

export default function AdminDashboard() {
  const { user, profile, isAdmin: isUserAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'inventory' | 'orders'>('inventory');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Product>>({});
  
  const [newProduct, setNewProduct] = useState<Partial<Product>>({ 
    name: '', category: 'Groceries', price: 0, originalPrice: 0, stockQuantity: 0, description: '', imageUrl: '' 
  });
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (!isUserAdmin) return;

    const qProducts = query(collection(db, 'products'), orderBy('category'));
    const unsubProducts = onSnapshot(qProducts, (sn) => {
      setProducts(sn.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'products'));

    const qOrders = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubOrders = onSnapshot(qOrders, (sn) => {
      setOrders(sn.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'orders'));

    return () => { unsubProducts(); unsubOrders(); };
  }, [isUserAdmin]);

  const handleUpdateProduct = async () => {
    if (!editingId) return;
    try {
      await updateDoc(doc(db, 'products', editingId), editForm);
      setEditingId(null);
      setEditForm({});
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `products/${editingId}`);
    }
  };

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.price) return;
    try {
      await addDoc(collection(db, 'products'), newProduct);
      setShowAddForm(false);
      setNewProduct({ name: '', category: 'Groceries', price: 0, originalPrice: 0, stockQuantity: 0, description: '', imageUrl: '' });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'products');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'products', id));
      setDeleteConfirmId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `products/${id}`);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: newStatus });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `orders/${orderId}`);
    }
  };

  const lowStockItems = products.filter(p => p.stockQuantity < 5);

  if (!isUserAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center text-warning">
          <ShieldAlert size={32} />
        </div>
        <h2 className="text-xl font-bold text-neutral-900 uppercase tracking-tight">Admin Only Area</h2>
        <p className="text-xs text-neutral-500 max-w-xs italic">
          You do not have permission to access the manager portal. Please login with an admin account.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-primary">Manager Portal</h1>
          <p className="text-xs text-neutral-500">{STORE_CONFIG.location} • Control Deck</p>
        </div>
        <div className="flex bg-[#F1F3F5] p-1 rounded-md">
          <button 
            onClick={() => setActiveTab('inventory')}
            className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${activeTab === 'inventory' ? 'bg-white shadow-sm text-primary' : 'text-neutral-500 hover:text-neutral-700'}`}
          >
            Inventory
          </button>
          <button 
            onClick={() => setActiveTab('orders')}
            className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${activeTab === 'orders' ? 'bg-white shadow-sm text-primary' : 'text-neutral-500 hover:text-neutral-700'}`}
          >
            Store Orders
          </button>
        </div>
      </header>

      {/* Critical Alerts */}
      <AnimatePresence>
        {lowStockItems.length > 0 && activeTab === 'inventory' && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 bg-warning/10 border border-warning/20 rounded-lg flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-warning/20 flex items-center justify-center text-warning">
                <AlertCircle size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-warning uppercase tracking-widest leading-none">Low Stock Warning</p>
                <p className="text-[10px] text-warning/70 mt-1 italic">{lowStockItems.length} products have less than 5 units left.</p>
              </div>
            </div>
            <div className="flex -space-x-2">
              {lowStockItems.slice(0, 5).map(p => (
                <div key={p.id} className="w-6 h-6 rounded-full border-2 border-white bg-neutral-100 flex items-center justify-center text-[8px] font-bold overflow-hidden" title={p.name}>
                  {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover" /> : p.name[0]}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {activeTab === 'inventory' ? (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest">{products.length} Products in Catalog</p>
            <button 
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-primary text-white px-4 py-2 rounded-md flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              {showAddForm ? <X size={14} /> : <Plus size={14} />}
              <span>{showAddForm ? 'Cancel' : 'Add New Item'}</span>
            </button>
          </div>

          <AnimatePresence>
            {showAddForm && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="density-card bg-accent/10 border-accent/20"
              >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-neutral-400 uppercase">Product Name</label>
                    <input type="text" placeholder="e.g. Fresh Milk" className="admin-input w-full" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-neutral-400 uppercase">Category</label>
                    <input 
                      list="reference-categories"
                      placeholder="e.g. Snacks"
                      className="admin-input w-full" 
                      value={newProduct.category} 
                      onChange={e => setNewProduct({...newProduct, category: e.target.value})} 
                    />
                    <datalist id="reference-categories">
                      {STORE_CONFIG.referenceCategories.map(c => <option key={c} value={c} />)}
                    </datalist>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-neutral-400 uppercase">Sale Price</label>
                    <input type="number" step="0.01" className="admin-input w-full" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-neutral-400 uppercase">Stock Count</label>
                    <input type="number" className="admin-input w-full" value={newProduct.stockQuantity} onChange={e => setNewProduct({...newProduct, stockQuantity: Number(e.target.value)})} />
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[9px] font-bold text-warning uppercase">Discount Price (Original Price before Sale)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      placeholder="e.g. 1.50"
                      className="admin-input w-full font-mono text-warning ring-1 ring-warning/20" 
                      value={newProduct.originalPrice} 
                      onChange={e => setNewProduct({...newProduct, originalPrice: Number(e.target.value)})} 
                    />
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[9px] font-bold text-neutral-400 uppercase">Image URL (Picsum ID or full URL)</label>
                    <input type="text" className="admin-input w-full" value={newProduct.imageUrl} onChange={e => setNewProduct({...newProduct, imageUrl: e.target.value})} />
                  </div>
                  <div className="md:col-span-4 flex justify-end gap-2 pt-2 border-t border-accent/20">
                    <button onClick={handleAddProduct} className="density-btn-primary !py-2 !px-8">Publish Item</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="bg-white border border-border rounded-lg overflow-x-auto shadow-xl custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-[#F1F3F5]/50 border-b border-border">
                  <th className="density-table-th">Product</th>
                  <th className="density-table-th">Cat.</th>
                  <th className="density-table-th text-right tabular-nums">Pricing (Sale/Orig)</th>
                  <th className="density-table-th text-center">Stock</th>
                  <th className="density-table-th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {products.map(p => {
                  const isEditing = editingId === p.id;
                  const isDeleting = deleteConfirmId === p.id;

                  return (
                    <tr key={p.id} className={`group hover:bg-neutral-50 transition-colors ${isEditing ? 'bg-primary/5' : ''}`}>
                      <td className="density-table-td">
                        <div className="flex items-center gap-3">
                          <img src={p.imageUrl || `https://picsum.photos/seed/${p.name}/100/100`} className="w-8 h-8 rounded bg-neutral-100 object-cover" />
                          {isEditing ? (
                            <div className="flex flex-col gap-1 w-full">
                              <label className="text-[8px] font-bold text-neutral-400 uppercase">Product Name</label>
                              <input 
                                className="admin-input !bg-white !py-1 w-full" 
                                value={editForm.name ?? p.name} 
                                onChange={e => setEditForm({...editForm, name: e.target.value})} 
                              />
                            </div>
                          ) : (
                            <div className="flex flex-col">
                              <span className="font-bold text-neutral-900 text-[11px] leading-tight">{p.name}</span>
                              <span className="text-[10px] text-neutral-400 italic">ID: {p.id.slice(-4)}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="density-table-td">
                        {isEditing ? (
                          <div className="flex flex-col gap-1">
                            <label className="text-[8px] font-bold text-neutral-400 uppercase">Category</label>
                            <input 
                              list="reference-categories"
                              className="admin-input !bg-white !py-1 w-full" 
                              value={editForm.category ?? p.category}
                              onChange={e => setEditForm({...editForm, category: e.target.value})}
                            />
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 bg-neutral-100 rounded text-[9px] font-bold text-neutral-500">{p.category}</span>
                        )}
                      </td>
                      <td className="density-table-td text-right">
                        {isEditing ? (
                          <div className="flex flex-col gap-1 items-end">
                            <div className="flex flex-col items-end">
                              <label className="text-[8px] font-bold text-neutral-400 uppercase">Sale Price</label>
                              <input 
                                type="number" step="0.01" 
                                className="admin-input !bg-white !py-1 w-20 text-right font-mono" 
                                value={editForm.price ?? p.price}
                                onChange={e => setEditForm({...editForm, price: Number(e.target.value)})}
                              />
                            </div>
                            <div className="flex flex-col items-end">
                              <label className="text-[8px] font-bold text-warning uppercase">Orig. Price</label>
                              <input 
                                type="number" step="0.01" 
                                className="admin-input !bg-white !py-1 w-20 text-right text-warning font-mono ring-1 ring-warning/20" 
                                placeholder="0.00"
                                value={editForm.originalPrice ?? p.originalPrice ?? 0}
                                onChange={e => setEditForm({...editForm, originalPrice: Number(e.target.value)})}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-end">
                            <span className="font-mono text-primary font-black text-xs">£{p.price.toFixed(2)}</span>
                            {!!(p.originalPrice && p.originalPrice > p.price) && (
                              <span className="text-[10px] text-neutral-400 line-through">£{p.originalPrice.toFixed(2)}</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="density-table-td text-center">
                        {isEditing ? (
                          <div className="flex flex-col gap-1 items-center">
                             <label className="text-[8px] font-bold text-neutral-400 uppercase">Stock</label>
                             <input 
                              type="number" 
                              className="admin-input !bg-white !py-1 w-16 text-center" 
                              value={editForm.stockQuantity ?? p.stockQuantity}
                              onChange={e => setEditForm({...editForm, stockQuantity: Number(e.target.value)})}
                            />
                          </div>
                        ) : (
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${p.stockQuantity < 5 ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'}`}>
                            {p.stockQuantity}
                          </span>
                        )}
                      </td>
                      <td className="density-table-td text-right">
                        {isDeleting ? (
                          <div className="flex items-center justify-end gap-2 animate-in fade-in slide-in-from-right-2">
                             <span className="text-[9px] font-bold text-warning uppercase">Confirm Delete?</span>
                             <button onClick={() => handleDeleteProduct(p.id)} className="bg-warning text-white px-2 py-1 rounded text-[9px] font-bold hover:bg-red-600 transition-colors">YES</button>
                             <button onClick={() => setDeleteConfirmId(null)} className="p-1 hover:text-neutral-900 transition-colors"><X size={14} /></button>
                          </div>
                        ) : isEditing ? (
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={handleUpdateProduct} className="bg-success text-white px-2 py-1 rounded text-[9px] font-bold hover:bg-green-600 transition-colors flex items-center gap-1"><Save size={10} /> SAVE</button>
                            <button onClick={() => {setEditingId(null); setEditForm({});}} className="p-1 hover:text-neutral-400 transition-colors"><X size={14} /></button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all">
                            <button 
                              onClick={() => {setEditingId(p.id); setEditForm(p);}} 
                              className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-[9px] font-bold hover:bg-primary hover:text-white transition-all"
                            >
                              <Edit3 size={10} /> EDIT
                            </button>
                            <button onClick={() => setDeleteConfirmId(p.id)} className="p-1 text-neutral-300 hover:text-warning transition-colors"><Trash2 size={14} /></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {orders.map(order => (
            <div key={order.id} className="density-card hover:border-accent/40 transition-all border-l-4 border-l-primary/30">
              <div className="flex justify-between items-center border-b border-neutral-50 pb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-md flex items-center justify-center ${order.status === 'pending' ? 'bg-warning/10 text-warning' : order.status === 'delivered' ? 'bg-success/10 text-success' : 'bg-accent text-primary'}`}>
                    <Package size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-tight">Order #{order.id.slice(-6).toUpperCase()}</h3>
                    <p className="text-[10px] text-neutral-400 uppercase tracking-tighter">{order.createdAt?.toDate ? order.createdAt.toDate().toLocaleString() : 'Just now'}</p>
                  </div>
                </div>
                <div className="flex bg-[#F1F3F5] p-0.5 rounded-md border border-neutral-100">
                  {(['pending', 'processing', 'out-for-delivery', 'delivered', 'cancelled'] as OrderStatus[]).map(s => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(order.id, s)}
                      className={`px-2 py-1 rounded-md text-[8px] font-bold uppercase tracking-wider transition-all ${order.status === s ? 'bg-white shadow-sm text-primary ring-1 ring-primary/10' : 'text-neutral-400 hover:text-neutral-600'}`}
                    >
                      {s.split('-')[0]}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <ShoppingBag size={12} className="text-primary" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Basket Content</p>
                  </div>
                  <div className="space-y-1.5 bg-neutral-50/50 p-3 rounded-lg border border-neutral-100">
                    {order.items.map(item => (
                      <div key={item.productId} className="flex justify-between text-[11px] items-center">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 flex items-center justify-center bg-white border border-neutral-100 rounded text-[9px] font-bold">{item.quantity}x</span>
                          <span className="text-neutral-700 font-medium">{item.name}</span>
                        </div>
                        <span className="font-mono text-neutral-400 text-[10px]">£{(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="pt-3 mt-2 border-t border-neutral-200 flex justify-between items-center">
                      <span className="text-[10px] font-light italic">Grand Total Paid</span>
                      <span className="text-primary font-mono font-black text-sm italic">£{order.totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Truck size={12} className="text-primary" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Destination</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-neutral-100 space-y-3 shadow-inner">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-accent/30 flex items-center justify-center text-primary"><UserIcon size={12} /></div>
                      <span className="text-[11px] font-bold text-neutral-800">{order.customerName}</span>
                    </div>
                    <div className="flex items-center gap-2 group cursor-pointer">
                      <Mail size={12} className="text-neutral-300" />
                      <span className="text-[10px] text-neutral-500 font-mono hover:text-primary transition-colors">{order.customerEmail}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone size={12} className="text-neutral-300" />
                      <span className="text-[10px] text-neutral-500 font-mono tracking-tighter">{order.customerPhone || 'UNAVAILABLE'}</span>
                    </div>
                    <div className="flex items-start gap-2 pt-2 border-t border-neutral-50">
                      <MapPin size={12} className="text-primary/40 mt-0.5 shrink-0" />
                      <p className="text-[10px] text-neutral-600 leading-relaxed font-medium italic">
                        {order.deliveryAddress}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end pt-2">
                    <button className="text-[9px] font-bold text-primary uppercase flex items-center gap-1 hover:translate-x-1 transition-transform">
                      View full routing <ArrowRight size={10} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {orders.length === 0 && (
             <div className="py-20 flex flex-col items-center gap-2 text-neutral-300">
               <Package size={48} className="opacity-20" />
               <p className="text-xs font-bold uppercase tracking-widest">No active orders</p>
             </div>
          )}
        </div>
      )}

      <style>{`
        .admin-input {
          @apply bg-[#F1F3F5] border border-border rounded-md px-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-primary transition-all placeholder:text-neutral-300 placeholder:font-normal;
        }
        .density-btn-primary {
          @apply bg-primary text-white rounded-md font-bold uppercase tracking-widest hover:bg-secondary transition-all;
        }
      `}</style>
    </div>
  );
}
