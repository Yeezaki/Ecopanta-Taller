import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Layers,
  Package,
  Plus,
  ShoppingCart,
  Store,
  Tag,
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

interface CatalogEntry {
  product: MasterProduct;
  offers: InventoryItem[];
  bestOffer: InventoryItem;
  discountPercent: number;
}

export function CategoriesPage() {
  const { addToCart, setCartOpen, cartCount } = useStoreUi();

  const [products, setProducts] = useState<MasterProduct[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('Todas');
  const [activeEntry, setActiveEntry] = useState<CatalogEntry | null>(null);

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

  const categoriesSummary = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        productCount: number;
        workshopIds: Set<string>;
        minPrice: number;
        imageUrl: string;
      }
    >();

    allEntries.forEach(({ product, offers, bestOffer }) => {
      const existing = map.get(product.category);
      if (existing) {
        existing.productCount += 1;
        existing.minPrice = Math.min(existing.minPrice, bestOffer.price);
        offers.forEach((o) => existing.workshopIds.add(o.workshopId));
        if (!existing.imageUrl && product.imageUrl) {
          existing.imageUrl = product.imageUrl;
        }
      } else {
        const workshopSet = new Set<string>();
        offers.forEach((o) => workshopSet.add(o.workshopId));
        map.set(product.category, {
          name: product.category,
          productCount: 1,
          workshopIds: workshopSet,
          minPrice: bestOffer.price,
          imageUrl: product.imageUrl,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.productCount - a.productCount);
  }, [allEntries]);

  const visibleEntries = useMemo(() => {
    if (activeCategory === 'Todas') return allEntries;
    return allEntries.filter((e) => e.product.category === activeCategory);
  }, [allEntries, activeCategory]);

  return (
    <div className="min-h-screen bg-white text-zinc-950">
      <section className="border-b border-zinc-200 bg-zinc-950 text-white">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 px-4 py-12 sm:flex-row sm:items-end sm:px-6">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-200">
              <Layers className="h-3.5 w-3.5" />
              DEPARTAMENTOS DE TIENDA
            </span>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
              Explora por Categorias
            </h1>
            <p className="mt-2 max-w-xl text-sm text-zinc-300">
              Selecciona una categoria para filtrar productos disponibles y comparar precios regulados entre talleres.
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
        {categoriesSummary.length === 0 ? (
          <div className="py-16 text-center">
            <Package className="mx-auto h-10 w-10 text-zinc-300" />
            <p className="mt-3 text-sm font-semibold text-zinc-900">
              Aun no hay categorias con stock activo.
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Cuando los talleres publiquen inventario, sus categorias apareceran aqui.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <button
                onClick={() => setActiveCategory('Todas')}
                className={`flex items-center justify-between rounded-3xl border p-6 text-left transition ${
                  activeCategory === 'Todas'
                    ? 'border-zinc-950 bg-zinc-950 text-white shadow-md'
                    : 'border-zinc-200 bg-zinc-50 text-zinc-950 hover:border-zinc-950 hover:bg-white'
                }`}
              >
                <div>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-[0.2em] ${
                      activeCategory === 'Todas' ? 'text-zinc-400' : 'text-zinc-500'
                    }`}
                  >
                    CATALOGO COMPLETO
                  </span>
                  <h2 className="mt-1 text-xl font-black uppercase tracking-tight">
                    Todas las Categorias
                  </h2>
                  <p
                    className={`mt-1 text-xs ${
                      activeCategory === 'Todas' ? 'text-zinc-300' : 'text-zinc-600'
                    }`}
                  >
                    {allEntries.length} productos disponibles
                  </p>
                </div>
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${
                    activeCategory === 'Todas'
                      ? 'bg-white/10 text-white'
                      : 'bg-white text-zinc-900'
                  }`}
                >
                  <Layers className="h-6 w-6" />
                </div>
              </button>

              {categoriesSummary.map((cat) => {
                const isSelected = activeCategory === cat.name;
                return (
                  <button
                    key={cat.name}
                    onClick={() => setActiveCategory(cat.name)}
                    className={`group flex items-center justify-between rounded-3xl border p-6 text-left transition ${
                      isSelected
                        ? 'border-zinc-950 bg-zinc-950 text-white shadow-md'
                        : 'border-zinc-200 bg-zinc-50 text-zinc-950 hover:border-zinc-950 hover:bg-white'
                    }`}
                  >
                    <div className="min-w-0 pr-3">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-[0.2em] ${
                          isSelected ? 'text-zinc-400' : 'text-zinc-500'
                        }`}
                      >
                        {cat.workshopIds.size}{' '}
                        {cat.workshopIds.size === 1 ? 'TALLER' : 'TALLERES'}
                      </span>
                      <h2 className="mt-1 truncate text-xl font-black uppercase tracking-tight">
                        {cat.name}
                      </h2>
                      <p
                        className={`mt-1 text-xs ${
                          isSelected ? 'text-zinc-300' : 'text-zinc-600'
                        }`}
                      >
                        {cat.productCount} {cat.productCount === 1 ? 'producto' : 'productos'} -
                        Desde {formatCLP(cat.minPrice)}
                      </p>
                    </div>

                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-zinc-200/40 bg-white">
                      {cat.imageUrl ? (
                        <img
                          src={cat.imageUrl}
                          alt={cat.name}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-zinc-700">
                          <Tag className="h-6 w-6" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-12 border-t border-zinc-200 pt-8">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                    RESULTADOS DE CATEGORIA
                  </p>
                  <h3 className="mt-1 text-2xl font-black text-zinc-950">
                    {activeCategory === 'Todas'
                      ? `Todos los productos (${visibleEntries.length})`
                      : `${activeCategory} (${visibleEntries.length})`}
                  </h3>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
                {visibleEntries.map((entry) => {
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
                          <div className="flex h-full items-center justify-center text-zinc-400">
                            <Package className="h-12 w-12 stroke-[1.25]" />
                          </div>
                        )}

                        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                          {discountPercent > 0 && (
                            <span className="rounded-full bg-zinc-950 px-2.5 py-1 text-[10px] font-black text-white">
                              -{discountPercent}%
                            </span>
                          )}
                          {offers.length > 1 && (
                            <span className="rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold text-zinc-900 shadow-xs">
                              {offers.length} talleres
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-3.5 flex flex-1 flex-col">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                          {product.category}
                        </span>
                        <h4 className="mt-1 line-clamp-2 text-sm font-bold text-zinc-950">
                          {product.name}
                        </h4>
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
            </div>
          </>
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
    </div>
  );
}