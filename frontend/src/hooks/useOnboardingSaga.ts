import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { gqlClient, MUTATIONS, QUERIES } from '../lib/graphqlClient'
import { SagaExecution } from '../lib/types'
import { useSagaStore } from '../store/sagaStore'

interface StartOnboardingResponse {
  startOnboarding: SagaExecution
}

interface ExecuteStepResponse {
  executeStep: SagaExecution
}

interface OnboardingStatusResponse {
  onboardingStatus: SagaExecution | null
}

export function useOnboardingSaga() {
  const queryClient = useQueryClient()
  const { sagaId, isPolling, setSagaId, setSaga, setPolling, reset } = useSagaStore()

  const { data } = useQuery<OnboardingStatusResponse>({
    queryKey: ['saga', sagaId],
    queryFn: () => gqlClient.request(QUERIES.onboardingStatus, { sagaId }),
    enabled: !!sagaId && isPolling,
    refetchInterval: (query) => {
      const status = query.state.data?.onboardingStatus?.status
      if (status && ['COMPLETED', 'FAILED'].includes(status)) {
        return false
      }
      return 1000
    },
  })

  // Sincronizar con Zustand fuera del render
  useEffect(() => {
    if (data?.onboardingStatus) {
      setSaga(data.onboardingStatus)
      const status = data.onboardingStatus.status
      if (['COMPLETED', 'FAILED'].includes(status)) {
        setPolling(false)
      }
    }
  }, [data])

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

  const saga = useSagaStore((s) => s.saga)

  return {
    saga,
    isPolling,
    startOnboarding: startMutation.mutate,
    isStarting: startMutation.isPending,
    executeStep: executeStepMutation.mutate,
    isExecuting: executeStepMutation.isPending,
    reset,
  }
}