import { useEffect, useState, useRef } from 'react'
import { RetellWebClient } from 'retell-client-js-sdk'
import './App.css'

// Agent ID loaded from environment variable
const AGENT_ID = import.meta.env.VITE_AGENT_ID

interface Transcript {
  role: 'agent' | 'user'
  content: string
}

function App() {
  const [isCalling, setIsCalling] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [agentTalking, setAgentTalking] = useState(false)
  const [transcripts, setTranscripts] = useState<Transcript[]>([])
  const [error, setError] = useState<string | null>(null)

  const retellClientRef = useRef<RetellWebClient | null>(null)
  const transcriptsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Initialize Retell Web Client
    const retellClient = new RetellWebClient()
    retellClientRef.current = retellClient

    // Set up event listeners
    retellClient.on('call_started', () => {
      console.log('Call started')
      setIsCalling(true)
      setIsConnecting(false)
      setError(null)
    })

    retellClient.on('call_ended', () => {
      console.log('Call ended')
      setIsCalling(false)
      setIsConnecting(false)
      setAgentTalking(false)
    })

    retellClient.on('agent_start_talking', () => {
      console.log('Agent started talking')
      setAgentTalking(true)
    })

    retellClient.on('agent_stop_talking', () => {
      console.log('Agent stopped talking')
      setAgentTalking(false)
    })

    retellClient.on('update', (update) => {
      // Update contains the transcript
      if (update.transcript) {
        const newTranscripts: Transcript[] = update.transcript.map((t: { role: string; content: string }) => ({
          role: t.role as 'agent' | 'user',
          content: t.content
        }))
        setTranscripts(newTranscripts)
      }
    })

    retellClient.on('error', (err) => {
      console.error('Retell error:', err)
      setError(err.message || 'An error occurred')
      setIsCalling(false)
      setIsConnecting(false)
    })

    return () => {
      // Cleanup on unmount
      retellClient.stopCall()
    }
  }, [])

  // Auto-scroll transcripts
  useEffect(() => {
    transcriptsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcripts])

  const registerCall = async (): Promise<string> => {
    // Call your backend to register the web call and get access token
    const response = await fetch('/api/create-web-call', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent_id: AGENT_ID,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to register call')
    }

    const data = await response.json()
    return data.access_token
  }

  const startCall = async () => {
    if (!retellClientRef.current) return

    setIsConnecting(true)
    setError(null)
    setTranscripts([])

    try {
      const accessToken = await registerCall()

      await retellClientRef.current.startCall({
        accessToken,
        sampleRate: 24000,
        captureDeviceId: 'default',
      })
    } catch (err) {
      console.error('Failed to start call:', err)
      setError(err instanceof Error ? err.message : 'Failed to start call')
      setIsConnecting(false)
    }
  }

  const endCall = () => {
    if (retellClientRef.current) {
      retellClientRef.current.stopCall()
    }
  }

  const toggleCall = () => {
    if (isCalling) {
      endCall()
    } else {
      startCall()
    }
  }

  return (
    <div className="app">
      <div className="container">
        <h1 className="title">Voice Agent</h1>
        <p className="subtitle">Powered by Retell.ai</p>

        {/* Voice Visualization */}
        <div className={`voice-circle ${isCalling ? 'active' : ''} ${agentTalking ? 'talking' : ''}`}>
          <div className="pulse-ring"></div>
          <div className="pulse-ring delay-1"></div>
          <div className="pulse-ring delay-2"></div>
          <div className="inner-circle">
            {isConnecting ? (
              <span className="status-text">Connecting...</span>
            ) : isCalling ? (
              <span className="status-text">{agentTalking ? 'Agent Speaking' : 'Listening...'}</span>
            ) : (
              <span className="status-text">Ready</span>
            )}
          </div>
        </div>

        {/* Control Button */}
        <button
          className={`call-button ${isCalling ? 'end' : 'start'}`}
          onClick={toggleCall}
          disabled={isConnecting}
        >
          {isConnecting ? 'Connecting...' : isCalling ? 'End Call' : 'Start Call'}
        </button>

        {/* Error Message */}
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* Transcript Display */}
        {transcripts.length > 0 && (
          <div className="transcript-container">
            <h3>Conversation</h3>
            <div className="transcripts">
              {transcripts.map((t, index) => (
                <div key={index} className={`transcript-item ${t.role}`}>
                  <span className="role">{t.role === 'agent' ? 'Agent' : 'You'}:</span>
                  <span className="content">{t.content}</span>
                </div>
              ))}
              <div ref={transcriptsEndRef} />
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="instructions">
          <p>Click "Start Call" to begin a voice conversation with the AI agent.</p>
          <p>Make sure to allow microphone access when prompted.</p>
        </div>
      </div>
    </div>
  )
}

export default App
