import { useState, useEffect } from 'react'
import { Lightbulb, ThumbsUp, ThumbsDown, Play, Loader, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { phineasAPI } from '../services/api'

export default function PhineasSuggestions({ onRefreshDashboard }) {
  const [proposals, setProposals] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [actionInProgress, setActionInProgress] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  const [scanning, setScanning] = useState(false)

  useEffect(() => {
    fetchProposals()
  }, [])

  const fetchProposals = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await phineasAPI.getProposals('pending', null, 10)
      setProposals(data)
    } catch (err) {
      console.error('Failed to fetch proposals:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleScanAssignments = async () => {
    setScanning(true)
    setError(null)
    setSuccessMessage(null)
    try {
      const result = await phineasAPI.scanAssignments()
      setSuccessMessage(`Created ${result.proposals_created} new proposals`)
      // Refresh the proposals list
      await fetchProposals()
      // Refresh the parent dashboard to update unassigned count
      if (onRefreshDashboard) {
        onRefreshDashboard()
      }
    } catch (err) {
      console.error('Failed to scan assignments:', err)
      setError(err.message)
    } finally {
      setScanning(false)
    }
  }

  const handleApprove = async (proposalId) => {
    setActionInProgress(proposalId)
    setError(null)
    try {
      await phineasAPI.approveProposal(proposalId)
      setSuccessMessage('Proposal approved')
      await fetchProposals()
    } catch (err) {
      console.error('Failed to approve proposal:', err)
      setError(err.message)
    } finally {
      setActionInProgress(null)
      setTimeout(() => setSuccessMessage(null), 3000)
    }
  }

  const handleReject = async (proposalId) => {
    setActionInProgress(proposalId)
    setError(null)
    try {
      await phineasAPI.rejectProposal(proposalId)
      setSuccessMessage('Proposal rejected')
      await fetchProposals()
    } catch (err) {
      console.error('Failed to reject proposal:', err)
      setError(err.message)
    } finally {
      setActionInProgress(null)
      setTimeout(() => setSuccessMessage(null), 3000)
    }
  }

  const handleExecute = async (proposalId) => {
    setActionInProgress(proposalId)
    setError(null)
    try {
      const result = await phineasAPI.executeProposal(proposalId)
      setSuccessMessage(result.message)
      await fetchProposals()
      // Refresh the parent dashboard
      if (onRefreshDashboard) {
        onRefreshDashboard()
      }
    } catch (err) {
      console.error('Failed to execute proposal:', err)
      setError(err.message)
    } finally {
      setActionInProgress(null)
      setTimeout(() => setSuccessMessage(null), 3000)
    }
  }

  const getConfidenceColor = (score) => {
    if (score >= 0.8) return 'text-green-600'
    if (score >= 0.6) return 'text-yellow-600'
    return 'text-orange-600'
  }

  const getConfidenceLabel = (score) => {
    if (score >= 0.8) return 'High'
    if (score >= 0.6) return 'Medium'
    return 'Low'
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Lightbulb className="w-5 h-5 text-yellow-500 mr-2" />
          <h2 className="text-lg font-medium text-gray-900">Phineas Suggestions</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchProposals}
            disabled={loading}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleScanAssignments}
            disabled={scanning}
            className="px-3 py-1 bg-yellow-400 text-gray-800 rounded hover:bg-yellow-500 transition disabled:opacity-50 text-sm font-medium flex items-center gap-1"
          >
            {scanning ? (
              <>
                <Loader className="w-3 h-3 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Play className="w-3 h-3" />
                Scan for Assignments
              </>
            )}
          </button>
        </div>
      </div>

      {/* Success message */}
      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded flex items-center text-sm text-green-800">
          <CheckCircle className="w-4 h-4 mr-2" />
          {successMessage}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded flex items-center text-sm text-red-800">
          <XCircle className="w-4 h-4 mr-2" />
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && proposals.length === 0 && (
        <div className="flex items-center justify-center py-8 text-gray-500">
          <Loader className="w-5 h-5 animate-spin mr-2" />
          Loading proposals...
        </div>
      )}

      {/* Empty state */}
      {!loading && proposals.length === 0 && (
        <div className="text-center py-8">
          <Lightbulb className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No pending suggestions</p>
          <p className="text-gray-400 text-xs mt-1">
            Click &quot;Scan for Assignments&quot; to let Phineas analyze unassigned trips
          </p>
        </div>
      )}

      {/* Proposals list */}
      {!loading && proposals.length > 0 && (
        <div className="space-y-4">
          {proposals.map((proposal) => (
            <div
              key={proposal.proposal_id}
              className="border border-gray-200 rounded-lg p-4 hover:border-yellow-300 transition"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 text-sm mb-1">
                    {proposal.title}
                  </h3>
                  <p className="text-xs text-gray-600 mb-2">{proposal.description}</p>
                </div>
                <div className="ml-3">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getConfidenceColor(proposal.confidence_score)}`}
                  >
                    {getConfidenceLabel(proposal.confidence_score)} ({Math.round(proposal.confidence_score * 100)}%)
                  </span>
                </div>
              </div>

              {/* Reasoning */}
              <div className="bg-gray-50 rounded p-3 mb-3">
                <p className="text-xs text-gray-700">
                  <span className="font-medium">Reasoning: </span>
                  {proposal.reasoning}
                </p>
              </div>

              {/* Action details */}
              {proposal.action_data && (
                <div className="text-xs text-gray-600 mb-3 space-y-1">
                  {proposal.action_data.order_number && (
                    <div>
                      <span className="font-medium">Order: </span>
                      {proposal.action_data.order_number}
                    </div>
                  )}
                  {proposal.action_data.customer_name && (
                    <div>
                      <span className="font-medium">Customer: </span>
                      {proposal.action_data.customer_name}
                    </div>
                  )}
                  {proposal.action_data.driver_name && (
                    <div>
                      <span className="font-medium">Recommended Driver: </span>
                      {proposal.action_data.driver_name}
                    </div>
                  )}
                  {proposal.action_data.distance && (
                    <div>
                      <span className="font-medium">Distance: </span>
                      {proposal.action_data.distance.toFixed(1)} km
                    </div>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                {proposal.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleApprove(proposal.proposal_id)}
                      disabled={actionInProgress === proposal.proposal_id}
                      className="flex-1 px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition disabled:opacity-50 text-xs font-medium flex items-center justify-center gap-1"
                    >
                      {actionInProgress === proposal.proposal_id ? (
                        <Loader className="w-3 h-3 animate-spin" />
                      ) : (
                        <>
                          <ThumbsUp className="w-3 h-3" />
                          Approve
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleReject(proposal.proposal_id)}
                      disabled={actionInProgress === proposal.proposal_id}
                      className="flex-1 px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition disabled:opacity-50 text-xs font-medium flex items-center justify-center gap-1"
                    >
                      {actionInProgress === proposal.proposal_id ? (
                        <Loader className="w-3 h-3 animate-spin" />
                      ) : (
                        <>
                          <ThumbsDown className="w-3 h-3" />
                          Reject
                        </>
                      )}
                    </button>
                  </>
                )}
                {proposal.status === 'approved' && (
                  <button
                    onClick={() => handleExecute(proposal.proposal_id)}
                    disabled={actionInProgress === proposal.proposal_id}
                    className="flex-1 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition disabled:opacity-50 text-xs font-medium flex items-center justify-center gap-1"
                  >
                    {actionInProgress === proposal.proposal_id ? (
                      <Loader className="w-3 h-3 animate-spin" />
                    ) : (
                      <>
                        <Play className="w-3 h-3" />
                        Execute
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
