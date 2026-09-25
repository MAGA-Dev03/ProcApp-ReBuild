import type { Page, PageParams, Project } from '@/types'
import { http } from './http'

export interface ListProjectParams extends PageParams {
    status?: Project['status']
    search?: string
}

export type CreateProjectPayload = Pick<Project, 'code' | 'name' | 'status' | 'contractName'>
export type UpdateProjectPayload = Partial<CreateProjectPayload>

export interface ProjectDeleteImpact {
    invoiceCount: number
}

export async function listProjects(params: ListProjectParams = {}): Promise<Page<Project>> {
    const page = await http<Page<Project>>('/api/projects', {
        params: { search: params.search, page: params.page, size: params.size, sort: params.sort },
    })
    if (params.status) {
        return { ...page, content:page.content.filter((p) => p.status === params.status) }
    }
    return page

}

/**
 * Every project, walked page by page. Use this for form pickers / filter dropdowns, which need
 * the full list rather than one capped page — a single `listProjects({ size: 100 })` silently
 * drops everything past the first 100 rows (and Spring returns them in no particular order, so
 * a freshly created project can land outside that window).
 */
export async function listAllProjects(): Promise<Project[]> {
    const pageSize = 200
    const all: Project[] = []
    for (let page = 0; ; page++) {
        const result = await listProjects({ page, size: pageSize, sort: 'name,asc' })
        all.push(...result.content)
        if (page >= result.totalPages - 1 || result.content.length === 0) break
    }
    return all
}

export async function getProject(id: number): Promise<Project> {
    return http<Project>(`/api/projects/${id}`)
}

export async function createProject(payload: CreateProjectPayload): Promise<Project> {
    return http<Project>('/api/projects', { method: 'POST', body: payload })
}

export async function updateProject(id: number, payload: UpdateProjectPayload): Promise<Project> {
    const current = await getProject(id)
    const merged = { ...current, ...payload }
    const { id: _id, ...body } = merged as any
    return http<Project>(`/api/projects/${id}` , { method: 'PUT', body })
}

export async function getProjectDeleteImpact(id: number): Promise<ProjectDeleteImpact> {
    return http<ProjectDeleteImpact>(`/api/projects/${id}/delete-impact`)
}

export async function deleteProject(id: number): Promise<void> {
    await http<void>(`/api/projects/${id}`, { method: 'DELETE' }) 
}