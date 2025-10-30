import { useState, useEffect } from 'react'
import {  Users, Plus, Edit, Trash2, X, RefreshCw, Clock, CheckCircle, XCircle, AlertCircle, MapPin, ChevronDown, ChevronUp } from 'lucide-react'
import { partnerAPI, warehouseLocationAPI } from '../services/api'

export default function PartnerManagement() {
  const [partners, setPartners] = useState([])
  const [syncLogs, setSyncLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState({})
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editingPartner, setEditingPartner] = useState(null)
  const [expandedPartners, setExpandedPartners] = useState({})
  const [partnerForm, setPartnerForm] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    website_url: '',
    status: 'active',
    integration_type: 'web_scraping',
    commission_rate: 0,
    markup_percentage: 0,
    notes: ''
  })

  useEffect(() => {
    fetchPartners()
    fetchSyncLogs()
  }, [])

  const fetchPartners = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await partnerAPI.listPartners()
      setPartners(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchSyncLogs = async () => {
    try {
      const logs = await partnerAPI.getSyncLogs(null, 10)
      setSyncLogs(logs)
    } catch (err) {
      console.error('Failed to fetch sync logs:', err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      if (editingPartner) {
        await partnerAPI.updatePartner(editingPartner.partner_id, partnerForm)
        setSuccess('Partner updated successfully')
      } else {
        await partnerAPI.createPartner(partnerForm)
        setSuccess('Partner created successfully')
      }

      await fetchPartners()
      handleCloseModal()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (partner) => {
    setEditingPartner(partner)
    setPartnerForm({
      name: partner.name,
      contact_person: partner.contact_person || '',
      email: partner.email || '',
      phone: partner.phone || '',
      website_url: partner.website_url || '',
      status: partner.status,
      integration_type: partner.integration_type,
      commission_rate: partner.commission_rate || 0,
      markup_percentage: partner.markup_percentage || 0,
      notes: partner.notes || ''
    })
    setShowModal(true)
  }

  const handleDelete = async (partnerId) => {
    if (!confirm('Are you sure you want to delete this partner? This will also delete all associated warehouse locations and inventory items.')) {
      return
    }

    setError(null)
    setSuccess(null)
    try {
      await partnerAPI.deletePartner(partnerId)
      setSuccess('Partner deleted successfully')
      await fetchPartners()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleSyncInventory = async (partnerId) => {
    setSyncing(prev => ({ ...prev, [partnerId]: true }))
    setError(null)
    setSuccess(null)

    try {
      const result = await partnerAPI.syncInventory(partnerId)
      setSuccess(`Sync completed: ${result.items_added} items added, ${result.items_updated} items updated`)
      await fetchSyncLogs()
    } catch (err) {
      setError(`Sync failed: ${err.message}`)
    } finally {
      setSyncing(prev => ({ ...prev, [partnerId]: false }))
    }
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingPartner(null)
    setPartnerForm({
      name: '',
      contact_person: '',
      email: '',
      phone: '',
      website_url: '',
      status: 'active',
      integration_type: 'web_scraping',
      commission_rate: 0,
      markup_percentage: 0,
      notes: ''
    })
  }

  const getStatusBadge = (status) => {
    const colors = {
      active: 'bg-yellow-100 text-yellow-800',
      prospecting: 'bg-blue-100 text-blue-800',
      paused: 'bg-yellow-100 text-yellow-800',
      inactive: 'bg-gray-100 text-gray-800'
    }
    return colors[status] || colors.active
  }

  const getSyncStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-yellow-600" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />
      case 'partial':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />
      default:
        return <Clock className="w-4 h-4 text-gray-600" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-100 rounded-lg">
            <Users className="w-6 h-6 text-yellow-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Partner Management</h2>
            <p className="text-sm text-gray-600">Manage rental partners and inventory sync</p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-400 text-gray-800 rounded-lg hover:bg-yellow-500 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Partner
        </button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
          {success}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      {/* Partners List */}
      {loading && partners.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading partners...</p>
        </div>
      ) : partners.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">No partners yet</p>
          <p className="text-sm text-gray-500">Add your first rental partner to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {partners.map((partner) => (
            <div key={partner.partner_id} className="bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="p-6">
                {/* Partner Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">{partner.name}</h3>
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(partner.status)}`}>
                      {partner.status}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(partner)}
                      className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                      title="Edit partner"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(partner.partner_id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete partner"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Partner Details */}
                <div className="space-y-2 text-sm mb-4">
                  {partner.contact_person && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Contact:</span>
                      <span className="text-gray-900 font-medium">{partner.contact_person}</span>
                    </div>
                  )}
                  {partner.email && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Email:</span>
                      <span className="text-gray-900 text-xs">{partner.email}</span>
                    </div>
                  )}
                  {partner.website_url && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Website:</span>
                      <a
                        href={partner.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-yellow-600 hover:underline text-xs"
                      >
                        Visit site
                      </a>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Integration:</span>
                    <span className="text-gray-900 font-medium capitalize">
                      {partner.integration_type.replace('_', ' ')}
                    </span>
                  </div>
                  {partner.last_sync_at && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Last Sync:</span>
                      <span className="text-gray-900 text-xs">
                        {new Date(partner.last_sync_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Sync Button */}
                {partner.integration_type === 'web_scraping' && (
                  <button
                    onClick={() => handleSyncInventory(partner.partner_id)}
                    disabled={syncing[partner.partner_id]}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-yellow-400 text-gray-800 rounded-lg hover:bg-yellow-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    <RefreshCw className={`w-4 h-4 ${syncing[partner.partner_id] ? 'animate-spin' : ''}`} />
                    {syncing[partner.partner_id] ? 'Syncing...' : 'Sync Inventory'}
                  </button>
                )}

                {/* Warehouse Locations Section */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setExpandedPartners(prev => ({
                      ...prev,
                      [partner.partner_id]: !prev[partner.partner_id]
                    }))}
                    className="w-full flex items-center justify-between text-sm font-medium text-gray-700 hover:text-yellow-600 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>Warehouse Locations</span>
                    </div>
                    {expandedPartners[partner.partner_id] ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>

                  {expandedPartners[partner.partner_id] && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-gray-600 text-center">
                        Warehouse location management coming soon!
                      </p>
                      <p className="text-xs text-gray-500 text-center mt-1">
                        Full CRUD operations for partner warehouse locations will be available here.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent Sync Logs */}
      {syncLogs.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Recent Sync Activity</h3>
          <div className="space-y-3">
            {syncLogs.slice(0, 5).map((log) => {
              const partner = partners.find(p => p.partner_id === log.partner_id)
              return (
                <div key={log.sync_log_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {getSyncStatusIcon(log.status)}
                    <div>
                      <p className="text-sm font-medium text-gray-900">{partner?.name || 'Unknown Partner'}</p>
                      <p className="text-xs text-gray-600">
                        {log.items_added} added, {log.items_updated} updated
                        {log.error_message && ` - ${log.error_message}`}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(log.sync_started_at).toLocaleString()}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Partner Form Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto mx-4">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingPartner ? 'Edit Partner' : 'Add Partner'}
              </h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Partner Name *
                </label>
                <input
                  type="text"
                  required
                  value={partnerForm.name}
                  onChange={(e) => setPartnerForm({ ...partnerForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                  placeholder="Create A Party Rentals"
                />
              </div>

              {/* Contact Person */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Person
                </label>
                <input
                  type="text"
                  value={partnerForm.contact_person}
                  onChange={(e) => setPartnerForm({ ...partnerForm, contact_person: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                  placeholder="John Smith"
                />
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={partnerForm.email}
                    onChange={(e) => setPartnerForm({ ...partnerForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                    placeholder="contact@partner.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={partnerForm.phone}
                    onChange={(e) => setPartnerForm({ ...partnerForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                    placeholder="555-1234"
                  />
                </div>
              </div>

              {/* Website URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website URL
                </label>
                <input
                  type="url"
                  value={partnerForm.website_url}
                  onChange={(e) => setPartnerForm({ ...partnerForm, website_url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                  placeholder="https://example.com"
                />
              </div>

              {/* Status & Integration Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={partnerForm.status}
                    onChange={(e) => setPartnerForm({ ...partnerForm, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                  >
                    <option value="prospecting">Prospecting</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Integration Type
                  </label>
                  <select
                    value={partnerForm.integration_type}
                    onChange={(e) => setPartnerForm({ ...partnerForm, integration_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                  >
                    <option value="manual">Manual</option>
                    <option value="web_scraping">Web Scraping</option>
                    <option value="api">API</option>
                  </select>
                </div>
              </div>

              {/* Commission Rate & Markup Percentage */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Commission Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={partnerForm.commission_rate}
                    onChange={(e) => setPartnerForm({ ...partnerForm, commission_rate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                    placeholder="15.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Markup Percentage (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={partnerForm.markup_percentage}
                    onChange={(e) => setPartnerForm({ ...partnerForm, markup_percentage: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                    placeholder="25.00"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={partnerForm.notes}
                  onChange={(e) => setPartnerForm({ ...partnerForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                  placeholder="Additional notes about this partner..."
                />
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-yellow-400 text-gray-800 rounded-lg hover:bg-yellow-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Saving...' : editingPartner ? 'Update Partner' : 'Create Partner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
