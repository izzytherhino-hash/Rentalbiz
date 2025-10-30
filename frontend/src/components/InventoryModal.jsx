import { useState, useEffect } from 'react'
import { X, CheckCircle, Upload, Trash2, Star, GripVertical } from 'lucide-react'
import axios from 'axios'

export default function InventoryModal({ item, warehouses, categories = [], onClose, onSave }) {
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
  const [photos, setPhotos] = useState([])
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [draggedPhotoId, setDraggedPhotoId] = useState(null)

  const API_URL = 'http://localhost:8000/api'

  // Fallback categories if none provided (for backwards compatibility)
  const availableCategories = categories.length > 0 ? categories : [
    'Inflatable',
    'Concession',
    'Game',
    'Table & Chairs',
    'Party Supplies',
    'Services',
    'Tents & Canopies',
    'Other'
  ]

  // Surface types
  const surfaces = ['Grass', 'Concrete', 'Indoor', 'Dirt', 'Asphalt']

  // Fetch photos for existing item
  const fetchPhotos = async (itemId) => {
    try {
      const response = await axios.get(`${API_URL}/inventory/${itemId}/photos`)
      // Prepend full backend URL to photo URLs
      const photosWithFullUrls = response.data.map(photo => ({
        ...photo,
        image_url: photo.image_url.startsWith('http')
          ? photo.image_url
          : `http://localhost:8000${photo.image_url}`
      }))
      setPhotos(photosWithFullUrls)
    } catch (error) {
      console.error('Error fetching photos:', error)
    }
  }

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
      // Fetch photos for existing item
      fetchPhotos(item.inventory_item_id)
    } else if (warehouses.length > 0) {
      // Default to first warehouse for new items
      setFormData(prev => ({ ...prev, default_warehouse_id: warehouses[0].warehouse_id }))
      setPhotos([]) // Reset photos for new item
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

  // Photo Management Functions
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !item) return

    setUploadingPhoto(true)
    try {
      // Create form data for file upload
      const formData = new FormData()
      formData.append('file', file)

      // Upload file to backend
      const response = await axios.post(
        `${API_URL}/inventory/${item.inventory_item_id}/photos/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      )

      // Add photo to state - prepend URL with API base for display
      const photoWithFullUrl = {
        ...response.data,
        image_url: `http://localhost:8000${response.data.image_url}`
      }
      setPhotos([...photos, photoWithFullUrl])
    } catch (error) {
      console.error('Error uploading photo:', error)
      alert('Failed to upload photo. Please try again.')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handlePhotoDelete = async (photoId) => {
    if (!window.confirm('Are you sure you want to delete this photo?')) return

    try {
      await axios.delete(`${API_URL}/inventory/photos/${photoId}`)
      setPhotos(photos.filter(p => p.photo_id !== photoId))
    } catch (error) {
      console.error('Error deleting photo:', error)
      alert('Failed to delete photo')
    }
  }

  const handleSetThumbnail = async (photoId) => {
    try {
      await axios.put(`${API_URL}/inventory/photos/${photoId}`, {
        is_thumbnail: true,
      })

      // Update local state
      setPhotos(photos.map(p => ({
        ...p,
        is_thumbnail: p.photo_id === photoId,
      })))
    } catch (error) {
      console.error('Error setting thumbnail:', error)
      alert('Failed to set thumbnail')
    }
  }

  const handleDragStart = (e, photoId) => {
    setDraggedPhotoId(photoId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e, targetPhotoId) => {
    e.preventDefault()
    if (!draggedPhotoId || draggedPhotoId === targetPhotoId) {
      setDraggedPhotoId(null)
      return
    }

    const draggedIndex = photos.findIndex(p => p.photo_id === draggedPhotoId)
    const targetIndex = photos.findIndex(p => p.photo_id === targetPhotoId)

    // Reorder photos array
    const newPhotos = [...photos]
    const [draggedPhoto] = newPhotos.splice(draggedIndex, 1)
    newPhotos.splice(targetIndex, 0, draggedPhoto)

    // Update display_order for all photos
    const updatedPhotos = newPhotos.map((photo, index) => ({
      ...photo,
      display_order: index,
    }))

    setPhotos(updatedPhotos)
    setDraggedPhotoId(null)

    // Send reorder request to backend
    try {
      await axios.post(`${API_URL}/inventory/${item.inventory_item_id}/photos/reorder`,
        updatedPhotos.map(p => ({ photo_id: p.photo_id, display_order: p.display_order }))
      )
    } catch (error) {
      console.error('Error reordering photos:', error)
      alert('Failed to reorder photos')
      // Revert to original order
      fetchPhotos(item.inventory_item_id)
    }
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
              {availableCategories.map(cat => (
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Allowed Surfaces
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Select all surfaces where this item can be safely used
            </p>
            <div className="flex flex-wrap gap-2">
              {surfaces.map(surface => (
                <button
                  key={surface}
                  type="button"
                  onClick={() => handleSurfaceToggle(surface)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border-2 ${
                    formData.allowed_surfaces.includes(surface)
                      ? 'bg-yellow-400 text-gray-800 border-yellow-500'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {formData.allowed_surfaces.includes(surface) && (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    {surface.replace('_', ' ')}
                  </span>
                </button>
              ))}
            </div>
            {formData.allowed_surfaces.length === 0 && (
              <p className="text-xs text-orange-600 mt-2">
                ⚠️ Please select at least one surface type
              </p>
            )}
          </div>

          {/* Photo Gallery */}
          {item && (
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Photo Gallery
                  </label>
                  <p className="text-xs text-gray-500">
                    Drag photos to reorder. Click star to set as thumbnail.
                  </p>
                </div>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    disabled={uploadingPhoto}
                  />
                  <div className={`px-4 py-2 bg-yellow-400 text-gray-800 rounded-md hover:bg-yellow-500 transition-colors font-medium flex items-center gap-2 ${
                    uploadingPhoto ? 'opacity-50 cursor-not-allowed' : ''
                  }`}>
                    <Upload className="w-4 h-4" />
                    {uploadingPhoto ? 'Uploading...' : 'Add Photo'}
                  </div>
                </label>
              </div>

              {photos.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {photos.map((photo) => (
                    <div
                      key={photo.photo_id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, photo.photo_id)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, photo.photo_id)}
                      className={`relative group border-2 rounded-lg overflow-hidden transition-all cursor-move ${
                        photo.is_thumbnail
                          ? 'border-yellow-400 ring-2 ring-yellow-400'
                          : 'border-gray-200 hover:border-gray-300'
                      } ${draggedPhotoId === photo.photo_id ? 'opacity-50' : ''}`}
                    >
                      {/* Image */}
                      <div className="relative w-full h-48 bg-gray-100 overflow-hidden">
                        <img
                          src={photo.image_url}
                          alt={`Photo ${photo.display_order + 1}`}
                          className="w-full h-full object-cover relative z-0"
                          style={{ display: 'block' }}
                          onError={(e) => {
                            console.error('Modal photo failed to load:', photo.image_url)
                            e.target.style.display = 'none'
                            const parent = e.target.parentElement
                            parent.classList.add('flex', 'items-center', 'justify-center')
                            parent.innerHTML = `
                              <div class="text-center p-4">
                                <svg class="w-12 h-12 text-gray-400 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                                  <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd" />
                                </svg>
                                <p class="text-xs text-gray-500">Image not available</p>
                              </div>
                            `
                          }}
                        />

                        {/* Overlay Controls */}
                        <div className="absolute inset-0 group-hover:bg-yellow-400/20 transition-all z-10 pointer-events-none">
                          <div className="pointer-events-auto absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {/* Set as Thumbnail */}
                          <button
                            type="button"
                            onClick={() => handleSetThumbnail(photo.photo_id)}
                            className={`p-1.5 rounded-md transition-colors ${
                              photo.is_thumbnail
                                ? 'bg-yellow-400 text-gray-800'
                                : 'bg-white text-gray-600 hover:bg-yellow-100'
                            }`}
                            title={photo.is_thumbnail ? 'Current thumbnail' : 'Set as thumbnail'}
                          >
                            <Star className="w-4 h-4" fill={photo.is_thumbnail ? 'currentColor' : 'none'} />
                          </button>

                          {/* Delete Photo */}
                          <button
                            type="button"
                            onClick={() => handlePhotoDelete(photo.photo_id)}
                            className="p-1.5 bg-white text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Delete photo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          </div>

                          {/* Drag Handle */}
                          <div className="pointer-events-auto absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="p-1.5 bg-white text-gray-600 rounded-md">
                              <GripVertical className="w-4 h-4" />
                            </div>
                          </div>

                          {/* Thumbnail Badge */}
                          {photo.is_thumbnail && (
                            <div className="absolute bottom-2 right-2">
                              <span className="px-2 py-1 bg-yellow-400 text-gray-800 text-xs font-medium rounded-md">
                                Thumbnail
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Display Order Indicator */}
                      <div className="absolute top-2 left-2 bg-white text-gray-700 text-xs font-medium px-2 py-1 rounded-md">
                        {photo.display_order + 1}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600 mb-1">No photos yet</p>
                  <p className="text-xs text-gray-500">Click "Add Photo" to upload images</p>
                </div>
              )}
            </div>
          )}

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
