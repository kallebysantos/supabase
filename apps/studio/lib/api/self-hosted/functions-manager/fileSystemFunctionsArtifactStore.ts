import path from 'path'
import type { Dirent } from 'fs'
import { opendir, readdir, readFile, stat } from 'fs/promises'
import {
  FunctionArtifact,
  NewFunctionArtifactStore,
  IFunctionsArtifactStore,
  FunctionBlobArtifact,
} from './types'
import { pathToFileURL } from 'url'

export class FileSystemFunctionsArtifactStore implements IFunctionsArtifactStore {
  constructor(private folderPath: string) {}

  static new(): NewFunctionArtifactStore {
    const folder = process.env.EDGE_FUNCTIONS_MANAGEMENT_FOLDER
    if (!folder)
      return {
        store: undefined,
        error:
          "'EDGE_FUNCTIONS_MANAGEMENT_FOLDER' is required to use 'FileSystemFunctionsArtifactStore'",
      }

    return { store: new FileSystemFunctionsArtifactStore(folder), error: undefined }
  }

  async getFunctions(): Promise<FunctionArtifact[]> {
    const dirEntries = await readdir(this.folderPath, { withFileTypes: true })

    const functionsFolders = dirEntries.filter((dir) => dir.isDirectory() && dir.name !== 'main')
    const functionsArtifacts = await Promise.all(
      functionsFolders.map(parseFolderToFunctionArtifact)
    )

    return functionsArtifacts.filter((f) => f !== undefined)
  }

  async getFunctionBySlug(slug: string): Promise<FunctionArtifact | undefined> {
    const dirEntries = await readdir(this.folderPath, { withFileTypes: true })

    const functionFolder = dirEntries.find(
      (dir) => dir.isDirectory() && dir.name !== 'main' && dir.name === slug
    )
    if (!functionFolder) return

    return parseFolderToFunctionArtifact(functionFolder)
  }

  async getBlobArtifactsBySlug(slug: string): Promise<FunctionBlobArtifact[]> {
    if (slug === 'main') return []

    const functionFolderPath = path.join(this.folderPath, slug)
    const functionFolder = await readdir(functionFolderPath, {
      recursive: true,
      withFileTypes: true,
    })

    const blobArtifacts = await Promise.all(
      functionFolder
        .filter((i) => i.isFile())
        .map(async (file) => await parseFileToFunctionBlobArtifact(file, functionFolderPath))
    )

    return blobArtifacts.filter((f) => f !== undefined)
  }
}

async function parseFolderToFunctionArtifact(
  folder: Dirent
): Promise<FunctionArtifact | undefined> {
  const folderPath = path.join(folder.parentPath, folder.name)
  const files = await readdir(folderPath, { withFileTypes: true })
  const entrypoint = files.find((file) => file.isFile() && file.name.startsWith('index'))

  if (!entrypoint) return

  const entrypointPath = path.join(folderPath, entrypoint.name)
  const entrypointStat = await stat(entrypointPath)

  return {
    slug: folder.name,
    entrypoint_path: pathToFileURL(entrypointPath).href,
    created_at: entrypointStat.birthtimeMs,
    updated_at: entrypointStat.mtimeMs,
  }
}

async function parseFileToFunctionBlobArtifact(
  file: Dirent,
  originalFolderPath: string
): Promise<FunctionBlobArtifact | undefined> {
  if (!file.isFile()) return

  const buffer = await readFile(path.join(file.parentPath, file.name))
  /* @ts-ignore: Buffer<ArrayBufferLike> to ArrayBuffer */
  const blob = new Blob([buffer], { type: 'text/plain' })

  const virtualRelativeFilepath = file.parentPath.replace(originalFolderPath, 'source')
  return {
    data: blob,
    filename: path.join(virtualRelativeFilepath, file.name),
  }
}
