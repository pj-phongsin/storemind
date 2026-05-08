import { useState } from 'react'
import { useFetch } from '../hooks/useFetch'

const CATEGORIES = ['AIRism', 'Heattech', 'Outerwear', 'Tops']

export default function InventoryPage() {
  const [category, setCategory] = useState('')
  const [lowOnly, setLowOnly]   = useState(false)

  let query = '/api/inventory?'
  if (category) query += `category=${category}&`
  if (lowOnly)  query += `low_stock=true`

  const { data, loading, error } = useFetch(query)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Inventory</h2>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={lowOnly} onChange={e => setLowOnly(e.target.checked)} className="accent-red-500" />
            Low stock only
          </label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {loading && <p className="text-gray-500">Loading...</p>}
      {error   && <p className="text-red-500">Error: {error}</p>}

      {!loading && data && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-5 py-3 text-left">Product</th>
                <th className="px-5 py-3 text-left">SKU</th>
                <th className="px-5 py-3 text-left">Category</th>
                <th className="px-5 py-3 text-right">Price</th>
                <th className="px-5 py-3 text-right">On Hand</th>
                <th className="px-5 py-3 text-right">Reorder Point</th>
                <th className="px-5 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map(row => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-800">{row.name}</td>
                  <td className="px-5 py-3 text-gray-500">{row.sku}</td>
                  <td className="px-5 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">{row.category}</span>
                  </td>
                  <td className="px-5 py-3 text-right">${row.unit_price}</td>
                  <td className="px-5 py-3 text-right font-semibold">{row.quantity_on_hand}</td>
                  <td className="px-5 py-3 text-right text-gray-500">{row.reorder_point}</td>
                  <td className="px-5 py-3 text-center">
                    {row.needs_reorder
                      ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">Reorder</span>
                      : <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-600">OK</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
