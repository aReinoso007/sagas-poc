export type StepStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'COMPENSATING'
  | 'COMPENSATED'
  | 'FAILED'

export type SagaStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'COMPENSATING'
  | 'FAILED'

export interface SagaStep {
  id: string
  stepNumber: number
  stepName: string
  status: StepStatus
  errorMessage: string | null
  result: Record<string, unknown> | null
}

export interface SagaExecution {
  id: string
  userEmail: string
  status: SagaStatus
  currentStep: number
  steps: SagaStep[]
}

export const STEP_LABELS: Record<string, string> = {
  create_user: 'Create user',
  connect_quickbooks: 'Connect QuickBooks',
  connect_plaid: 'Connect Plaid',
}