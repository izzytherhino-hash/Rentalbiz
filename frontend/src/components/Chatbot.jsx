import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Loader, Lightbulb, ArrowUp } from 'lucide-react'
import { chatbotAPI, phineasAPI } from '../services/api'

export default function Chatbot({ onDataChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hi! I\'m Phineas, your AI operations manager. I can help answer questions, analyze your business, and propose automated actions to optimize operations. What can I help you with?',
    },
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [pendingProposals, setPendingProposals] = useState([])
  const [loadingProposals, setLoadingProposals] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Fetch pending proposals when chat opens
  useEffect(() => {
    if (isOpen) {
      fetchPendingProposals()
      // Focus input when chat opens
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  const fetchPendingProposals = async () => {
    setLoadingProposals(true)
    try {
      const data = await phineasAPI.getProposals('pending', null, 10)
      setPendingProposals(data)
    } catch (err) {
      console.error('Failed to fetch pending proposals:', err)
      // Silently fail - don't show error for this background fetch
    } finally {
      setLoadingProposals(false)
    }
  }

  const scrollToSuggestions = () => {
    // Close the chat and scroll to top of page where suggestions are
    setIsOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    console.log('🎯 handleSendMessage called')
    console.log('  inputMessage:', inputMessage)
    console.log('  isLoading:', isLoading)

    if (!inputMessage.trim() || isLoading) {
      console.log('❌ Early return - empty input or loading')
      return
    }

    const userMessage = inputMessage.trim()
    setInputMessage('')
    setError(null)

    // Add user message to chat
    const newMessages = [...messages, { role: 'user', content: userMessage }]
    setMessages(newMessages)
    setIsLoading(true)

    console.log('📤 About to call chatbotAPI.sendMessage')
    console.log('  Message:', userMessage)
    console.log('  History length:', messages.filter(m => m.role !== 'system').length)

    try {
      // Send message to backend
      console.log('🌐 Calling API...')
      const response = await chatbotAPI.sendMessage(
        userMessage,
        messages.filter(m => m.role !== 'system') // Don't include system messages in history
      )
      console.log('✅ API response received:', response)

      // Add AI response to chat
      setMessages([...newMessages, { role: 'assistant', content: response.response }])

      // Trigger data refresh if callback provided
      if (onDataChange) {
        onDataChange()
      }

      // Focus input after response
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    } catch (err) {
      console.error('Chatbot error:', err)

      // Check if it's an API key error
      if (err.message.includes('API key not configured')) {
        setError('Phineas is not configured. Please add your Anthropic API key to backend/.env')
      } else {
        setError(`Failed to get response: ${err.message}`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: 'Hi! I\'m Phineas, your AI operations manager. I can help answer questions, analyze your business, and propose automated actions to optimize operations. What can I help you with?',
      },
    ])
    setError(null)
  }

  // Suggested questions
  const suggestedQuestions = [
    'How many bookings do I have today?',
    'Which items are most popular?',
    'Show me unassigned bookings',
    'What are my total earnings?',
  ]

  const handleSuggestedQuestion = (question) => {
    setInputMessage(question)
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Chat Window */}
      {isOpen && (
        <div className="bg-white rounded-lg shadow-2xl border border-gray-200 mb-4 w-96 max-h-[600px] flex flex-col">
          {/* Header */}
          <div className="bg-yellow-400 text-gray-800 px-4 py-3 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center">
              <MessageCircle className="w-5 h-5 mr-2" />
              <h3 className="font-medium">Phineas AI</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleClearChat}
                className="text-xs text-gray-700 hover:text-gray-900 transition px-2 py-1 hover:bg-yellow-300 rounded"
              >
                Clear
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="hover:bg-yellow-300 rounded p-1 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] max-h-[400px]">
            {/* Pending proposals notification */}
            {!loadingProposals && pendingProposals.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-yellow-800 font-medium mb-1">
                    {pendingProposals.length} pending suggestion{pendingProposals.length !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-yellow-700 mb-2">
                    I've found {pendingProposals.length} optimization{pendingProposals.length !== 1 ? 's' : ''} that need{pendingProposals.length === 1 ? 's' : ''} your review!
                  </p>
                  <button
                    onClick={scrollToSuggestions}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-400 text-gray-800 rounded text-xs font-medium hover:bg-yellow-500 transition"
                  >
                    <ArrowUp className="w-3 h-3" />
                    View Suggestions
                  </button>
                </div>
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === 'user'
                      ? 'bg-yellow-400 text-gray-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-800 rounded-lg px-4 py-2">
                  <Loader className="w-4 h-4 animate-spin" />
                </div>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}

            {/* Suggested questions (show only when chat is empty) */}
            {messages.length === 1 && !isLoading && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 font-medium">Suggested questions:</p>
                <div className="grid grid-cols-1 gap-2">
                  {suggestedQuestions.map((question, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestedQuestion(question)}
                      className="text-left text-xs text-gray-600 bg-gray-50 hover:bg-gray-100 rounded px-3 py-2 transition border border-gray-200"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSendMessage} className="border-t border-gray-200 p-3">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask about your business..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-sm"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isLoading}
                className="bg-yellow-400 text-gray-800 px-4 py-2 rounded-lg hover:bg-yellow-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-yellow-400 text-gray-800 rounded-full p-4 shadow-lg hover:bg-yellow-500 transition-all hover:scale-110 relative"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <>
            <MessageCircle className="w-6 h-6" />
            {/* Notification badge for pending proposals */}
            {!loadingProposals && pendingProposals.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {pendingProposals.length}
              </span>
            )}
          </>
        )}
      </button>
    </div>
  )
}
