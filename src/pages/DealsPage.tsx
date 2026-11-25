import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Package,
  Percent,
  Plus,
  ShoppingCart,
  Store,
  X,
} from 'lucide-react';
import { useStoreUi } from '../context/StoreUiContext';
import {
  subscribeInventory,
  subscribeMasterProducts,
  subscribeWorkshops,
} from '../services/storeService';
import { formatCLP } from '../utils/pricing';
import type { InventoryItem, MasterProduct, Workshop } from '../types';

interface DealEntry {
  product: MasterProduct;
  offers: InventoryItem[];
  bestOffer: InventoryItem;
  discountPercent: number;
  savingsAmount: number;
}

type DealSort = 'discount_desc' | 'savings_desc' | 'price_asc';

export function DealsPage() {
  const { addToCart, setCartOpen, cartCount } = useStoreUi();

  const [products, setProducts] = useState<MasterProduct[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [sortBy, setSortBy] = useState<DealSort>('discount_desc');
  const [activeEntry, setActiveEntry] = useState<DealEntry | null>(null);

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

  const activeWorkshopIds = useMemo(
    () => new Set(workshops.filter((w) => w.active).map((w) => w.id)),
    [workshops]
  );

  const dealEntries = useMemo<DealEntry[]>(() => {
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
        if (bestOffer.price >= product.referencePrice) return null;

        const savingsAmount = product.referencePrice - bestOffer.price;
        const discountPercent = Math.round((savingsAmount / product.referencePrice) * 100);

        return {
          product,
          offers,
          bestOffer,
          discountPercent,
          savingsAmount,
        };
      })
      .filter((entry): entry is DealEntry => entry !== null);
  }, [products, inventory, activeWorkshopIds]);

  const categories = useMemo(() => {
    const set = new Set(dealEntries.map((d) => d.product.category));
    return ['Todas', ...Array.from(set).sort()];
  }, [dealEntries]);

  const filteredDeals = useMemo(() => {
    const list = dealEntries.filter((d) =>
      selectedCategory === 'Todas' ? true : d.product.category === selectedCategory
    );

    return list.sort((a, b) => {
      if (sortBy === 'discount_desc') return b.discountPercent - a.discountPercent;
      if (sortBy === 'savings_desc') return b.savingsAmount - a.savingsAmount;
      return a.bestOffer.price - b.bestOffer.price;
    });
  }, [dealEntries, selectedCategory, sortBy]);

  return (
    <div className="min-h-screen bg-white text-zinc-950">
      <section className="border-b border-zinc-200 bg-zinc-950 text-white">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 px-4 py-12 sm:flex-row sm:items-end sm:px-6">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-200">
              <Percent className="h-3.5 w-3.5" />
              PRECIOS BAJO REFERENCIA
            </span>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
              Ofertas y Oportunidades
            </h1>
            <p className="mt-2 max-w-xl text-sm text-zinc-300">
              Productos publicados por talleres por debajo del precio de referencia oficial dentro de la banda de competencia leal.
            </p>
          </div>

          <button
            onClick={() => setCartOpen(true)}
            className="inline-flex items-center gap-2 self-start rounded-full bg-white px-6 py-3 text-xs font-bold uppercase tracking-wider text-zinc-950 transition hover:bg-zinc-200 sm:self-auto"
          >
            <ShoppingCart className="h-4 w-4" />
            Carrito ({cartCount})
          </button>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-col justify-between gap-4 border-b border-zinc-200 pb-6 sm:flex-row sm:items-center">
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${
                  selectedCategory === cat
                    ? 'bg-zinc-950 text-white'
                    : 'border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-950 hover:text-zinc-950'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as DealSort)}
            className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-800 outline-none focus:border-zinc-950"
          >
            <option value="discount_desc">Mayor % descuento</option>
            <option value="savings_desc">Mayor ahorro en pesos</option>
            <option value="price_asc">Menor precio final</option>
          </select>
        </div>

        {filteredDeals.length === 0 ? (
          <div className="py-16 text-center">
            <Percent className="mx-auto h-10 w-10 text-zinc-300" />
            <p className="mt-3 text-sm font-semibold text-zinc-900">
              No hay ofertas bajo precio de referencia en este momento.
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Cuando un taller publique un precio menor al de referencia, aparecera automaticamente aqui.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
            {filteredDeals.map((entry) => {
              const { product, offers, bestOffer, discountPercent, savingsAmount } = entry;
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
                      <div className="flex h-full items-center justify-center text-zinc-400">
                        <Package className="h-12 w-12 stroke-[1.25]" />
                      </div>
                    )}

                    <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-zinc-950 px-2.5 py-1 text-[10px] font-black text-white">
                        -{discountPercent}%
                      </span>
                      <span className="rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold text-zinc-900 shadow-xs">
                        Ahorras {formatCLP(savingsAmount)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3.5 flex flex-1 flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      {product.category}
                    </span>
                    <h2 className="mt-1 line-clamp-2 text-sm font-bold text-zinc-950">
                      {product.name}
                    </h2>
                    <p className="mt-0.5 truncate text-xs text-zinc-500">
                      {bestOffer.workshopName} ({offers.length}{' '}
                      {offers.length === 1 ? 'taller' : 'talleres'})
                    </p>

                    <div className="mt-auto flex items-end justify-between pt-3">
                      <div>
                        <span className="block text-xs text-zinc-400 line-through">
                          {formatCLP(product.referencePrice)}
                        </span>
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
                Referencia: {formatCLP(activeEntry.product.referencePrice)} (ahorro de hasta{' '}
                {formatCLP(activeEntry.savingsAmount)})
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
    </div>
  );
}