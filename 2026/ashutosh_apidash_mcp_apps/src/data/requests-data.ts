/**
 * Mock saved API requests for API Dash MCP Apps
 */

export interface MockRequest {
  id: string;
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  headers?: Record<string, string>;
  body?: string;
  tags: string[];
  mockResponse: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: Record<string, unknown> | unknown[];
    timeMs: number;
    sizeBytes: number;
  };
}

export const savedRequests: MockRequest[] = [
  {
    id: 'req-001',
    name: 'GitHub - Get User Profile',
    method: 'GET',
    url: 'https://api.github.com/users/octocat',
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'APIDash/1.0',
    },
    tags: ['github', 'users', 'public'],
    mockResponse: {
      status: 200,
      statusText: 'OK',
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'x-ratelimit-limit': '60',
        'x-ratelimit-remaining': '57',
        'cache-control': 'public, max-age=60',
      },
      body: {
        login: 'octocat',
        id: 1,
        avatar_url: 'https://github.com/images/error/octocat_happy.gif',
        type: 'User',
        name: 'The Octocat',
        company: '@github',
        blog: 'https://github.com/blog',
        location: 'San Francisco, CA',
        email: null,
        public_repos: 8,
        followers: 20207,
        following: 9,
        created_at: '2011-01-25T18:44:36Z',
      },
      timeMs: 142,
      sizeBytes: 1247,
    },
  },
  {
    id: 'req-002',
    name: 'JSONPlaceholder - List Posts',
    method: 'GET',
    url: 'https://jsonplaceholder.typicode.com/posts',
    headers: {
      'Accept': 'application/json',
    },
    tags: ['jsonplaceholder', 'posts', 'list'],
    mockResponse: {
      status: 200,
      statusText: 'OK',
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'x-powered-by': 'Express',
        'cache-control': 'max-age=43200',
      },
      body: [
        { userId: 1, id: 1, title: 'sunt aut facere repellat provident occaecati excepturi optio reprehenderit', body: 'quia et suscipit\nsuscipit recusandae...' },
        { userId: 1, id: 2, title: 'qui est esse', body: 'est rerum tempore vitae\nsequi sint nihil...' },
        { userId: 1, id: 3, title: 'ea molestias quasi exercitationem repellat qui ipsa sit aut', body: 'et iusto sed quo iure...' },
      ],
      timeMs: 98,
      sizeBytes: 27520,
    },
  },
  {
    id: 'req-003',
    name: 'JSONPlaceholder - Create Post',
    method: 'POST',
    url: 'https://jsonplaceholder.typicode.com/posts',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ title: 'API Dash is Amazing', body: 'Testing the MCP integration feature.', userId: 1 }, null, 2),
    tags: ['jsonplaceholder', 'posts', 'create'],
    mockResponse: {
      status: 201,
      statusText: 'Created',
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'location': 'https://jsonplaceholder.typicode.com/posts/101',
      },
      body: {
        title: 'API Dash is Amazing',
        body: 'Testing the MCP integration feature.',
        userId: 1,
        id: 101,
      },
      timeMs: 213,
      sizeBytes: 156,
    },
  },
  {
    id: 'req-004',
    name: 'JSONPlaceholder - Get User',
    method: 'GET',
    url: 'https://jsonplaceholder.typicode.com/users/1',
    headers: {
      'Accept': 'application/json',
    },
    tags: ['jsonplaceholder', 'users'],
    mockResponse: {
      status: 200,
      statusText: 'OK',
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'max-age=43200',
      },
      body: {
        id: 1,
        name: 'Leanne Graham',
        username: 'Bret',
        email: 'Sincere@april.biz',
        address: {
          street: 'Kulas Light',
          suite: 'Apt. 556',
          city: 'Gwenborough',
          zipcode: '92998-3874',
          geo: { lat: '-37.3159', lng: '81.1496' },
        },
        phone: '1-770-736-0988 x56442',
        website: 'hildegard.org',
        company: {
          name: 'Romaguera-Crona',
          catchPhrase: 'Multi-layered client-server neural-net',
          bs: 'harness real-time e-markets',
        },
      },
      timeMs: 78,
      sizeBytes: 589,
    },
  },
  {
    id: 'req-005',
    name: 'JSONPlaceholder - Update Post',
    method: 'PUT',
    url: 'https://jsonplaceholder.typicode.com/posts/1',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ id: 1, title: 'Updated: foo bar', body: 'Updated content here.', userId: 1 }, null, 2),
    tags: ['jsonplaceholder', 'posts', 'update'],
    mockResponse: {
      status: 200,
      statusText: 'OK',
      headers: {
        'content-type': 'application/json; charset=utf-8',
      },
      body: {
        id: 1,
        title: 'Updated: foo bar',
        body: 'Updated content here.',
        userId: 1,
      },
      timeMs: 187,
      sizeBytes: 124,
    },
  },
  {
    id: 'req-006',
    name: 'JSONPlaceholder - Delete Post',
    method: 'DELETE',
    url: 'https://jsonplaceholder.typicode.com/posts/1',
    headers: {
      'Accept': 'application/json',
    },
    tags: ['jsonplaceholder', 'posts', 'delete'],
    mockResponse: {
      status: 200,
      statusText: 'OK',
      headers: {
        'content-type': 'application/json; charset=utf-8',
      },
      body: {},
      timeMs: 55,
      sizeBytes: 2,
    },
  },
  {
    id: 'req-007',
    name: 'Open Meteo - Weather Forecast',
    method: 'GET',
    url: 'https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current_weather=true&hourly=temperature_2m',
    headers: {
      'Accept': 'application/json',
    },
    tags: ['weather', 'open-meteo', 'forecast'],
    mockResponse: {
      status: 200,
      statusText: 'OK',
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-cache',
      },
      body: {
        latitude: 52.52,
        longitude: 13.419998,
        generationtime_ms: 1.842,
        timezone: 'GMT',
        current_weather: {
          temperature: 18.3,
          windspeed: 12.4,
          weathercode: 3,
          is_day: 1,
          time: '2024-06-15T12:00',
        },
        hourly: {
          time: ['2024-06-15T00:00', '2024-06-15T01:00', '2024-06-15T02:00'],
          temperature_2m: [14.2, 13.8, 13.1],
        },
      },
      timeMs: 324,
      sizeBytes: 2845,
    },
  },
];

export function getRequestById(id: string): MockRequest | undefined {
  return savedRequests.find(r => r.id === id);
}
