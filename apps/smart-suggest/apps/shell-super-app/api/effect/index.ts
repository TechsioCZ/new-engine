import { getHealthPayload } from '../../shared/health';

const plainTextHeaders = {
  'content-type': 'text/plain; charset=utf-8',
} as const;

const notFound = () =>
  new Response('Not found', {
    headers: plainTextHeaders,
    status: 404,
  });

const isHealthRequest = (request: Request) => {
  const url = new URL(request.url);
  return request.method === 'GET' && url.pathname === '/v1/health';
};

export const handler = (request: Request) =>
  isHealthRequest(request) ? Response.json(getHealthPayload()) : notFound();
