import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

export default function InventoryModal({ item, warehouses, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    base_price: '',
    image_url: '',
    website_visible: true,
    requires_power: false,
    min_space_sqft: '',
    allowed_surfaces: [],
    default_warehouse_id: '',
  })

  const [errors, setErrors] = useState({})

  // Categories for dropdown
  const categories = [
    'Inflatable',
    'Concession',
    'Game',
    'Table & Chairs',
    'Party Supplies',
    'Other'
  ]

  // Surface types
  const surfaces = ['Grass', 'Concrete', 'Indoor', 'Dirt', 'Asphalt']

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        category: item.category || '',
        description: item.description || '',
        base_price: item.base_price || '',
        image_url: item.image_url || '',
        website_visible: item.website_visible !== undefined ? item.website_visible : true,
        requires_power: item.requires_power || false,
        min_space_sqft: item.min_space_sqft || '',
        allowed_surfaces: item.allowed_surfaces || [],
        default_warehouse_id: item.default_warehouse_id || '',
      })
    } else if (warehouses.length > 0) {
      // Default to first warehouse for new items
      setFormData(prev => ({ ...prev, default_warehouse_id: warehouses[0].warehouse_id }))
    }
  }, [item, warehouses])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }))
    }
  }

  const handleSurfaceToggle = (surface) => {
    setFormData(prev => ({
      ...prev,
      allowed_surfaces: prev.allowed_surfaces.includes(surface)
        ? prev.allowed_surfaces.filter(s => s !== surface)
        : [...prev.allowed_surfaces, surface]
    }))
  }

  const validate = () => {
    const newErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!formData.category) {
      newErrors.category = 'Category is required'
    }

    if (!formData.base_price || parseFloat(formData.base_price) <= 0) {
      newErrors.base_price = 'Price must be greater than 0'
    }

    if (!formData.default_warehouse_id) {
      newErrors.default_warehouse_id = 'Warehouse is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    // Convert base_price to number
    const submitData = {
      ...formData,
      base_price: parseFloat(formData.base_price),
      min_space_sqft: formData.min_space_sqft ? parseInt(formData.min_space_sqft) : null,
    }

    onSave(submitData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-2xl w-full my-8">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-lg">
          <h2 className="font-serif text-2xl font-light text-gray-800">
            {item ? 'Edit Inventory Item' : 'Add Inventory Item'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Item Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-yellow-400 focus:border-transparent ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., Super Bounce House"
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category *
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-yellow-400 focus:border-transparent ${
                errors.category ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select a category</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
              placeholder="Detailed description for customers..."
            />
          </div>

          {/* Base Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Base Price (per day) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                type="number"
                name="base_price"
                value={formData.base_price}
                onChange={handleChange}
                step="0.01"
                min="0"
                className={`w-full pl-8 pr-3 py-2 border rounded-md focus:ring-2 focus:ring-yellow-400 focus:border-transparent ${
                  errors.base_price ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="250.00"
              />
            </div>
            {errors.base_price && <p className="text-red-500 text-sm mt-1">{errors.base_price}</p>}
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Image URL
            </label>
            <input
              type="text"
              name="image_url"
              value={formData.image_url}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
              placeholder="/uploads/item-photo.jpg"
            />
          </div>

          {/* Warehouse */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Default Warehouse *
            </label>
            <select
              name="default_warehouse_id"
              value={formData.default_warehouse_id}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-yellow-400 focus:border-transparent ${
                errors.default_warehouse_id ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select a warehouse</option>
              {warehouses.map(warehouse => (
                <option key={warehouse.warehouse_id} value={warehouse.warehouse_id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
            {errors.default_warehouse_id && <p className="text-red-500 text-sm mt-1">{errors.default_warehouse_id}</p>}
          </div>

          {/* Requires Power */}
          <div className="flex items-center">
            <input
              type="checkbox"
              name="requires_power"
              checked={formData.requires_power}
              onChange={handleChange}
              className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-700">
              Requires Power Outlet
            </label>
          </div>

          {/* Website Visible */}
          <div className="flex items-center">
            <input
              type="checkbox"
              name="website_visible"
              checked={formData.website_visible}
              onChange={handleChange}
              className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-700">
              Show on Customer Website
            </label>
          </div>

          {/* Min Space */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Minimum Space (sq ft)
            </label>
            <input
              type="number"
              name="min_space_sqft"
              value={formData.min_space_sqft}
              onChange={handleChange}
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
              placeholder="400"
            />
          </div>

          {/* Allowed Surfaces */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Allowed Surfaces
            </label>
            <div className="flex flex-wrap gap-2">
              {surfaces.map(surface => (
                <button
                  key={surface}
                  type="button"
                  onClick={() => handleSurfaceToggle(surface)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    formData.allowed_surfaces.includes(surface)
                      ? 'bg-yellow-400 text-gray-800'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {surface}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-yellow-400 text-gray-800 rounded-md hover:bg-yellow-500 transition-colors font-medium"
            >
              {item ? 'Update Item' : 'Create Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
