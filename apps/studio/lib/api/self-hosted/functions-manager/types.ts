/**
 * Abstraction for storing and retrieving function artifacts across
 * different backends (local, remote, or cloud providers).
 */
export interface IFunctionsArtifactStore {
  getFunctions(): Promise<FunctionArtifact[]>
  getFunctionBySlug(slug: string): Promise<FunctionArtifact | undefined>
  getBlobArtifactsBySlug(slug: string): Promise<FunctionBlobArtifact[]>
}

export type FunctionArtifact = {
  slug: string
  entrypoint_path: string
  created_at: number
  updated_at: number
}

export type FunctionBlobArtifact = {
  filename: string
  data: Blob
}

export type NewFunctionArtifactStore =
  | {
      store: IFunctionsArtifactStore
      error: undefined
    }
  | {
      store: undefined
      error: string
    }
