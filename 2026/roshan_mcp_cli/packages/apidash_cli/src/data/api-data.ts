/**
 * APIDash CLI — Static fallback data
 * Used when no apidash_mcp_workspace.json is found on the filesystem.
 */

export const STATUS_REASONS: Record<number, string> = {
  100: "Continue", 101: "Switching Protocols", 102: "Processing",
  200: "OK", 201: "Created", 202: "Accepted", 204: "No Content",
  301: "Moved Permanently", 302: "Found", 304: "Not Modified",
  400: "Bad Request", 401: "Unauthorized", 403: "Forbidden",
  404: "Not Found", 405: "Method Not Allowed", 408: "Request Timeout",
  409: "Conflict", 410: "Gone", 422: "Unprocessable Entity",
  429: "Too Many Requests",
  500: "Internal Server Error", 501: "Not Implemented",
  502: "Bad Gateway", 503: "Service Unavailable", 504: "Gateway Timeout",
};

export interface SampleRequest {
  id: string;
  name: string;
  method: string;
  url: string;
  description: string;
  headers?: Record<string, string>;
  body?: string;
}

export const SAMPLE_REQUESTS: SampleRequest[] = [
  {
    id: "get-posts",
    name: "Get All Posts",
    method: "GET",
    url: "https://jsonplaceholder.typicode.com/posts",
    description: "Retrieve all posts from JSONPlaceholder",
  },
  {
    id: "get-post",
    name: "Get Single Post",
    method: "GET",
    url: "https://jsonplaceholder.typicode.com/posts/1",
    description: "Retrieve a single post by ID",
  },
  {
    id: "create-post",
    name: "Create Post",
    method: "POST",
    url: "https://jsonplaceholder.typicode.com/posts",
    description: "Create a new post",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "foo", body: "bar", userId: 1 }, null, 2),
  },
  {
    id: "update-post",
    name: "Update Post",
    method: "PUT",
    url: "https://jsonplaceholder.typicode.com/posts/1",
    description: "Update an existing post",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: 1, title: "foo", body: "bar", userId: 1 }, null, 2),
  },
  {
    id: "delete-post",
    name: "Delete Post",
    method: "DELETE",
    url: "https://jsonplaceholder.typicode.com/posts/1",
    description: "Delete a post by ID",
  },
  {
    id: "get-users",
    name: "Get Users",
    method: "GET",
    url: "https://jsonplaceholder.typicode.com/users",
    description: "Retrieve all users",
  },
  {
    id: "get-comments",
    name: "Get Comments",
    method: "GET",
    url: "https://jsonplaceholder.typicode.com/comments?postId=1",
    description: "Retrieve comments for post 1",
  },
  {
    id: "github-user",
    name: "GitHub User",
    method: "GET",
    url: "https://api.github.com/users/octocat",
    description: "Fetch a GitHub user profile",
    headers: { "Accept": "application/vnd.github.v3+json" },
  },
  {
    id: "httpbin-get",
    name: "HTTPBin GET",
    method: "GET",
    url: "https://httpbin.org/get",
    description: "Test endpoint that echoes back request data",
  },
  {
    id: "httpbin-post",
    name: "HTTPBin POST",
    method: "POST",
    url: "https://httpbin.org/post",
    description: "Test POST endpoint",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ test: "apidash-cli" }, null, 2),
  },
];
