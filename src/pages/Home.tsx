import { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Minus, Search, Tag, Sparkles, TrendingUp } from 'lucide-react';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { STORE_CONFIG } from '../config';

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const { addToCart, updateQuantity, getItemQuantity } = useCart();

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('category'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'products'));
    return unsubscribe;
  }, []);

  const dynamicCategories = ['All', ...Array.from(new Set(products.map(p => p.category)))].sort();
  
  const filteredProducts = products.filter(p => 
    (category === 'All' || p.category === category) &&
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  // Recommendations: Items on sale OR random featured items (Memoized to prevent jumping on cart updates)
  const recommendedItems = useMemo(() => {
    const saleItems = products.filter(p => p.originalPrice && p.originalPrice > p.price);
    if (products.length === 0) return [];
    
    const base = saleItems.length >= 4 
      ? saleItems 
      : [...saleItems, ...products.filter(p => !saleItems.includes(p))];
      
    return [...base].sort(() => 0.5 - Math.random()).slice(0, 4);
  }, [products.length > 0]); // Re-shuffle only when products first load or change significantly

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-black tracking-tight text-primary uppercase italic">{STORE_CONFIG.name}</h1>
          <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">{STORE_CONFIG.location} • {products.length} Items Live</p>
        </div>
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
          <input
            type="text"
            placeholder="Search our catalog..."
            className="w-full pl-9 pr-4 py-2 bg-[#F1F3F5] rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-primary transition-all placeholder:text-neutral-300"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </header>

      {/* Featured Recommendations */}
      {STORE_CONFIG.recommendations.enabled && recommendedItems.length > 0 && !search && category === 'All' && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-primary animate-pulse" />
            <h2 className="text-xs font-black uppercase tracking-tighter text-primary italic">{STORE_CONFIG.recommendations.title}</h2>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
            {recommendedItems.map(item => {
              const inCart = getItemQuantity(item.id);
              return (
                <div key={item.id} className="min-w-[200px] snap-start density-card !p-0 overflow-hidden relative border-accent/30 group">
                  {!!(item.originalPrice && item.originalPrice > item.price) && (
                    <div className="absolute top-2 right-2 z-10 bg-warning text-white px-2 py-0.5 rounded-full text-[8px] font-black uppercase italic shadow-lg">
                      SALE
                    </div>
                  )}
                  <div className="aspect-video bg-neutral-100 overflow-hidden">
                    <img src={item.imageUrl || `https://picsum.photos/seed/${item.name}/400/225`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="text-[11px] font-bold text-neutral-800 line-clamp-1">{item.name}</h3>
                      {inCart > 0 && <span className="w-4 h-4 rounded-full bg-primary text-white text-[8px] flex items-center justify-center font-bold shrink-0">{inCart}</span>}
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-primary italic">£{item.price.toFixed(2)}</span>
                          {!!(item.originalPrice && item.originalPrice > item.price) && <span className="text-[11px] text-neutral-500 line-through font-bold">£{item.originalPrice?.toFixed(2)}</span>}
                        </div>
                        {inCart > 0 ? (
                          <div className="flex items-center gap-1.5 bg-accent/20 px-1 py-1 rounded-md border border-accent/20">
                            <button 
                              onClick={(e) => { e.stopPropagation(); updateQuantity(item.id, -1); }}
                              className="p-1 hover:text-warning transition-colors"
                            >
                              <Minus size={10} />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); addToCart(item); }}
                              disabled={inCart >= item.stockQuantity}
                              className="p-1 hover:text-primary transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                            >
                              <Plus size={10} />
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => addToCart(item)}
                            disabled={item.stockQuantity === 0}
                            className="bg-primary text-white p-1.5 rounded-md hover:bg-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Plus size={14} />
                          </button>
                        )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Categories Bar */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md py-3 -mx-4 px-4 border-b border-border shadow-sm">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {dynamicCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${
                category === cat 
                ? 'bg-primary text-white border-primary shadow-lg scale-105' 
                : 'bg-white border-neutral-200 text-neutral-400 hover:border-primary hover:text-primary'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        <AnimatePresence mode='popLayout'>
          {filteredProducts.map((product) => {
            const inCart = getItemQuantity(product.id);
            const isDiscounted = !!(product.originalPrice && product.originalPrice > product.price);
            const isLowStock = product.stockQuantity > 0 && product.stockQuantity < 5;
            
            return (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                key={product.id}
                className="density-card group flex flex-col p-3 relative hover:shadow-2xl transition-all border-accent/20"
              >
                {isDiscounted && (
                  <div className="absolute top-2 left-2 z-10 bg-warning text-white px-2 py-0.5 rounded-sm text-[8px] font-black italic">
                    -{Math.round(((product.originalPrice! - product.price) / product.originalPrice!) * 100)}%
                  </div>
                )}
                
                <div className="aspect-square bg-neutral-50 relative rounded-lg overflow-hidden mb-3 border border-neutral-100">
                  {product.imageUrl ? (
                    <img 
                      src={product.imageUrl} 
                      alt={product.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-neutral-300 uppercase font-black">Missing Visual</div>
                  )}
                  {product.stockQuantity === 0 && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] flex items-center justify-center">
                      <span className="text-[10px] font-black text-warning border-2 border-warning px-2 py-1 rotate-[-12deg] uppercase tracking-widest">Sold Out</span>
                    </div>
                  )}
                  {isLowStock && (
                     <div className="absolute bottom-0 left-0 right-0 bg-warning text-[8px] font-bold text-white text-center py-0.5 uppercase tracking-tighter">
                       Only {product.stockQuantity} Left!
                     </div>
                  )}
                </div>

                <div className="flex-1 space-y-1 mb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] text-primary/60 font-black uppercase tracking-tighter">{product.category}</span>
                    {inCart > 0 && <span className="w-4 h-4 rounded-full bg-primary text-white text-[8px] flex items-center justify-center font-bold animate-in zoom-in">{inCart}</span>}
                  </div>
                  <h3 className="text-[11px] font-bold text-neutral-900 leading-tight group-hover:text-primary transition-colors">{product.name}</h3>
                  <p className="text-[9px] text-neutral-400 line-clamp-2 leading-relaxed italic">{product.description}</p>
                </div>

                <div className="flex items-center justify-between mt-auto pt-3 border-t border-accent/10">
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-primary italic">£{product.price.toFixed(2)}</span>
                    {isDiscounted && <span className="text-[10px] text-neutral-500 line-through font-bold">£{product.originalPrice?.toFixed(2)}</span>}
                  </div>
                  
                  {inCart > 0 ? (
                    <div className="flex items-center gap-1.5 bg-accent/20 px-1 py-1 rounded-md border border-accent/20">
                      <button 
                        onClick={(e) => { e.stopPropagation(); updateQuantity(product.id, -1); }}
                        className="p-1 hover:text-warning transition-colors"
                      >
                        <Minus size={12} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                        disabled={inCart >= product.stockQuantity}
                        className="p-1 hover:text-primary transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => addToCart(product)}
                      disabled={product.stockQuantity === 0}
                      className="p-1.5 bg-white border border-accent text-primary rounded-md hover:bg-primary hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1 shadow-sm"
                    >
                      <Plus size={14} />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      
      {filteredProducts.length === 0 && (
         <div className="py-20 flex flex-col items-center justify-center space-y-4">
           <div className="w-16 h-16 rounded-full bg-[#F1F3F5] flex items-center justify-center text-neutral-300">
             <Search size={32} />
           </div>
           <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">No matching essentials found</p>
         </div>
      )}
    </div>
  );
}
