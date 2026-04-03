import fetch from 'node-fetch';

export class AuthService {
  /**
   * Attempts to obtain an auth token by sending a JSON POST request.
   * Extracts the token based on the specified JSONPath (simple dot notation like 'data.token' or 'token').
   */
  async obtainToken(url: string, payload: any, tokenPath: string = 'token'): Promise<string> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`Login failed with status ${response.status}: ${JSON.stringify(data)}`);
      }
      
      // Extract token using simple dot notation
      const token = tokenPath.split('.').reduce((acc: any, part: string) => acc && acc[part], data) as string;
      
      if (!token) {
        throw new Error(`Token not found at path '${tokenPath}' in response: ${JSON.stringify(data)}`);
      }
      
      return token;
    } catch (e: any) {
      throw new Error(`Auth request failed: ${e.message}`);
    }
  }
}
