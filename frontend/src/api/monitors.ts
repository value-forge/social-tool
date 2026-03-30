import type {
  AddMonitorData,
  AddMonitorRequest,
  ApiResponse,
  MonitorAccount,
  MonitorListParams,
  PaginatedData,
  UpdateMonitorData,
  UpdateMonitorRequest,
} from '../types'
import client from './client'

export async function getMonitors(
  params?: MonitorListParams,
): Promise<PaginatedData<MonitorAccount>> {
  const res = await client.get<ApiResponse<PaginatedData<MonitorAccount>>>(
    '/monitors',
    { params },
  )
  return res.data.data
}

export async function addMonitor(
  req: AddMonitorRequest,
): Promise<AddMonitorData> {
  const res = await client.post<ApiResponse<AddMonitorData>>(
    '/monitors/add',
    req,
  )
  return res.data.data
}

export async function updateMonitor(
  id: string,
  req: UpdateMonitorRequest,
): Promise<UpdateMonitorData> {
  const res = await client.put<ApiResponse<UpdateMonitorData>>(
    `/monitors/${id}`,
    req,
  )
  return res.data.data
}

export async function deleteMonitor(id: string): Promise<null> {
  const res = await client.delete<ApiResponse<null>>(`/monitors/${id}`)
  return res.data.data
}
