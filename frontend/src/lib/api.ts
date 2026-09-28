export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type Query = Record<string, string | number | boolean | null | undefined>;

function withQuery(path: string, query?: Query): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

interface RequestOptions {
  method?: string;
  query?: Query;
  json?: unknown;
  body?: BodyInit;
  signal?: AbortSignal;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', query, json, body, signal } = options;
  const headers: HeadersInit = json !== undefined ? { 'Content-Type': 'application/json' } : {};
  let response: Response;
  try {
    response = await fetch(withQuery(`/api/v1${path}`, query), {
      method,
      headers,
      body: json !== undefined ? JSON.stringify(json) : body,
      credentials: 'same-origin',
      signal,
    });
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw error;
    throw new ApiError(0, 'network_error', '网络连接失败，请稍后重试');
  }

  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      response.status,
      data?.code ?? `http_${response.status}`,
      data?.message ?? `请求失败（${response.status}）`,
    );
  }
  return data as T;
}
