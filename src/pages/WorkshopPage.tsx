import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { AlertTriangle, Check, ClipboardList, Edit3, Package, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  deleteInventoryItem,
  saveInventoryItem,
  subscribeInventory,
  subscribeMasterProducts,
  subscribeOrders,
  subscribePricingSettings,
  subscribeWorkshops,
} from '../services/storeService';
import { calculatePriceBounds, formatCLP, isPriceWithinBounds } from '../utils/pricing';
import type {
  InventoryItem,
  MasterProduct,
  Order,
  PricingSettings,
  Workshop,
} from '../types';

export function WorkshopPage() {
  const { user } = useAuth();

  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [selectedWorkshopId, setSelectedWorkshopId] = useState<string>('');
  const [products, setProducts] = useState<MasterProduct[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<PricingSettings>({ defaultMarginPercent: 0.15 });
  const [tab, setTab] = useState<'inventario' | 'pedidos'>('inventario');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [masterProductId, setMasterProductId] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('1');
  const [active, setActive] = useState(true);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    const unsubWorkshops = subscribeWorkshops(setWorkshops);
    const unsubProducts = subscribeMasterProducts(setProducts);
    const unsubSettings = subscribePricingSettings(setSettings);
    return () => {
      unsubWorkshops();
      unsubProducts();
      unsubSettings();
    };
  }, []);

  useEffect(() => {
    if (user?.role === 'taller' && user.workshopId) {
      setSelectedWorkshopId(user.workshopId);
    } else if (user?.role === 'admin' && !selectedWorkshopId && workshops.length > 0) {
      setSelectedWorkshopId(workshops[0].id);
    }
  }, [user, workshops, selectedWorkshopId]);

  useEffect(() => {
    if (!selectedWorkshopId) {
      setInventory([]);
      setOrders([]);
      return;
    }
    const unsubInv = subscribeInventory(setInventory, selectedWorkshopId);
    const unsubOrders = subscribeOrders(setOrders, { workshopId: selectedWorkshopId });
    return () => {
      unsubInv();
      unsubOrders();
    };
  }, [selectedWorkshopId]);

  const currentWorkshop = useMemo(
    () => workshops.find((w) => w.id === selectedWorkshopId) ?? null,
    [workshops, selectedWorkshopId]
  );

  const productMap = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );

  const selectedProduct = masterProductId ? productMap.get(masterProductId) ?? null : null;

  const priceBounds = useMemo(() => {
    if (!selectedProduct) return null;
    return calculatePriceBounds(
      selectedProduct.referencePrice,
      settings.defaultMarginPercent,
      selectedProduct.marginOverride
    );
  }, [selectedProduct, settings.defaultMarginPercent]);

  const numericPrice = Number(price);
  const priceValid =
    selectedProduct !== null &&
    price !== '' &&
    !Number.isNaN(numericPrice) &&
    isPriceWithinBounds(
      numericPrice,
      selectedProduct.referencePrice,
      settings.defaultMarginPercent,
      selectedProduct.marginOverride
    );

  function resetForm() {
    setEditingId(null);
    setMasterProductId('');
    setPrice('');
    setStock('1');
    setActive(true);
  }

  function startEdit(item: InventoryItem) {
    setEditingId(item.id);
    setMasterProductId(item.masterProductId);
    setPrice(String(item.price));
    setStock(String(item.stock));
    setActive(item.active);
    setFeedback('');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!currentWorkshop || !selectedProduct || !priceValid) return;

    setFeedback('');
    try {
      await saveInventoryItem(
        {
          workshopId: currentWorkshop.id,
          workshopName: currentWorkshop.name,
          masterProductId: selectedProduct.id,
          price: Math.round(numericPrice),
          stock: Math.max(0, Math.floor(Number(stock))),
          active,
        },
        editingId ?? undefined
      );
      resetForm();
      setFeedback('Inventario guardado correctamente.');
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Error al guardar inventario.');
    }
  }

  if (!currentWorkshop) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm text-slate-600">
            Tu cuenta aun no tiene un taller asignado. Solicita al administrador vincular tu taller.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Panel de Taller: {currentWorkshop.name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Administra tu stock y precios respetando la banda de competencia leal vigente.
          </p>
        </div>

        {user?.role === 'admin' && (
          <select
            value={selectedWorkshopId}
            onChange={(e) => {
              setSelectedWorkshopId(e.target.value);
              resetForm();
            }}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {workshops.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="mt-6 flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setTab('inventario')}
          className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium ${
            tab === 'inventario'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Package className="h-4 w-4" />
          Mi Inventario ({inventory.length})
        </button>
        <button
          onClick={() => setTab('pedidos')}
          className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium ${
            tab === 'pedidos'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <ClipboardList className="h-4 w-4" />
          Pedidos Recibidos ({orders.length})
        </button>
      </div>

      {tab === 'inventario' ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <form
            onSubmit={handleSubmit}
            className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-base font-semibold text-slate-900">
              {editingId ? 'Editar publicacion' : 'Agregar item del catalogo maestro'}
            </h2>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Producto Maestro</label>
                <select
                  required
                  disabled={Boolean(editingId)}
                  value={masterProductId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setMasterProductId(id);
                    const prod = productMap.get(id);
                    if (prod) setPrice(String(prod.referencePrice));
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
                >
                  <option value="">Selecciona un producto...</option>
                  {products
                    .filter((p) => p.active)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku})
                      </option>
                    ))}
                </select>
              </div>

              {selectedProduct && priceBounds && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                  <p className="font-semibold text-slate-900">
                    Precio de referencia: {formatCLP(selectedProduct.referencePrice)}
                  </p>
                  <p className="mt-1">
                    Rango permitido (+/- {Math.round(priceBounds.effectiveMargin * 100)}%):{' '}
                    <strong>{formatCLP(priceBounds.min)}</strong> a{' '}
                    <strong>{formatCLP(priceBounds.max)}</strong>
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700">Precio de venta</label>
                <input
                  type="number"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                {selectedProduct && price !== '' && (
                  <p
                    className={`mt-1 inline-flex items-center gap-1 text-xs ${
                      priceValid ? 'text-emerald-700' : 'text-red-600'
                    }`}
                  >
                    {priceValid ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        Precio dentro del margen de competencia leal
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Fuera del rango permitido para este producto
                      </>
                    )}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Stock disponible</label>
                <input
                  type="number"
                  min={0}
                  required
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                />
                Visible en el catalogo
              </label>

              {feedback && (
                <div className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700">
                  {feedback}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={!priceValid}
                  className="flex-1 rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-40"
                >
                  {editingId ? 'Actualizar' : 'Publicar'}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          </form>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">Precio</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inventory.map((item) => {
                  const product = productMap.get(item.masterProductId);
                  const validNow = product
                    ? isPriceWithinBounds(
                        item.price,
                        product.referencePrice,
                        settings.defaultMarginPercent,
                        product.marginOverride
                      )
                    : true;
                  return (
                    <tr key={item.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {product ? product.name : item.masterProductId}
                      </td>
                      <td className="px-4 py-3">
                        <span className={validNow ? 'text-slate-900' : 'font-semibold text-red-600'}>
                          {formatCLP(item.price)}
                        </span>
                        {!validNow && (
                          <span className="ml-2 rounded bg-red-50 px-1.5 py-0.5 text-xs text-red-600">
                            Ajustar
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{item.stock}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            item.active
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {item.active ? 'Activo' : 'Pausado'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-1">
                          <button
                            onClick={() => startEdit(item)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteInventoryItem(item.id)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {inventory.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      Este taller aun no tiene items publicados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {orders.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              No hay pedidos registrados para este taller.
            </div>
          ) : (
            orders.map((order) => {
              const workshopItems = order.items.filter((i) => i.workshopId === currentWorkshop.id);
              const subtotal = workshopItems.reduce(
                (acc, i) => acc + i.unitPrice * i.quantity,
                0
              );
              return (
                <div
                  key={order.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Pedido #{order.id.slice(0, 8)}
                      </p>
                      <p className="text-xs text-slate-500">
                        Cliente: {order.userEmail} - {new Date(order.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase text-slate-700">
                      {order.status}
                    </span>
                  </div>
                  <ul className="mt-3 space-y-1 text-sm text-slate-700">
                    {workshopItems.map((item, idx) => (
                      <li key={idx} className="flex justify-between">
                        <span>
                          {item.quantity}x {item.productName}
                        </span>
                        <span className="font-medium">
                          {formatCLP(item.unitPrice * item.quantity)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex justify-end border-t border-slate-100 pt-2 text-sm font-semibold text-slate-900">
                    Subtotal taller: {formatCLP(subtotal)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </main>
  );
}