import { useState } from 'react'
import { SagaExecution, STEP_LABELS } from '../lib/types'

interface Props {
  saga: SagaExecution
  onExecuteStep: (params: { stepName: string; forceFail?: boolean }) => void
  isExecuting: boolean
}

const EXECUTABLE_STATES = ['PENDING', 'RUNNING']

export function SimulatorPanel({ saga, onExecuteStep, isExecuting }: Props) {
  const [forceFailStep, setForceFailStep] = useState<string | null>(null)

  const isSagaTerminal = ['COMPLETED', 'FAILED'].includes(saga.status)

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-5 py-3 border-b bg-gray-50">
        <h2 className="text-sm font-semibold text-gray-700">Simulator panel</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Execute steps manually or force a failure to trigger compensation
        </p>
      </div>

      <div className="divide-y divide-gray-100">
        {saga.steps.map((step) => {
          const isExecutable = EXECUTABLE_STATES.includes(step.status)
          const isThisStepExecuting = isExecuting
          const willFail = forceFailStep === step.stepName

          return (
            <div key={step.id} className="px-5 py-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {STEP_LABELS[step.stepName] ?? step.stepName}
                </p>
                <p className="text-xs text-gray-400 font-mono mt-0.5">
                  {step.stepName}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="w-3.5 h-3.5 accent-red-500"
                    disabled={!isExecutable || isSagaTerminal}
                    checked={willFail}
                    onChange={(e) =>
                      setForceFailStep(e.target.checked ? step.stepName : null)
                    }
                  />
                  <span className="text-xs text-gray-500">Force fail</span>
                </label>

                <button
                  disabled={!isExecutable || isSagaTerminal || isThisStepExecuting}
                  onClick={() =>
                    onExecuteStep({
                      stepName: step.stepName,
                      forceFail: willFail,
                    })
                  }
                  className={`
                    px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors
                    ${willFail
                      ? 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100 disabled:opacity-40'
                      : 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100 disabled:opacity-40'
                    }
                    disabled:cursor-not-allowed
                  `}
                >
                  {isThisStepExecuting ? 'Running...' : willFail ? 'Run & fail' : 'Run step'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {isSagaTerminal && (
        <div className="px-5 py-3 border-t bg-gray-50 text-xs text-gray-400 text-center">
          SAGA reached terminal state — start a new onboarding to run again
        </div>
      )}
    </div>
  )
}