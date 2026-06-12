import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { gqlClient, MUTATIONS, QUERIES } from '../lib/graphqlClient'
import { SagaExecution } from '../lib/types'
import { useSagaStore } from '../store/sagaStore'

// ── tipos de respuesta GraphQL ──────────────────────────────────────────────

interface StartOnboardingResponse {
  startOnboarding: SagaExecution
}

interface ExecuteStepResponse {
  executeStep: SagaExecution
}

interface OnboardingStatusResponse {
  onboardingStatus: SagaExecution | null
}

// ── hook principal ──────────────────────────────────────────────────────────

export function useOnboardingSaga() {
  const queryClient = useQueryClient()
  const { sagaId, isPolling, setSagaId, setSaga, setPolling, reset } = useSagaStore()

  // Polling — activo solo cuando hay un sagaId y isPolling = true
  // TanStack Query refresca cada segundo mientras el SAGA no esté en estado final
  const { data: sagaData } = useQuery<OnboardingStatusResponse>({
    queryKey: ['saga', sagaId],
    queryFn: () =>
      gqlClient.request(QUERIES.onboardingStatus, { sagaId }),
    enabled: !!sagaId && isPolling,
    refetchInterval: (query) => {
      const status = query.state.data?.onboardingStatus?.status
      const terminal = ['COMPLETED', 'FAILED']
      // Detener polling cuando llega a estado final
      if (status && terminal.includes(status)) {
        setPolling(false)
        return false
      }
      return 1000
    },
    select: (data) => {
      if (data.onboardingStatus) {
        setSaga(data.onboardingStatus)
      }
      return data
    },
  })

  // Mutation: iniciar onboarding
  const startMutation = useMutation({
    mutationFn: (userEmail: string) =>
      gqlClient.request<StartOnboardingResponse>(
        MUTATIONS.startOnboarding,
        { userEmail }
      ),
    onSuccess: (data) => {
      const saga = data.startOnboarding
      setSagaId(saga.id)
      setSaga(saga)
      setPolling(true)
      queryClient.setQueryData(['saga', saga.id], {
        onboardingStatus: saga,
      })
    },
  })

  // Mutation: ejecutar un paso (con opción de forzar fallo)
  const executeStepMutation = useMutation({
    mutationFn: ({
      stepName,
      forceFail = false,
    }: {
      stepName: string
      forceFail?: boolean
    }) =>
      gqlClient.request<ExecuteStepResponse>(MUTATIONS.executeStep, {
        sagaId,
        stepName,
        forceFail,
      }),
    onSuccess: (data) => {
      const saga = data.executeStep
      setSaga(saga)
      queryClient.setQueryData(['saga', saga.id], {
        onboardingStatus: saga,
      })
    },
  })

  return {
    saga: sagaData?.onboardingStatus ?? useSagaStore.getState().saga,
    isPolling,
    startOnboarding: startMutation.mutate,
    isStarting: startMutation.isPending,
    executeStep: executeStepMutation.mutate,
    isExecuting: executeStepMutation.isPending,
    reset,
  }
}