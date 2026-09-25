export type ProjectStatus = 'WORKING' | 'FINISHED'

export interface Project {
  id: number
  code: string
  name: string
  status: ProjectStatus
  contractName: string
}
