import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Layers,
  Minus,
  Package,
  Percent,
  Plus,
  Search,
  ShieldCheck,
  ShoppingCart,
  Store,
  Tag,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useStoreUi } from '../context/StoreUiContext';
import {
  createOrderWithStockCheck,
  subscribeInventory,
  subscribeMasterProducts,
  subscribeWorkshops,
} from '../services/storeService';
import { formatCLP } from '../utils/pricing';
import type { InventoryItem, MasterProduct, Workshop } from '../types';

interface CatalogEntry {
  product: MasterProduct;
  offers: InventoryItem[];
  bestOffer: InventoryItem;
  discountPercent: number;
}

const HERO_SLIDES = [
  {
    eyebrow: 'NUEVA TEMPORADA DE CATALOGO',
    title: 'PRECIO JUSTO EN CADA TALLER',
    subtitle:
      'Explora stock unificado de multiples talleres con bandas de precio reguladas para garantizar transparencia y competencia leal.',
    cta: 'Explorar coleccion',
    targetId: 'productos',
    bgClass: 'from-zinc-950 via-zinc-900 to-zinc-800',
  },
  {
    eyebrow: 'OPORTUNIDADES BAJO REFERENCIA',
    title: 'DESCUENTOS REALES POR TALLER',
    subtitle:
      'Encuentra productos publicados por debajo del precio de referencia y elige el taller con mejor disponibilidad.',
    cta: 'Ver descuentos',
    targetId: 'ofertas',
    bgClass: 'from-neutral-950 via-stone-900 to-zinc-900',
  },
  {
    eyebrow: 'RED DE TALLERES ASOCIADOS',
    title: 'COMPARA Y ELIGE AL INSTANTE',
    subtitle:
      'Catalogo maestro centralizado, stock actualizado al segundo y compra directa sin sobreprecios.',
    cta: 'Ver categorias',
    targetId: 'categorias',
    bgClass: 'from-slate-950 via-zinc-900 to-neutral-900',
  },
];

type SortOption = 'featured' | 'price_asc' | 'price_desc' | 'discount_desc';

