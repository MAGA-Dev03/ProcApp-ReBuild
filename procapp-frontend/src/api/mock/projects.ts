import type { Page, PageParams, Project } from '@/types'
import { ApiError } from '../apiError'
import { db, nextProjectId } from './db'
import { delay, paginate } from './utils'

export interface ListProjectsParams extends PageParams {
  status?: Project['status']
  search?: string
}

export type CreateProjectPayload = Pick<Project, 'code' | 'name' | 'status' | 'contractName'>
export type UpdateProjectPayload = Partial<CreateProjectPayload>

export interface ProjectDeleteImpact {
  invoiceCount: number
}

export async function listProjects(params: ListProjectsParams = {}): Promise<Page<Project>> {
  await delay()

  let results = db.projects
  if (params.status) {
    results = results.filter((project) => project.status === params.status)
  }
  if (params.search) {
    const search = params.search.toLowerCase()
    results = results.filter(
      (project) =>
        project.name.toLowerCase().includes(search) || project.code.toLowerCase().includes(search),
    )
  }

  return paginate(results, params)
}

function findProjectOrThrow(id: number): Project {
  const project = db.projects.find((p) => p.id === id)
  if (!project) {
    throw new ApiError(`Project ${id} not found`, 404)
  }
  return project
}

export async function getProject(id: number): Promise<Project> {
  await delay()
  return findProjectOrThrow(id)
}

function assertUniqueCode(code: string, excludeId?: number): void {
  const normalized = code.trim().toLowerCase()
  const duplicate = db.projects.some(
    (p) => p.id !== excludeId && p.code.trim().toLowerCase() === normalized,
  )
  if (duplicate) {
    throw new ApiError('Validation failed', 422, {
      code: 'A project with this code already exists.',
    })
  }
}

export async function createProject(payload: CreateProjectPayload): Promise<Project> {
  await delay()

  assertUniqueCode(payload.code)

  const project: Project = {
    id: nextProjectId(),
    code: payload.code,
    name: payload.name,
    status: payload.status,
    contractName: payload.contractName,
  }
  db.projects.push(project)
  return project
}

export async function updateProject(id: number, payload: UpdateProjectPayload): Promise<Project> {
  await delay()

  const project = findProjectOrThrow(id)
  if (payload.code !== undefined) {
    assertUniqueCode(payload.code, id)
  }

  const updated: Project = { ...project, ...payload, id: project.id }
  const index = db.projects.findIndex((p) => p.id === id)
  db.projects[index] = updated
  return updated
}

/**
 * Reports how many invoices are logged against this project so the UI can show their count in the
 * delete-confirmation dialog *before* the admin commits - this is a cascading delete (mirroring the
 * old system), so the warning has to be explicit and specific rather than a generic "are you sure?".
 */
export async function getProjectDeleteImpact(id: number): Promise<ProjectDeleteImpact> {
  await delay(150, 300)

  findProjectOrThrow(id)
  const invoiceCount = db.invoices.filter((inv) => inv.projectId === id).length
  return { invoiceCount }
}

/** Cascading delete: removes the project and every invoice logged against it, mirroring the old
 * system's behavior. The UI must confirm this explicitly via `getProjectDeleteImpact` first. */
export async function deleteProject(id: number): Promise<void> {
  await delay()

  findProjectOrThrow(id)
  db.invoices = db.invoices.filter((inv) => inv.projectId !== id)
  for (const user of db.users) {
    if (user.projects) {
      user.projects = user.projects.filter((p) => p.id !== id)
    }
  }
  const index = db.projects.findIndex((p) => p.id === id)
  db.projects.splice(index, 1)
}
