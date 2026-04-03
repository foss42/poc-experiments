/**
 * Unit tests for aiChatService utilities.
 * Tests the JSON Schema → Zod conversion logic in isolation.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';

// Replicate convertJsonSchemaToZod (same logic as aiChatService.js)
function convertJsonSchemaToZod(schema) {
  if (!schema?.properties) return z.object({});
  const shape = {};
  for (const [key, prop] of Object.entries(schema.properties)) {
    let zodType;
    switch (prop.type) {
      case 'string':   zodType = z.string();          break;
      case 'number':
      case 'integer':  zodType = z.number();          break;
      case 'boolean':  zodType = z.boolean();         break;
      case 'array':    zodType = z.array(z.any());    break;
      default:         zodType = z.any();
    }
    if (prop.description) zodType = zodType.describe(prop.description);
    if (!schema.required?.includes(key)) zodType = zodType.optional();
    shape[key] = zodType;
  }
  return z.object(shape);
}

describe('convertJsonSchemaToZod', () => {
  test('returns empty object for null schema', () => {
    const schema = convertJsonSchemaToZod(null);
    const result = schema.safeParse({});
    assert.equal(result.success, true);
  });

  test('returns empty object for schema with no properties', () => {
    const schema = convertJsonSchemaToZod({ type: 'object' });
    const result = schema.safeParse({});
    assert.equal(result.success, true);
  });

  test('maps string type correctly', () => {
    const schema = convertJsonSchemaToZod({
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
    });
    assert.equal(schema.shape.name instanceof z.ZodString, true);
    assert.equal(schema.safeParse({ name: 'hello' }).success, true);
    assert.equal(schema.safeParse({ name: 123 }).success, false);
  });

  test('maps number type correctly', () => {
    const schema = convertJsonSchemaToZod({
      type: 'object',
      properties: { count: { type: 'number' } },
      required: ['count'],
    });
    assert.equal(schema.safeParse({ count: 42 }).success, true);
    assert.equal(schema.safeParse({ count: 'not-a-number' }).success, false);
  });

  test('maps integer type to z.number()', () => {
    const schema = convertJsonSchemaToZod({
      type: 'object',
      properties: { age: { type: 'integer' } },
      required: ['age'],
    });
    assert.equal(schema.safeParse({ age: 30 }).success, true);
  });

  test('maps boolean type correctly', () => {
    const schema = convertJsonSchemaToZod({
      type: 'object',
      properties: { active: { type: 'boolean' } },
      required: ['active'],
    });
    assert.equal(schema.safeParse({ active: true }).success, true);
    assert.equal(schema.safeParse({ active: 'true' }).success, false);
  });

  test('maps array type correctly', () => {
    const schema = convertJsonSchemaToZod({
      type: 'object',
      properties: { items: { type: 'array' } },
      required: ['items'],
    });
    assert.equal(schema.safeParse({ items: [1, 2, 3] }).success, true);
    assert.equal(schema.safeParse({ items: 'not-array' }).success, false);
  });

  test('required fields fail when missing', () => {
    const schema = convertJsonSchemaToZod({
      type: 'object',
      properties: {
        location: { type: 'string' },
        units: { type: 'string' },
      },
      required: ['location'],
    });
    // missing required 'location' should fail
    assert.equal(schema.safeParse({ units: 'celsius' }).success, false);
    // with location should pass
    assert.equal(schema.safeParse({ location: 'NYC', units: 'celsius' }).success, true);
  });

  test('optional fields can be omitted', () => {
    const schema = convertJsonSchemaToZod({
      type: 'object',
      properties: {
        required_field: { type: 'string' },
        optional_field: { type: 'string' },
      },
      required: ['required_field'],
    });
    assert.equal(schema.safeParse({ required_field: 'hi' }).success, true);
  });

  test('handles unknown types via z.any()', () => {
    const schema = convertJsonSchemaToZod({
      type: 'object',
      properties: { data: { type: 'object' } },
    });
    assert.equal(schema.safeParse({ data: { nested: true } }).success, true);
    assert.equal(schema.safeParse({ data: 42 }).success, true);
  });

  test('complex tool schema (e.g. weather tool)', () => {
    const mcpSchema = {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'City and state' },
        units: { type: 'string', description: 'celsius or fahrenheit' },
      },
      required: ['location'],
    };
    const schema = convertJsonSchemaToZod(mcpSchema);
    assert.equal(schema.safeParse({ location: 'San Francisco, CA' }).success, true);
    assert.equal(schema.safeParse({ location: 'NYC', units: 'celsius' }).success, true);
    assert.equal(schema.safeParse({}).success, false); // missing required location
  });
});
