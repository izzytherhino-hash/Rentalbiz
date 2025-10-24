import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Loader } from 'lucide-react'
import { chatbotAPI } from '../services/api'

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hi! I\'m your Partay business assistant. Ask me anything about your customers, bookings, inventory, or drivers!',
    },
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const messagesEndRef = useRef(null)

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!inputMessage.trim() || isLoading) return

    const userMessage = inputMessage.trim()
    setInputMessage('')
    setError(null)

    // Add user message to chat
    const newMessages = [...messages, { role: 'user', content: userMessage }]
    setMessages(newMessages)
    setIsLoading(true)

    try {
      // Send message to backend
      const response = await chatbotAPI.sendMessage(
        userMessage,
        messages.filter(m => m.role !== 'system') // Don't include system messages in history
      )

      // Add AI response to chat
      setMessages([...newMessages, { role: 'assistant', content: response.response }])
    } catch (err) {
      console.error('Chatbot error:', err)

      // Check if it's an API key error
      if (err.message.includes('API key not configured')) {
        setError('AI chatbot is not configured. Please add your Anthropic API key to backend/.env')
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
        content: 'Hi! I\'m your Partay business assistant. Ask me anything about your customers, bookings, inventory, or drivers!',
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
              <h3 className="font-medium">Business Assistant</h3>
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
        className="bg-yellow-400 text-gray-800 rounded-full p-4 shadow-lg hover:bg-yellow-500 transition-all hover:scale-110"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <MessageCircle className="w-6 h-6" />
        )}
      </button>
    </div>
  )
}
