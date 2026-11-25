import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ClipboardList, Package, Sliders, Store, Trash2, Users } from 'lucide-react';
import {
  createMasterProduct,
  createWorkshop,
  deleteInventoryItem,
  deleteMasterProduct,
  deleteWorkshop,
  linkExistingFirebaseUser,
  saveInventoryItem,
  subscribeInventory,
  subscribeMasterProducts,
  subscribeOrders,
  subscribePricingSettings,
  subscribeUsers,
  subscribeWorkshops,
  updateMasterProduct,
  updateOrderStatus,
  updatePricingSettings,
  updateUserRole,
  updateWorkshop,
} from '../services/storeService';
import { calculatePriceBounds, formatCLP, isPriceWithinBounds } from '../utils/pricing';
import type {
  AppUser,
  InventoryItem,
  MasterProduct,
  Order,
  OrderStatus,
  PricingSettings,
  UserRole,
  Workshop,
} from '../types';

type AdminTab = 'catalogo' | 'talleres' | 'inventario' | 'usuarios' | 'pedidos';

export function AdminPage() {
  const [tab, setTab] = useState<AdminTab>('catalogo');
  const [settings, setSettings] = useState<PricingSettings>({ defaultMarginPercent: 0.15 });
  const [marginInput, setMarginInput] = useState('15');

  const [products, setProducts] = useState<MasterProduct[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  const [pSku, setPSku] = useState('');
  const [pName, setPName] = useState('');
  const [pCategory, setPCategory] = useState('');
  const [pDesc, setPDesc] = useState('');
  const [pImage, setPImage] = useState('');
  const [pRefPrice, setPRefPrice] = useState('');
  const [pMarginOverride, setPMarginOverride] = useState('');

  const [wName, setWName] = useState('');
  const [wLocation, setWLocation] = useState('');
  const [wContact, setWContact] = useState('');

  const [uUid, setUUid] = useState('');
  const [uEmail, setUEmail] = useState('');
  const [uName, setUName] = useState('');
  const [uRole, setURole] = useState<UserRole>('taller');
  const [uWorkshopId, setUWorkshopId] = useState('');

  useEffect(() => {
    const u1 = subscribePricingSettings((s) => {
      setSettings(s);
      setMarginInput(String(Math.round(s.defaultMarginPercent * 100)));
    });
    const u2 = subscribeMasterProducts(setProducts);
    const u3 = subscribeWorkshops(setWorkshops);
    const u4 = subscribeInventory(setInventory);
    const u5 = subscribeUsers(setUsers);
    const u6 = subscribeOrders(setOrders);
    return () => {
      u1();
      u2();
      u3();
      u4();
      u5();
      u6();
    };
  }, []);

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  async function handleSaveMargin(e: FormEvent) {
    e.preventDefault();
    const numeric = Math.max(1, Math.min(50, Number(marginInput)));
    await updatePricingSettings(numeric / 100);
  }

  async function handleCreateProduct(e: FormEvent) {
    e.preventDefault();
    await createMasterProduct({
      sku: pSku.trim().toUpperCase(),
      name: pName.trim(),
      category: pCategory.trim(),
      description: pDesc.trim(),
      imageUrl: pImage.trim(),
      referencePrice: Math.round(Number(pRefPrice)),
      marginOverride: pMarginOverride === '' ? null : Number(pMarginOverride) / 100,
      active: true,
    });
    setPSku('');
    setPName('');
    setPCategory('');
    setPDesc('');
    setPImage('');
    setPRefPrice('');
    setPMarginOverride('');
  }

  async function handleCreateWorkshop(e: FormEvent) {
    e.preventDefault();
    await createWorkshop({
      name: wName.trim(),
      location: wLocation.trim(),
      contact: wContact.trim(),
      active: true,
    });
    setWName('');
    setWLocation('');
    setWContact('');
  }

  async function handleLinkUser(e: FormEvent) {
    e.preventDefault();
    if (!uUid.trim()) return;
    await linkExistingFirebaseUser(
      uUid,
      uEmail,
      uName || uEmail.split('@')[0] || 'Usuario',
      uRole,
      uRole === 'taller' ? uWorkshopId || null : null
    );
    setUUid('');
    setUEmail('');
    setUName('');
    setURole('taller');
    setUWorkshopId('');
  }

  function tabBtn(id: AdminTab, label: string, icon: React.ReactNode) {
    return (
      <button
        onClick={() => setTab(id)}
        className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium ${
          tab === id
            ? 'border-slate-900 text-slate-900'
            : 'border-transparent text-slate-500 hover:text-slate-800'
        }`}
      >
        {icon}
        {label}
      </button>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Panel de Administracion</h1>
          <p className="mt-1 text-sm text-slate-500">
            Control integral de catalogo maestro, reglas de equilibrio de precios, talleres, inventario y usuarios.
          </p>
        </div>

        <form
          onSubmit={handleSaveMargin}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-xs"
        >
          <Sliders className="h-4 w-4 text-slate-500" />
          <label className="text-xs font-medium text-slate-700">Margen global (+/- %):</label>
          <input
            type="number"
            min={1}
            max={50}
            value={marginInput}
            onChange={(e) => setMarginInput(e.target.value)}
            className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-center text-sm"
          />
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
          >
            Guardar
          </button>
        </form>
      </div>

      <div className="mt-6 flex flex-wrap gap-1 border-b border-slate-200">
        {tabBtn('catalogo', `Catalogo Maestro (${products.length})`, <Package className="h-4 w-4" />)}
        {tabBtn('talleres', `Talleres (${workshops.length})`, <Store className="h-4 w-4" />)}
        {tabBtn('inventario', `Inventario Global (${inventory.length})`, <Sliders className="h-4 w-4" />)}
        {tabBtn('usuarios', `Usuarios (${users.length})`, <Users className="h-4 w-4" />)}
        {tabBtn('pedidos', `Pedidos (${orders.length})`, <ClipboardList className="h-4 w-4" />)}
      </div>

      {tab === 'catalogo' && (
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <form
            onSubmit={handleCreateProduct}
            className="h-fit space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-base font-semibold text-slate-900">Nuevo Producto Maestro</h2>
            <input
              required
              placeholder="SKU (ej. FIL-001)"
              value={pSku}
              onChange={(e) => setPSku(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              required
              placeholder="Nombre del producto"
              value={pName}
              onChange={(e) => setPName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              required
              placeholder="Categoria"
              value={pCategory}
              onChange={(e) => setPCategory(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <textarea
              placeholder="Descripcion"
              rows={2}
              value={pDesc}
              onChange={(e) => setPDesc(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              placeholder="URL de imagen (opcional)"
              value={pImage}
              onChange={(e) => setPImage(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="number"
              required
              min={1}
              placeholder="Precio de referencia (CLP)"
              value={pRefPrice}
              onChange={(e) => setPRefPrice(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="number"
              min={1}
              max={50}
              placeholder="Margen especifico % (opcional)"
              value={pMarginOverride}
              onChange={(e) => setPMarginOverride(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              Crear Producto
            </button>
          </form>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">Referencia</th>
                  <th className="px-4 py-3">Banda Permitida</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => {
                  const bounds = calculatePriceBounds(
                    p.referencePrice,
                    settings.defaultMarginPercent,
                    p.marginOverride
                  );
                  return (
                    <tr key={p.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{p.name}</p>
                        <p className="text-xs text-slate-500">
                          {p.sku} - {p.category}
                        </p>
                      </td>
                      <td className="px-4 py-3 font-medium">{formatCLP(p.referencePrice)}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {formatCLP(bounds.min)} - {formatCLP(bounds.max)} (+/-
                        {Math.round(bounds.effectiveMargin * 100)}%)
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => updateMasterProduct(p.id, { active: !p.active })}
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            p.active
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {p.active ? 'Activo' : 'Inactivo'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => deleteMasterProduct(p.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'talleres' && (
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <form
            onSubmit={handleCreateWorkshop}
            className="h-fit space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-base font-semibold text-slate-900">Registrar Taller</h2>
            <input
              required
              placeholder="Nombre del taller"
              value={wName}
              onChange={(e) => setWName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              required
              placeholder="Ubicacion / Comuna"
              value={wLocation}
              onChange={(e) => setWLocation(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              required
              placeholder="Telefono o correo de contacto"
              value={wContact}
              onChange={(e) => setWContact(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              Crear Taller
            </button>
          </form>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Taller</th>
                  <th className="px-4 py-3">Ubicacion</th>
                  <th className="px-4 py-3">Contacto</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {workshops.map((w) => (
                  <tr key={w.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{w.name}</td>
                    <td className="px-4 py-3 text-slate-600">{w.location}</td>
                    <td className="px-4 py-3 text-slate-600">{w.contact}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => updateWorkshop(w.id, { active: !w.active })}
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          w.active
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {w.active ? 'Activo' : 'Suspendido'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => deleteWorkshop(w.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'inventario' && (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Taller</th>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Precio</th>
                <th className="px-4 py-3">Cumplimiento</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {inventory.map((item) => {
                const product = productMap.get(item.masterProductId);
                const valid = product
                  ? isPriceWithinBounds(
                      item.price,
                      product.referencePrice,
                      settings.defaultMarginPercent,
                      product.marginOverride
                    )
                  : false;
                return (
                  <tr key={item.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{item.workshopName}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {product ? product.name : item.masterProductId}
                    </td>
                    <td className="px-4 py-3 font-medium">{formatCLP(item.price)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          valid ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {valid ? 'En rango' : 'Fuera de rango'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{item.stock}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        {!valid && product && (
                          <button
                            onClick={() =>
                              saveInventoryItem(
                                {
                                  workshopId: item.workshopId,
                                  workshopName: item.workshopName,
                                  masterProductId: item.masterProductId,
                                  price: product.referencePrice,
                                  stock: item.stock,
                                  active: item.active,
                                },
                                item.id
                              )
                            }
                            className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                          >
                            Normalizar precio
                          </button>
                        )}
                        <button
                          onClick={() => deleteInventoryItem(item.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'usuarios' && (
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <form
            onSubmit={handleLinkUser}
            className="h-fit space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-base font-semibold text-slate-900">
              Vincular usuario de Firebase Auth
            </h2>
            <p className="text-xs text-slate-500">
              Copia el UID desde Firebase Console - Authentication para asignarle rol antes de que entre.
            </p>
            <input
              required
              placeholder="UID de Firebase Authentication"
              value={uUid}
              onChange={(e) => setUUid(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              required
              type="email"
              placeholder="Correo del usuario"
              value={uEmail}
              onChange={(e) => setUEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              placeholder="Nombre visible"
              value={uName}
              onChange={(e) => setUName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <select
              value={uRole}
              onChange={(e) => setURole(e.target.value as UserRole)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="usuario">usuario</option>
              <option value="taller">taller</option>
              <option value="admin">admin</option>
            </select>
            {uRole === 'taller' && (
              <select
                value={uWorkshopId}
                onChange={(e) => setUWorkshopId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Selecciona taller...</option>
                {workshops.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            )}
            <button
              type="submit"
              className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              Guardar usuario
            </button>
          </form>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Usuario</th>
                  <th className="px-4 py-3">Correo</th>
                  <th className="px-4 py-3">Rol</th>
                  <th className="px-4 py-3">Taller Asignado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.uid}>
                    <td className="px-4 py-3 font-medium text-slate-900">{u.displayName}</td>
                    <td className="px-4 py-3 text-slate-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        onChange={(e) =>
                          updateUserRole(u.uid, e.target.value as UserRole, u.workshopId)
                        }
                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-sm"
                      >
                        <option value="usuario">usuario</option>
                        <option value="taller">taller</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      {u.role === 'taller' ? (
                        <select
                          value={u.workshopId ?? ''}
                          onChange={(e) =>
                            updateUserRole(u.uid, 'taller', e.target.value || null)
                          }
                          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-sm"
                        >
                          <option value="">Sin asignar</option>
                          {workshops.map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-slate-400">No aplica</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'pedidos' && (
        <div className="mt-6 space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Pedido #{order.id.slice(0, 8)} - {formatCLP(order.total)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {order.userEmail} - {new Date(order.createdAt).toLocaleString()}
                  </p>
                </div>
                <select
                  value={order.status}
                  onChange={(e) => updateOrderStatus(order.id, e.target.value as OrderStatus)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium uppercase"
                >
                  <option value="pendiente">pendiente</option>
                  <option value="confirmado">confirmado</option>
                  <option value="completado">completado</option>
                  <option value="cancelado">cancelado</option>
                </select>
              </div>
              <div className="mt-3 space-y-1 text-sm text-slate-700">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>
                      {item.quantity}x {item.productName} ({item.workshopName})
                    </span>
                    <span className="font-medium">
                      {formatCLP(item.unitPrice * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {orders.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              No hay pedidos registrados.
            </div>
          )}
        </div>
      )}
    </main>
  );
}