/**
 * Environment configurations for API Dash MCP Apps
 */

export interface Environment {
  id: string;
  name: string;
  variables: {
    baseUrl: string;
    apiKey: string;
    timeout: number;
  };
}

export const environments: Environment[] = [
  {
    id: 'dev',
    name: 'Development',
    variables: {
      baseUrl: 'http://localhost:8080',
      apiKey: 'dev-api-key-12345',
      timeout: 30000,
    },
  },
  {
    id: 'staging',
    name: 'Staging',
    variables: {
      baseUrl: 'https://staging.api.example.com',
      apiKey: 'staging-api-key-67890',
      timeout: 15000,
    },
  },
  {
    id: 'prod',
    name: 'Production',
    variables: {
      baseUrl: 'https://api.example.com',
      apiKey: 'prod-api-key-abcde',
      timeout: 10000,
    },
  },
];

export function getEnvironmentById(id: string): Environment | undefined {
  return environments.find(e => e.id === id);
}
