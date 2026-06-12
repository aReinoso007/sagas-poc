import { create } from 'zustand'
import { SagaExecution } from '../lib/types'

interface SagaStore {
  sagaId: string | null
  userEmail: string
  saga: SagaExecution | null
  isPolling: boolean
  setSagaId: (id: string) => void
  setUserEmail: (email: string) => void
  setSaga: (saga: SagaExecution) => void
  setPolling: (polling: boolean) => void
  reset: () => void
}

export const useSagaStore = create<SagaStore>((set) => ({
  sagaId: null,
  userEmail: '',
  saga: null,
  isPolling: false,
  setSagaId: (id) => set({ sagaId: id }),
  setUserEmail: (email) => set({ userEmail: email }),
  setSaga: (saga) => set({ saga }),
  setPolling: (isPolling) => set({ isPolling }),
  reset: () => set({ sagaId: null, saga: null, isPolling: false }),
}))