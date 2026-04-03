import SwaggerParser from '@apidevtools/swagger-parser';
import YAML from 'yaml';
import * as fs from 'fs';
import * as path from 'path';

export class SchemaService {
  constructor(private projectPath: string) {}

  /**
   * Loads and validates an OpenAPI schema, or falls back to raw parsing for other formats.
   */
  async loadSchema(schemaPathOrUrl: string): Promise<string> {
    try {
      let schemaUrl = schemaPathOrUrl;
      
      if (!schemaUrl.startsWith('http://') && !schemaUrl.startsWith('https://')) {
        schemaUrl = path.resolve(this.projectPath, schemaUrl);
      }
      
      // Parse, resolve $refs, and validate the OpenAPI schema
      const api = await SwaggerParser.validate(schemaUrl);
      return JSON.stringify(api, null, 2);
    } catch (error: any) {
      // If it's not a valid OpenAPI schema, attempt raw parsing (e.g., GraphQL schemas or partial YAMLs)
      try {
        const raw = this.loadRawFile(schemaPathOrUrl);
        return typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2);
      } catch (innerError) {
        throw new Error(`Failed to load schema: ${error.message}`);
      }
    }
  }

  private loadRawFile(filePath: string): any {
    const fullPath = path.resolve(this.projectPath, filePath);
    const content = fs.readFileSync(fullPath, 'utf8');
    
    if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
      return YAML.parse(content);
    }
    
    try {
      return JSON.parse(content);
    } catch {
      return content;
    }
  }
}