export function CatalogPage() {
  const { user } = useAuth();
  const {
    searchTerm,
    setSearchTerm,
    selectedCategory,
    setSelectedCategory,
    cart,
    cartOpen,
    setCartOpen,
    addToCart,
    updateCartQuantity,
    clearCart,
    cartCount,
    cartTotal,
  } = useStoreUi();
  const navigate = useNavigate();

  const [products, setProducts] = useState<MasterProduct[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);

  const [slideIndex, setSlideIndex] = useState(0);
  const [selectedWorkshop, setSelectedWorkshop] = useState('Todos');
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [activeEntry, setActiveEntry] = useState<CatalogEntry | null>(null);
  const [checkoutStatus, setCheckoutStatus] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);

  const dealsRowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5500);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const u1 = subscribeMasterProducts(setProducts);
    const u2 = subscribeInventory(setInventory);
    const u3 = subscribeWorkshops(setWorkshops);
    return () => {
      u1();
      u2();
      u3();
    };
  }, []);

  const activeWorkshops = useMemo(() => workshops.filter((w) => w.active), [workshops]);

  const activeWorkshopIds = useMemo(
    () => new Set(activeWorkshops.map((w) => w.id)),
    [activeWorkshops]
  );

  const allEntries = useMemo<CatalogEntry[]>(() => {
    return products
      .filter((p) => p.active)
      .map((product) => {
        const offers = inventory
          .filter(
            (item) =>
              item.masterProductId === product.id &&
              item.active &&
              item.stock > 0 &&
              activeWorkshopIds.has(item.workshopId)
          )
          .sort((a, b) => a.price - b.price);

        if (offers.length === 0) return null;

        const bestOffer = offers[0];
        const discountPercent =
          product.referencePrice > bestOffer.price
            ? Math.round(((product.referencePrice - bestOffer.price) / product.referencePrice) * 100)
            : 0;

        return {
          product,
          offers,
          bestOffer,
          discountPercent,
        };
      })
      .filter((entry): entry is CatalogEntry => entry !== null);
  }, [products, inventory, activeWorkshopIds]);

  const categoryCards = useMemo(() => {
    const map = new Map<string, { name: string; count: number; imageUrl: string }>();
    const sourceProducts = allEntries.length > 0 ? allEntries.map((e) => e.product) : products.filter((p) => p.active);

    sourceProducts.forEach((product) => {
      const existing = map.get(product.category);
      if (existing) {
        existing.count += 1;
        if (!existing.imageUrl && product.imageUrl) {
          existing.imageUrl = product.imageUrl;
        }
      } else {
        map.set(product.category, {
          name: product.category,
          count: 1,
          imageUrl: product.imageUrl,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [allEntries, products]);

  const dealEntries = useMemo(() => {
    const discounted = allEntries
      .filter((e) => e.discountPercent > 0)
      .sort((a, b) => b.discountPercent - a.discountPercent);
    if (discounted.length > 0) return discounted.slice(0, 10);
    return [...allEntries].sort((a, b) => a.bestOffer.price - b.bestOffer.price).slice(0, 10);
  }, [allEntries]);

  const filteredEntries = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const list = allEntries
      .filter((entry) =>
        selectedCategory === 'Todas' ? true : entry.product.category === selectedCategory
      )
      .filter((entry) => {
        if (!term) return true;
        return (
          entry.product.name.toLowerCase().includes(term) ||
          entry.product.sku.toLowerCase().includes(term) ||
          entry.product.category.toLowerCase().includes(term)
        );
      })
      .map((entry) => {
        if (selectedWorkshop === 'Todos') return entry;
        const workshopOffers = entry.offers.filter((o) => o.workshopId === selectedWorkshop);
        if (workshopOffers.length === 0) return null;
        const bestOffer = workshopOffers[0];
        const discountPercent =
          entry.product.referencePrice > bestOffer.price
            ? Math.round(
                ((entry.product.referencePrice - bestOffer.price) / entry.product.referencePrice) *
                  100
              )
            : 0;
        return {
          ...entry,
          offers: workshopOffers,
          bestOffer,
          discountPercent,
        };
      })
      .filter((entry): entry is CatalogEntry => entry !== null);

    return list.sort((a, b) => {
      if (sortBy === 'price_asc') return a.bestOffer.price - b.bestOffer.price;
      if (sortBy === 'price_desc') return b.bestOffer.price - a.bestOffer.price;
      if (sortBy === 'discount_desc') return b.discountPercent - a.discountPercent;
      return b.offers.length - a.offers.length;
    });
  }, [allEntries, selectedCategory, searchTerm, selectedWorkshop, sortBy]);

  function scrollDeals(direction: 'left' | 'right') {
    if (!dealsRowRef.current) return;
    const offset = direction === 'left' ? -320 : 320;
    dealsRowRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  }

  async function handleCheckout() {
    if (!user) {
      setCartOpen(false);
      navigate('/login');
      return;
    }
    if (cart.length === 0) return;

    setSubmittingOrder(true);
    setCheckoutStatus('');
    try {
      await createOrderWithStockCheck(
        user.uid,
        user.email,
        cart.map((c) => ({
          inventoryItemId: c.inventoryItem.id,
          masterProductId: c.product.id,
          productName: c.product.name,
          workshopId: c.inventoryItem.workshopId,
          workshopName: c.inventoryItem.workshopName,
          quantity: c.quantity,
          unitPrice: c.inventoryItem.price,
        }))
      );
      clearCart();
      setCheckoutStatus('Pedido registrado correctamente.');
    } catch (err) {
      setCheckoutStatus(err instanceof Error ? err.message : 'No se pudo completar el pedido.');
    } finally {
      setSubmittingOrder(false);
    }
  }

  const currentSlide = HERO_SLIDES[slideIndex];
  const isFiltering =
    searchTerm.trim() !== '' || selectedCategory !== 'Todas' || selectedWorkshop !== 'Todos';

  return (
    <div className="min-h-screen bg-white text-zinc-950">
      {!isFiltering && (
        <>
          <section className="relative overflow-hidden bg-zinc-950 text-white">
            <div className={`bg-gradient-to-br ${currentSlide.bgClass} transition-all duration-700`}>
              <div className="mx-auto flex min-h-[420px] max-w-7xl flex-col justify-between px-4 py-14 sm:px-6 lg:min-h-[470px] lg:py-20">
                <div className="max-w-2xl">
                  <span className="inline-block rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-[11px] font-semibold tracking-[0.2em] text-zinc-200 backdrop-blur-sm">
                    {currentSlide.eyebrow}
                  </span>
                  <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
                    {currentSlide.title}
                  </h1>
                  <p className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-300 sm:text-base">
                    {currentSlide.subtitle}
                  </p>

                  <div className="mt-8 flex flex-wrap items-center gap-3">
                    <a
                      href={`#${currentSlide.targetId}`}
                      className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-xs font-bold uppercase tracking-wider text-zinc-950 transition hover:bg-zinc-200"
                    >
                      {currentSlide.cta}
                      <ArrowRight className="h-4 w-4" />
                    </a>
                    <button
                      onClick={() => setCartOpen(true)}
                      className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/5 px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-sm transition hover:bg-white/15"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      Carrito ({cartCount})
                    </button>
                  </div>
                </div>

                <div className="mt-10 flex items-center justify-between border-t border-white/10 pt-6">
                  <div className="flex items-center gap-8 text-xs uppercase tracking-widest text-zinc-400">
                    <div>
                      <span className="block text-xl font-black text-white">
                        {activeWorkshops.length}
                      </span>
                      Talleres
                    </div>
                    <div>
                      <span className="block text-xl font-black text-white">
                        {allEntries.length}
                      </span>
                      Productos
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setSlideIndex((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)
                      }
                      aria-label="Anterior"
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white transition hover:bg-white hover:text-zinc-950"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <div className="flex items-center gap-1.5 px-2">
                      {HERO_SLIDES.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSlideIndex(idx)}
                          aria-label={`Slide ${idx + 1}`}
                          className={`h-1.5 rounded-full transition-all ${
                            idx === slideIndex ? 'w-7 bg-white' : 'w-1.5 bg-white/35'
                          }`}
                        />
                      ))}
                    </div>
                    <button
                      onClick={() => setSlideIndex((prev) => (prev + 1) % HERO_SLIDES.length)}
                      aria-label="Siguiente"
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white transition hover:bg-white hover:text-zinc-950"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="border-b border-zinc-200 bg-zinc-50">
            <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:grid-cols-3 sm:px-6">
              <div className="flex items-center gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-white">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-zinc-900">
                    Equilibrio de Precios
                  </p>
                  <p className="text-xs text-zinc-500">Margenes regulados entre todos los talleres</p>
                </div>
              </div>

              <div className="flex items-center gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-white">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-zinc-900">
                    Catalogo Unificado
                  </p>
                  <p className="text-xs text-zinc-500">Compara multiples ofertas en un solo lugar</p>
                </div>
              </div>

              <div className="flex items-center gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-white">
                  <Truck className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-zinc-900">
                    Stock Verificado
                  </p>
                  <p className="text-xs text-zinc-500">Actualizacion directa por cada taller</p>
                </div>
              </div>
            </div>
          </section>

          {categoryCards.length > 0 && (
            <section id="categorias" className="mx-auto max-w-7xl px-4 pt-12 sm:px-6">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                    NAVEGA POR DEPARTAMENTO
                  </p>
                  <h2 className="mt-1 text-2xl font-black tracking-tight text-zinc-950">
                    Categorias Destacadas
                  </h2>
                </div>
                <button
                  onClick={() => {
                    setSelectedCategory('Todas');
                    document.getElementById('productos')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="text-xs font-bold uppercase tracking-wider text-zinc-600 underline-offset-4 hover:text-zinc-950 hover:underline"
                >
                  Ver todas
                </button>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {categoryCards.map((cat) => (
                  <button
                    key={cat.name}
                    onClick={() => {
                      setSelectedCategory(cat.name);
                      document.getElementById('productos')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="group flex flex-col items-center rounded-2xl border border-zinc-200/80 bg-zinc-50/70 p-4 text-center transition hover:border-zinc-950 hover:bg-white hover:shadow-sm"
                  >
                    <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-white transition duration-300 group-hover:scale-105">
                      {cat.imageUrl ? (
                        <img
                          src={cat.imageUrl}
                          alt={cat.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Tag className="h-7 w-7 text-zinc-700" />
                      )}
                    </div>
                    <span className="mt-3 line-clamp-1 text-xs font-bold uppercase tracking-wider text-zinc-950">
                      {cat.name}
                    </span>
                    <span className="mt-0.5 text-[11px] text-zinc-400">
                      {cat.count} {cat.count === 1 ? 'producto' : 'productos'}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {dealEntries.length > 0 && (
            <section id="ofertas" className="mx-auto max-w-7xl px-4 pt-12 sm:px-6">
              <div className="rounded-3xl bg-zinc-950 p-6 text-white sm:p-8">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-200">
                      <Percent className="h-3 w-3" />
                      OPORTUNIDADES EN TIENDA
                    </span>
                    <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                      Mejores Precios Bajo Referencia
                    </h2>
                  </div>

                  <div className="hidden items-center gap-2 sm:flex">
                    <button
                      onClick={() => scrollDeals('left')}
                      aria-label="Desplazar izquierda"
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white transition hover:bg-white hover:text-zinc-950"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => scrollDeals('right')}
                      aria-label="Desplazar derecha"
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white transition hover:bg-white hover:text-zinc-950"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div ref={dealsRowRef} className="mt-6 flex gap-4 overflow-x-auto pb-2">
                  {dealEntries.map((entry) => (
                    <article
                      key={entry.product.id}
                      onClick={() => setActiveEntry(entry)}
                      className="group flex w-60 shrink-0 cursor-pointer flex-col rounded-2xl bg-white p-3.5 text-zinc-950 transition hover:-translate-y-1"
                    >
                      <div className="relative aspect-square overflow-hidden rounded-xl bg-zinc-100">
                        {entry.product.imageUrl ? (
                          <img
                            src={entry.product.imageUrl}
                            alt={entry.product.name}
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-zinc-400">
                            <Package className="h-10 w-10" />
                          </div>
                        )}
                        {entry.discountPercent > 0 && (
                          <span className="absolute top-2.5 left-2.5 rounded-full bg-zinc-950 px-2.5 py-1 text-[10px] font-black tracking-wider text-white">
                            -{entry.discountPercent}%
                          </span>
                        )}
                      </div>

                      <span className="mt-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        {entry.product.category}
                      </span>
                      <h3 className="mt-0.5 line-clamp-2 min-h-[2.5rem] text-sm font-bold text-zinc-950">
                        {entry.product.name}
                      </h3>

                      <div className="mt-2">
                        {entry.discountPercent > 0 && (
                          <p className="text-xs text-zinc-400 line-through">
                            {formatCLP(entry.product.referencePrice)}
                          </p>
                        )}
                        <p className="text-lg font-black text-zinc-950">
                          {formatCLP(entry.bestOffer.price)}
                        </p>
                        <p className="truncate text-[11px] text-zinc-500">
                          Taller: {entry.bestOffer.workshopName}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(entry.product, entry.bestOffer);
                        }}
                        className="mt-3 w-full rounded-full bg-zinc-950 py-2 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-zinc-800"
                      >
                        Agregar
                      </button>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          )}

          {categoryCards.length >= 2 && (
            <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6">
              <div className="grid gap-4 md:grid-cols-2">
                {categoryCards.slice(0, 2).map((cat, idx) => (
                  <div
                    key={cat.name}
                    onClick={() => {
                      setSelectedCategory(cat.name);
                      document.getElementById('productos')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={`group flex cursor-pointer items-center justify-between overflow-hidden rounded-3xl p-7 transition ${
                      idx === 0
                        ? 'bg-zinc-950 text-white hover:bg-zinc-900'
                        : 'border border-zinc-200 bg-zinc-100 text-zinc-950 hover:border-zinc-950'
                    }`}
                  >
                    <div>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-[0.2em] ${
                          idx === 0 ? 'text-zinc-400' : 'text-zinc-500'
                        }`}
                      >
                        COLECCION DESTACADA
                      </span>
                      <h3 className="mt-1 text-2xl font-black uppercase tracking-tight">
                        {cat.name}
                      </h3>
                      <p
                        className={`mt-1 text-xs ${
                          idx === 0 ? 'text-zinc-400' : 'text-zinc-600'
                        }`}
                      >
                        {cat.count} productos con precios regulados
                      </p>
                      <span
                        className={`mt-5 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider ${
                          idx === 0
                            ? 'bg-white text-zinc-950'
                            : 'bg-zinc-950 text-white'
                        }`}
                      >
                        Explorar
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </span>
                    </div>

                    <div className="hidden h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-white/10 sm:flex sm:items-center sm:justify-center">
                      {cat.imageUrl ? (
                        <img
                          src={cat.imageUrl}
                          alt={cat.name}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <Package className="h-10 w-10 opacity-40" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <section id="productos" className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="flex flex-col justify-between gap-4 border-b border-zinc-200 pb-6 sm:flex-row sm:items-end">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400">
              TIENDA ONLINE
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-zinc-950 sm:text-3xl">
              {selectedCategory === 'Todas'
                ? 'Productos Recomendados'
                : `Coleccion: ${selectedCategory}`}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isFiltering && (
              <button
                onClick={() => {
                  setSelectedCategory('Todas');
                  setSelectedWorkshop('Todos');
                  setSearchTerm('');
                }}
                className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-700 transition hover:border-zinc-950 hover:text-zinc-950"
              >
                Ver todo
              </button>
            )}

            <select
              value={selectedWorkshop}
              onChange={(e) => setSelectedWorkshop(e.target.value)}
              className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-800 outline-none transition focus:border-zinc-950"
            >
              <option value="Todos">Todos los talleres</option>
              {activeWorkshops.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-800 outline-none transition focus:border-zinc-950"
            >
              <option value="featured">Destacados</option>
              <option value="discount_desc">Mayor descuento</option>
              <option value="price_asc">Menor precio</option>
              <option value="price_desc">Mayor precio</option>
            </select>
          </div>
        </div>

        {filteredEntries.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm font-semibold text-zinc-900">
              Aun no hay productos publicados en esta seccion.
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {isFiltering
                ? 'Prueba quitando los filtros activos para ver toda la tienda.'
                : 'Cuando los talleres agreguen stock desde su panel, apareceran aqui automaticamente.'}
            </p>
            {isFiltering && (
              <button
                onClick={() => {
                  setSelectedCategory('Todas');
                  setSelectedWorkshop('Todos');
                  setSearchTerm('');
                }}
                className="mt-4 rounded-full bg-zinc-950 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white"
              >
                Mostrar todos los productos
              </button>
            )}
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
            {filteredEntries.map((entry) => {
              const { product, offers, bestOffer, discountPercent } = entry;
              return (
                <article
                  key={product.id}
                  onClick={() => setActiveEntry(entry)}
                  className="group flex cursor-pointer flex-col"
                >
                  <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-zinc-100">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200 text-zinc-400 transition duration-500 group-hover:scale-105">
                        <Package className="h-12 w-12 stroke-[1.25]" />
                      </div>
                    )}

                    <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                      {discountPercent > 0 && (
                        <span className="rounded-full bg-zinc-950 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">
                          -{discountPercent}%
                        </span>
                      )}
                      {offers.length > 1 && (
                        <span className="rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-900 shadow-xs">
                          {offers.length} talleres
                        </span>
                      )}
                    </div>

                    <div className="absolute inset-x-3 bottom-3 translate-y-2 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveEntry(entry);
                        }}
                        className="w-full rounded-full bg-zinc-950/95 py-2.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-lg backdrop-blur-sm transition hover:bg-zinc-800"
                      >
                        Elegir taller ({offers.length})
                      </button>
                    </div>
                  </div>

                  <div className="mt-3.5 flex flex-1 flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      {product.category}
                    </span>

                    <h3 className="mt-1 line-clamp-2 text-sm font-bold text-zinc-950 transition group-hover:text-zinc-600">
                      {product.name}
                    </h3>

                    <p className="mt-0.5 truncate text-xs text-zinc-500">
                      {bestOffer.workshopName}
                    </p>

                    <div className="mt-auto flex items-end justify-between pt-3">
                      <div>
                        {discountPercent > 0 && (
                          <span className="block text-xs text-zinc-400 line-through">
                            {formatCLP(product.referencePrice)}
                          </span>
                        )}
                        <span className="text-lg font-black text-zinc-950">
                          {formatCLP(bestOffer.price)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(product, bestOffer);
                        }}
                        className="inline-flex items-center gap-1 rounded-full border border-zinc-300 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-zinc-950 transition hover:border-zinc-950 hover:bg-zinc-950 hover:text-white"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Agregar
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <footer className="mt-10 border-t border-zinc-200 bg-zinc-950 text-zinc-400">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-10 text-xs sm:flex-row sm:px-6">
          <span className="text-sm font-black uppercase tracking-tighter text-white">
            ECOPANTA<span className="font-light text-zinc-500">STORE</span>
          </span>
          <p>Plataforma multitienda de talleres con precios regulados.</p>
          <span>{new Date().getFullYear()} Ecopanta Taller</span>
        </div>
      </footer>

      {activeEntry && (
        <div
          onClick={() => setActiveEntry(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="grid max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl md:grid-cols-2"
          >
            <div className="relative min-h-[260px] bg-zinc-100">
              {activeEntry.product.imageUrl ? (
                <img
                  src={activeEntry.product.imageUrl}
                  alt={activeEntry.product.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-zinc-400">
                  <Package className="h-16 w-16 stroke-[1.25]" />
                </div>
              )}
              <button
                onClick={() => setActiveEntry(null)}
                className="absolute top-4 left-4 rounded-full bg-white/90 p-2 text-zinc-900 shadow-sm md:hidden"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex max-h-[90vh] flex-col overflow-y-auto p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-400">
                    {activeEntry.product.category} - {activeEntry.product.sku}
                  </span>
                  <h2 className="mt-1 text-2xl font-black text-zinc-950">
                    {activeEntry.product.name}
                  </h2>
                </div>
                <button
                  onClick={() => setActiveEntry(null)}
                  className="hidden rounded-full p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-900 md:block"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {activeEntry.product.description && (
                <p className="mt-3 text-sm leading-relaxed text-zinc-600">
                  {activeEntry.product.description}
                </p>
              )}

              <div className="mt-5 inline-flex items-center gap-2 rounded-xl bg-zinc-100 px-3.5 py-2 text-xs font-medium text-zinc-700">
                <Check className="h-4 w-4 text-zinc-950" />
                Precio de referencia regulado: {formatCLP(activeEntry.product.referencePrice)}
              </div>

              <div className="mt-6 flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Elige el taller ({activeEntry.offers.length} opciones)
                </p>

                <div className="mt-3 space-y-2.5">
                  {activeEntry.offers.map((offer, idx) => (
                    <div
                      key={offer.id}
                      className="flex items-center justify-between rounded-2xl border border-zinc-200 p-3.5 transition hover:border-zinc-950"
                    >
                      <div className="min-w-0 pr-3">
                        <div className="flex items-center gap-2">
                          <Store className="h-4 w-4 shrink-0 text-zinc-500" />
                          <p className="truncate text-sm font-bold text-zinc-950">
                            {offer.workshopName}
                          </p>
                          {idx === 0 && (
                            <span className="rounded-full bg-zinc-950 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                              Mejor precio
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {offer.stock} unidades disponibles
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-3">
                        <span className="text-base font-black text-zinc-950">
                          {formatCLP(offer.price)}
                        </span>
                        <button
                          onClick={() => {
                            addToCart(activeEntry.product, offer);
                            setActiveEntry(null);
                          }}
                          className="rounded-full bg-zinc-950 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-zinc-800"
                        >
                          Agregar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {cartOpen && (
        <div
          onClick={() => setCartOpen(false)}
          className="fixed inset-0 z-50 flex justify-end bg-zinc-950/50 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-5">
              <div>
                <h2 className="text-base font-black uppercase tracking-wider text-zinc-950">
                  Tu Carrito ({cartCount})
                </h2>
                <p className="text-xs text-zinc-500">Resumen de items seleccionados</p>
              </div>
              <button
                onClick={() => setCartOpen(false)}
                className="rounded-full p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {checkoutStatus && (
                <div className="mb-4 rounded-2xl bg-zinc-100 p-4 text-sm font-medium text-zinc-900">
                  {checkoutStatus}
                </div>
              )}

              {cart.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <ShoppingCart className="h-10 w-10 text-zinc-300" />
                  <p className="mt-3 text-sm font-semibold text-zinc-700">Tu carrito esta vacio</p>
                  <p className="mt-1 text-xs text-zinc-400">
                    Explora la tienda y agrega productos de tus talleres preferidos.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div
                      key={item.inventoryItem.id}
                      className="flex gap-3.5 rounded-2xl border border-zinc-200 p-3.5"
                    >
                      <div className="h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
                        {item.product.imageUrl ? (
                          <img
                            src={item.product.imageUrl}
                            alt={item.product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-zinc-400">
                            <Package className="h-5 w-5" />
                          </div>
                        )}
                      </div>

                      <div className="flex min-w-0 flex-1 flex-col justify-between">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-zinc-950">
                              {item.product.name}
                            </p>
                            <p className="truncate text-xs text-zinc-500">
                              {item.inventoryItem.workshopName}
                            </p>
                          </div>
                          <button
                            onClick={() => updateCartQuantity(item.inventoryItem.id, 0)}
                            className="text-zinc-400 transition hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="mt-2 flex items-center justify-between">
                          <div className="inline-flex items-center rounded-full border border-zinc-300">
                            <button
                              onClick={() =>
                                updateCartQuantity(item.inventoryItem.id, item.quantity - 1)
                              }
                              className="p-1.5 text-zinc-600 hover:text-zinc-950"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="px-2.5 text-xs font-bold">{item.quantity}</span>
                            <button
                              onClick={() =>
                                updateCartQuantity(item.inventoryItem.id, item.quantity + 1)
                              }
                              className="p-1.5 text-zinc-600 hover:text-zinc-950"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <span className="text-sm font-black text-zinc-950">
                            {formatCLP(item.inventoryItem.price * item.quantity)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-zinc-200 bg-zinc-50 p-6">
              <div className="flex items-center justify-between text-base font-black text-zinc-950">
                <span>TOTAL</span>
                <span>{formatCLP(cartTotal)}</span>
              </div>
              <button
                onClick={handleCheckout}
                disabled={cart.length === 0 || submittingOrder}
                className="mt-4 w-full rounded-full bg-zinc-950 py-3.5 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-zinc-800 disabled:opacity-40"
              >
                {submittingOrder
                  ? 'Procesando pedido...'
                  : user
                    ? 'Finalizar compra'
                    : 'Iniciar sesion para comprar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}