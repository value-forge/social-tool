import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { MonitorListParams, AddMonitorRequest, UpdateMonitorRequest } from '../types'
import {
  getMonitors,
  addMonitor,
  updateMonitor,
  deleteMonitor,
} from '../api/monitors'

export function useMonitorList(params?: MonitorListParams) {
  return useQuery({
    queryKey: ['monitors', params],
    queryFn: () => getMonitors(params),
    staleTime: 30_000,
  })
}

export function useAddMonitor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (req: AddMonitorRequest) => addMonitor(req),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['monitors'] })
      void qc.invalidateQueries({ queryKey: ['stats-overview'] })
    },
  })
}

export function useUpdateMonitor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...req }: UpdateMonitorRequest & { id: string }) =>
      updateMonitor(id, req),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['monitors'] })
    },
  })
}

export function useDeleteMonitor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteMonitor(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['monitors'] })
      void qc.invalidateQueries({ queryKey: ['stats-overview'] })
    },
  })
}
