import { SagaExecution, SagaStep, StepStatus, STEP_LABELS } from '../lib/types'

interface Props {
  saga: SagaExecution
}

const STATUS_CONFIG: Record<StepStatus, {
  icon: string
  classes: string
  label: string
}> = {
  PENDING:      { icon: '○', classes: 'text-gray-400 border-gray-200 bg-white',              label: 'Pending' },
  RUNNING:      { icon: '◌', classes: 'text-blue-600 border-blue-400 bg-blue-50 animate-pulse', label: 'Running' },
  COMPLETED:    { icon: '✓', classes: 'text-green-700 border-green-500 bg-green-50',          label: 'Completed' },
  COMPENSATING: { icon: '↩', classes: 'text-amber-600 border-amber-400 bg-amber-50 animate-pulse', label: 'Rolling back' },
  COMPENSATED:  { icon: '↩', classes: 'text-amber-700 border-amber-500 bg-amber-50',          label: 'Rolled back' },
  FAILED:       { icon: '✕', classes: 'text-red-700 border-red-400 bg-red-50',                label: 'Failed' },
}

const SAGA_STATUS_BANNER: Record<string, { classes: string; message: string }> = {
  PENDING:      { classes: 'bg-gray-50 text-gray-600 border-gray-200',       message: 'Waiting to start...' },
  RUNNING:      { classes: 'bg-blue-50 text-blue-700 border-blue-200',        message: 'Onboarding in progress...' },
  COMPLETED:    { classes: 'bg-green-50 text-green-700 border-green-200',     message: 'Onboarding complete!' },
  COMPENSATING: { classes: 'bg-amber-50 text-amber-700 border-amber-200',     message: 'Rolling back changes...' },
  FAILED:       { classes: 'bg-red-50 text-red-700 border-red-200',           message: 'Onboarding failed — all changes rolled back.' },
}

function StepRow({ step }: { step: SagaStep }) {
  const config = STATUS_CONFIG[step.status]

  return (
    <div className="flex items-start gap-4 py-4">
      <div className={`
        w-9 h-9 rounded-full border-2 flex items-center justify-center
        text-sm font-mono font-semibold shrink-0 mt-0.5
        ${config.classes}
      `}>
        {config.icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-gray-900">
            {STEP_LABELS[step.stepName] ?? step.stepName}
          </span>
          <span className={`
            text-xs px-2 py-0.5 rounded-full border font-medium
            ${config.classes}
          `}>
            {config.label}
          </span>
        </div>

        {step.errorMessage && (
          <p className="mt-1 text-xs text-red-600 font-mono">
            {step.errorMessage}
          </p>
        )}

        {step.status === 'COMPLETED' && step.result && (
          <div className="mt-1.5 text-xs text-gray-400 font-mono truncate">
            {Object.entries(step.result)
              .filter(([k]) => !k.includes('token') && !k.includes('key'))
              .map(([k, v]) => `${k}: ${v}`)
              .join(' · ')}
          </div>
        )}
      </div>
    </div>
  )
}

export function OnboardingStepper({ saga }: Props) {
  const banner = SAGA_STATUS_BANNER[saga.status]

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className={`px-5 py-3 border-b text-sm font-medium ${banner.classes}`}>
        {banner.message}
      </div>

      <div className="divide-y divide-gray-100 px-5">
        {saga.steps.map((step, i) => (
          <div key={step.id}>
            <StepRow step={step} />
            {i < saga.steps.length - 1 && (
              <div className="ml-4 w-px h-2 bg-gray-100" />
            )}
          </div>
        ))}
      </div>

      <div className="px-5 py-3 border-t bg-gray-50 flex items-center justify-between">
        <span className="text-xs text-gray-400 font-mono truncate">
          saga: {saga.id}
        </span>
        <span className="text-xs text-gray-500">
          step {saga.currentStep + 1} of {saga.steps.length}
        </span>
      </div>
    </div>
  )
}