import { NextApiRequest, NextApiResponse } from 'next'
import { getFunctionsArtifactStore } from 'lib/api/self-hosted/functions-manager'
import { uuidv4 } from 'lib/helpers'
import { parseMultipartStream, parseMultipartRequest } from '@mjackson/multipart-parser'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req

  switch (method) {
    case 'GET':
      return handleGet(req, res)
    default:
      res.setHeader('Allow', ['GET'])
      res.status(405).json({ data: null, error: { message: `Method ${method} Not Allowed` } })
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const slugParam = req.query.slug
  const slug = Array.isArray(slugParam) ? slugParam[0] : slugParam

  const { store, error } = getFunctionsArtifactStore()
  if (!slug || !store || error) {
    return res.status(404)
  }

  const blobArtifacts = await store.getBlobArtifactsBySlug(slug)

  const form = new FormData()

  const totalSize = blobArtifacts.reduce((sum, item) => sum + item.data.size, 0)
  const metadata = {
    // mock id, should be "<project_id>_<function_id>_<version>"
    deployment_id: uuidv4(),
    original_size: totalSize,
    compressed_size: totalSize,
    module_count: blobArtifacts.length,
  }
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }), '')

  blobArtifacts.forEach((item) => {
    form.append('file', item.data, item.filename)
  })

  const multipartResponse = new Response(form)

  res.setHeader(
    'Content-Type',
    multipartResponse.headers.get('content-type') ?? 'multipart/form-data'
  )

  return res.status(200).send(await multipartResponse.text())
}

export default handler
