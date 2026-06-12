import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useOnboardingSaga } from './hooks/useOnboardingSaga'
import { OnboardingStepper } from './components/OnboardingStepper'
import { SimulatorPanel } from './components/SimulatorPanel'
import { useSagaStore } from './store/sagaStore'

const queryClient = new QueryClient()

function OnboardingApp() {
  const [email, setEmail] = useState('')
  const { saga, startOnboarding, isStarting, executeStep, isExecuting, reset } =
    useOnboardingSaga()
  const { sagaId } = useSagaStore()

  const handleStart = () => {
    if (!email.trim()) return
    startOnboarding(email.trim())
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            SAGA Onboarding POC
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Distributed transaction orchestration with automatic compensation
          </p>
        </div>

        {!sagaId ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                placeholder="you@example.com"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={handleStart}
              disabled={isStarting || !email.trim()}
              className="w-full py-2 px-4 bg-blue-600 text-white text-sm font-medium
                         rounded-lg hover:bg-blue-700 disabled:opacity-50
                         disabled:cursor-not-allowed transition-colors"
            >
              {isStarting ? 'Starting...' : 'Start onboarding'}
            </button>
          </div>
        ) : (
          <>
            {saga && (
              <>
                <OnboardingStepper saga={saga} />
                <SimulatorPanel
                  saga={saga}
                  onExecuteStep={executeStep}
                  isExecuting={isExecuting}
                />
              </>
            )}

            <div className="text-center">
              <button
                onClick={reset}
                className="text-sm text-gray-400 hover:text-gray-600 underline
                           underline-offset-2 transition-colors"
              >
                Start over
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <OnboardingApp />
    </QueryClientProvider>
  )
}