import { NextApiRequest, NextApiResponse } from 'next'
import { components } from 'api-types'
import { getFunctionsArtifactStore } from 'lib/api/self-hosted/functions-manager'
import { uuidv4 } from 'lib/helpers'

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

type EdgeFunctionsResponse = components['schemas']['FunctionResponse']

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const slugParam = req.query.slug;
  const slug = Array.isArray(slugParam) ? slugParam[0] : slugParam;

  const { store, error } = getFunctionsArtifactStore()
  if (!slug || !store || error) {
    return res.status(404)
  }

  const functionsArtifact = await store.getFunctionBySlug(slug);
  if (!functionsArtifact) return res.status(404);

  // mix some mock data
  const functionResponse =
    {
      id: uuidv4(),
      slug: functionsArtifact.slug,
      version: 1,
      name: functionsArtifact.slug,
      status: 'ACTIVE',
      entrypoint_path: functionsArtifact.entrypoint_path,
      created_at: functionsArtifact.created_at,
      updated_at: functionsArtifact.updated_at,
    } satisfies EdgeFunctionsResponse

  return res.status(200).json(functionResponse)
}

export default handler
