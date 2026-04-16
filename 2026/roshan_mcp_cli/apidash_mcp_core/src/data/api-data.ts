/**
 * HTTP Methods and status codes data for APIDash MCP
 */

export const HTTP_METHODS = [
  'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'CONNECT', 'TRACE'
] as const;
export type HttpMethod = typeof HTTP_METHODS[number];

export const HTTP_METHODS_WITH_BODY: HttpMethod[] = ['POST', 'PUT', 'PATCH'];

export const CONTENT_TYPES = [
  { value: 'application/json', label: 'JSON' },
  { value: 'application/x-www-form-urlencoded', label: 'Form URL Encoded' },
  { value: 'multipart/form-data', label: 'Multipart Form' },
  { value: 'text/plain', label: 'Plain Text' },
  { value: 'application/xml', label: 'XML' },
  { value: 'application/graphql', label: 'GraphQL' },
  { value: 'text/html', label: 'HTML' },
] as const;

export const STATUS_REASONS: Record<number, string> = {
  100: 'Continue', 101: 'Switching Protocols', 102: 'Processing',
  200: 'OK', 201: 'Created', 202: 'Accepted', 203: 'Non-Authoritative Information',
  204: 'No Content', 205: 'Reset Content', 206: 'Partial Content',
  301: 'Moved Permanently', 302: 'Found', 304: 'Not Modified',
  307: 'Temporary Redirect', 308: 'Permanent Redirect',
  400: 'Bad Request', 401: 'Unauthorized', 402: 'Payment Required',
  403: 'Forbidden', 404: 'Not Found', 405: 'Method Not Allowed',
  406: 'Not Acceptable', 408: 'Request Timeout', 409: 'Conflict',
  410: 'Gone', 411: 'Length Required', 412: 'Precondition Failed',
  413: 'Payload Too Large', 415: 'Unsupported Media Type',
  418: "I'm a Teapot", 422: 'Unprocessable Entity', 429: 'Too Many Requests',
  500: 'Internal Server Error', 501: 'Not Implemented', 502: 'Bad Gateway',
  503: 'Service Unavailable', 504: 'Gateway Timeout',
};

export const SAMPLE_REQUESTS = [
  {
    id: 'get-posts',
    name: 'Get Posts',
    method: 'GET',
    url: 'https://jsonplaceholder.typicode.com/posts',
    description: 'Fetch all posts from JSONPlaceholder',
  },
  {
    id: 'get-post',
    name: 'Get Single Post',
    method: 'GET',
    url: 'https://jsonplaceholder.typicode.com/posts/1',
    description: 'Fetch a single post by ID',
  },
  {
    id: 'create-post',
    name: 'Create Post',
    method: 'POST',
    url: 'https://jsonplaceholder.typicode.com/posts',
    description: 'Create a new post',
    body: JSON.stringify({ title: 'foo', body: 'bar', userId: 1 }, null, 2),
    contentType: 'application/json',
  },
  {
    id: 'update-post',
    name: 'Update Post',
    method: 'PUT',
    url: 'https://jsonplaceholder.typicode.com/posts/1',
    description: 'Update an existing post',
    body: JSON.stringify({ id: 1, title: 'foo updated', body: 'bar updated', userId: 1 }, null, 2),
    contentType: 'application/json',
  },
  {
    id: 'delete-post',
    name: 'Delete Post',
    method: 'DELETE',
    url: 'https://jsonplaceholder.typicode.com/posts/1',
    description: 'Delete a post',
  },
  {
    id: 'get-users',
    name: 'Get Users',
    method: 'GET',
    url: 'https://jsonplaceholder.typicode.com/users',
    description: 'Fetch all users',
  },
  {
    id: 'get-comments',
    name: 'Get Comments',
    method: 'GET',
    url: 'https://jsonplaceholder.typicode.com/comments?postId=1',
    description: 'Fetch comments for a post',
  },
  {
    id: 'github-user',
    name: 'GitHub User Profile',
    method: 'GET',
    url: 'https://api.github.com/users/octocat',
    description: 'Get GitHub user profile',
  },
  {
    id: 'httpbin-get',
    name: 'HTTPBin GET',
    method: 'GET',
    url: 'https://httpbin.org/get',
    description: 'Test GET request via HTTPBin',
  },
  {
    id: 'httpbin-post',
    name: 'HTTPBin POST JSON',
    method: 'POST',
    url: 'https://httpbin.org/post',
    body: JSON.stringify({ test: 'apidash-mcp', version: '1.0' }, null, 2),
    contentType: 'application/json',
    description: 'Test POST request via HTTPBin',
  },
];

export const CODE_GENERATORS = [
  { id: 'curl', name: 'cURL', icon: '🐚', lang: 'bash' },
  { id: 'python-requests', name: 'Python', icon: '🐍', lang: 'python' },
  { id: 'javascript-fetch', name: 'JS Fetch', icon: '🌐', lang: 'javascript' },
  { id: 'javascript-axios', name: 'JS Axios', icon: '⚡', lang: 'javascript' },
  { id: 'nodejs-fetch', name: 'Node Fetch', icon: '🟢', lang: 'javascript' },
  { id: 'dart-http', name: 'Dart', icon: '🎯', lang: 'dart' },
  { id: 'go-http', name: 'Go', icon: '🐹', lang: 'go' },
  { id: 'java-http', name: 'Java', icon: '☕', lang: 'java' },
  { id: 'kotlin-okhttp', name: 'Kotlin', icon: '🟣', lang: 'kotlin' },
  { id: 'php-curl', name: 'PHP', icon: '🐘', lang: 'php' },
  { id: 'ruby-net', name: 'Ruby', icon: '💎', lang: 'ruby' },
  { id: 'rust-reqwest', name: 'Rust', icon: '🦀', lang: 'rust' },
] as const;

export const GRAPHQL_SAMPLE_QUERY = `query {
  countries {
    code
    name
    capital
    currency
    emoji
  }
}`;

export const GRAPHQL_SAMPLE_ENDPOINT = 'https://countries.trevorblades.com/graphql';
