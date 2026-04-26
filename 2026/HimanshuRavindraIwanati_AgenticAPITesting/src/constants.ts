// import type { ParsedSpec } from "./types.js";

// export const BASE_URL = "https://petstore3.swagger.io/api/v3";

// // ─── Hardcoded Petstore OpenAPI 3.0 Spec ────────────────────────────────────
// // Source: https://petstore3.swagger.io/api/v3/openapi.json
// // 10 endpoints across pet / store / user tags

// export const PETSTORE_SPEC: ParsedSpec = {
//   title: "Swagger Petstore - OpenAPI 3.0",
//   baseUrl: BASE_URL,
//   version: "1.0.11",
//   sessionId: "",   // filled at runtime by session store
//   endpoints: [

//     // ── PET endpoints ──────────────────────────────────────────────────────

//     {
//       method: "GET",
//       path: "/pet/findByStatus",
//       summary: "Finds Pets by status",
//       parameters: [
//         {
//           name: "status",
//           in: "query",
//           required: false,
//           schema: {
//             type: "string",
//             example: "available",
//           },
//           description: "Status values that need to be considered for filter. One of: available, pending, sold",
//         },
//       ],
//       responses: {
//         "200": {
//           description: "Successful operation — array of Pet objects",
//           schema: {
//             type: "array",
//             items: {
//               type: "object",
//               properties: {
//                 id:       { type: "integer" },
//                 name:     { type: "string" },
//                 status:   { type: "string" },
//                 category: { type: "object" },
//                 photoUrls:{ type: "array" },
//                 tags:     { type: "array" },
//               },
//             },
//           },
//         },
//         "400": { description: "Invalid status value" },
//       },
//       tags: ["pet"],
//     },

//     {
//       method: "GET",
//       path: "/pet/{petId}",
//       summary: "Find pet by ID",
//       parameters: [
//         {
//           name: "petId",
//           in: "path",
//           required: true,
//           schema: { type: "integer", example: 1 },
//           description: "ID of pet to return",
//         },
//       ],
//       responses: {
//         "200": {
//           description: "Successful operation",
//           schema: {
//             type: "object",
//             properties: {
//               id:        { type: "integer" },
//               name:      { type: "string" },
//               status:    { type: "string" },
//               category:  { type: "object" },
//               photoUrls: { type: "array" },
//               tags:      { type: "array" },
//             },
//           },
//         },
//         "400": { description: "Invalid ID supplied" },
//         "404": { description: "Pet not found" },
//       },
//       tags: ["pet"],
//     },

//     {
//       method: "POST",
//       path: "/pet",
//       summary: "Add a new pet to the store",
//       parameters: [],
//       requestBody: {
//         required: true,
//         schema: {
//           type: "object",
//           required: ["name", "photoUrls"],
//           properties: {
//             id:        { type: "integer" },
//             name:      { type: "string" },
//             status:    { type: "string" },
//             category:  { type: "object" },
//             photoUrls: { type: "array" },
//             tags:      { type: "array" },
//           },
//         },
//         example: {
//           name: "doggie",
//           photoUrls: ["https://example.com/dog.jpg"],
//           status: "available",
//         },
//       },
//       responses: {
//         "200": { description: "Successful operation — created Pet object" },
//         "405": { description: "Invalid input" },
//       },
//       tags: ["pet"],
//     },

//     {
//       method: "PUT",
//       path: "/pet",
//       summary: "Update an existing pet",
//       parameters: [],
//       requestBody: {
//         required: true,
//         schema: {
//           type: "object",
//           required: ["name", "photoUrls"],
//           properties: {
//             id:        { type: "integer" },
//             name:      { type: "string" },
//             status:    { type: "string" },
//             photoUrls: { type: "array" },
//           },
//         },
//         example: {
//           id: 1,
//           name: "doggie-updated",
//           photoUrls: ["https://example.com/dog.jpg"],
//           status: "sold",
//         },
//       },
//       responses: {
//         "200": { description: "Successful operation" },
//         "400": { description: "Invalid ID supplied" },
//         "404": { description: "Pet not found" },
//         "405": { description: "Validation exception" },
//       },
//       tags: ["pet"],
//     },

//     {
//       method: "DELETE",
//       path: "/pet/{petId}",
//       summary: "Deletes a pet by ID",
//       parameters: [
//         {
//           name: "petId",
//           in: "path",
//           required: true,
//           schema: { type: "integer", example: 1 },
//           description: "Pet ID to delete",
//         },
//       ],
//       responses: {
//         "200": { description: "Successful operation" },
//         "400": { description: "Invalid pet value" },
//       },
//       tags: ["pet"],
//     },

//     // ── STORE endpoints ────────────────────────────────────────────────────

//     {
//       method: "GET",
//       path: "/store/inventory",
//       summary: "Returns pet inventories by status",
//       parameters: [],
//       responses: {
//         "200": {
//           description: "Successful operation — map of status codes to quantities",
//           schema: {
//             type: "object",
//             additionalProperties: { type: "integer" },
//           },
//         },
//       },
//       tags: ["store"],
//     },

//     {
//       method: "POST",
//       path: "/store/order",
//       summary: "Place an order for a pet",
//       parameters: [],
//       requestBody: {
//         required: true,
//         schema: {
//           type: "object",
//           properties: {
//             id:       { type: "integer" },
//             petId:    { type: "integer" },
//             quantity: { type: "integer" },
//             shipDate: { type: "string" },
//             status:   { type: "string" },
//             complete: { type: "boolean" },
//           },
//         },
//         example: {
//           petId: 1,
//           quantity: 1,
//           status: "placed",
//           complete: false,
//         },
//       },
//       responses: {
//         "200": {
//           description: "Successful operation — Order object",
//           schema: {
//             type: "object",
//             properties: {
//               id:       { type: "integer" },
//               petId:    { type: "integer" },
//               quantity: { type: "integer" },
//               status:   { type: "string" },
//               complete: { type: "boolean" },
//             },
//           },
//         },
//         "405": { description: "Invalid input" },
//       },
//       tags: ["store"],
//     },

//     {
//       method: "GET",
//       path: "/store/order/{orderId}",
//       summary: "Find purchase order by ID",
//       parameters: [
//         {
//           name: "orderId",
//           in: "path",
//           required: true,
//           schema: { type: "integer", example: 1 },
//           description: "ID of the order to fetch. Use IDs between 1 and 10.",
//         },
//       ],
//       responses: {
//         "200": {
//           description: "Successful operation — Order object",
//           schema: {
//             type: "object",
//             properties: {
//               id:       { type: "integer" },
//               petId:    { type: "integer" },
//               quantity: { type: "integer" },
//               status:   { type: "string" },
//               complete: { type: "boolean" },
//             },
//           },
//         },
//         "400": { description: "Invalid ID supplied" },
//         "404": { description: "Order not found" },
//       },
//       tags: ["store"],
//     },

//     // ── USER endpoints ─────────────────────────────────────────────────────

//     {
//       method: "POST",
//       path: "/user",
//       summary: "Create user",
//       parameters: [],
//       requestBody: {
//         required: true,
//         schema: {
//           type: "object",
//           properties: {
//             id:         { type: "integer" },
//             username:   { type: "string" },
//             firstName:  { type: "string" },
//             lastName:   { type: "string" },
//             email:      { type: "string" },
//             password:   { type: "string" },
//             phone:      { type: "string" },
//             userStatus: { type: "integer" },
//           },
//         },
//         example: {
//           username: "testuser",
//           firstName: "John",
//           lastName: "Doe",
//           email: "john@example.com",
//           password: "secret",
//           phone: "1234567890",
//           userStatus: 1,
//         },
//       },
//       responses: {
//         "200": { description: "Successful operation" },
//         "default": { description: "Successful operation" },
//       },
//       tags: ["user"],
//     },

//     {
//       method: "GET",
//       path: "/user/{username}",
//       summary: "Get user by username",
//       parameters: [
//         {
//           name: "username",
//           in: "path",
//           required: true,
//           schema: { type: "string", example: "theUser" },
//           description: "The username to fetch. Use 'theUser' for a reliable test.",
//         },
//       ],
//       responses: {
//         "200": {
//           description: "Successful operation — User object",
//           schema: {
//             type: "object",
//             properties: {
//               id:         { type: "integer" },
//               username:   { type: "string" },
//               firstName:  { type: "string" },
//               lastName:   { type: "string" },
//               email:      { type: "string" },
//               phone:      { type: "string" },
//               userStatus: { type: "integer" },
//             },
//           },
//         },
//         "400": { description: "Invalid username supplied" },
//         "404": { description: "User not found" },
//       },
//       tags: ["user"],
//     },

//   ],
// };

// // ─── Drift Simulation ────────────────────────────────────────────────────────
// // Simulates a v2 API where Pet.id changed from integer → string prefix format
// // e.g. 1 → "pet_1"  (a common migration when moving to distributed IDs)

// export const DRIFTED_PET_RESPONSE = {
//   id: "pet_1",           // BREAKING: was integer 1, now string "pet_1"
//   name: "doggie",
//   status: "available",
//   category: { id: 1, name: "Dogs" },
//   photoUrls: ["https://example.com/dog.jpg"],
//   tags: [{ id: 0, name: "cute" }],
// };

// // The original assertion that breaks when drift occurs
// export const ORIGINAL_ID_ASSERTION = {
//   field: "response.body.id",
//   operator: "type_is" as const,
//   expected: "integer",
// };

// // The healed assertion — works with the new string-prefixed ID format
// export const HEALED_ID_ASSERTION = {
//   field: "response.body.id",
//   operator: "type_is" as const,
//   expected: "string",
// };

// export const CHARACTER_LIMIT = 50_000;

import type { ParsedSpec } from "./types.js";

export const BASE_URL = "https://petstore3.swagger.io/api/v3";

// ─── Hardcoded Petstore OpenAPI 3.0 Spec ────────────────────────────────────
// Source: https://petstore3.swagger.io/api/v3/openapi.json
// 10 endpoints across pet / store / user tags

export const PETSTORE_SPEC: ParsedSpec = {
  title: "Swagger Petstore - OpenAPI 3.0",
  baseUrl: BASE_URL,
  version: "1.0.11",
  sessionId: "",   // filled at runtime by session store
  endpoints: [

    // ── PET endpoints ──────────────────────────────────────────────────────

    {
      method: "GET",
      path: "/pet/findByStatus",
      summary: "Finds Pets by status",
      parameters: [
        {
          name: "status",
          in: "query",
          required: false,
          schema: {
            type: "string",
            example: "available",
          },
          description: "Status values that need to be considered for filter. One of: available, pending, sold",
        },
      ],
      responses: {
        "200": {
          description: "Successful operation — array of Pet objects",
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id:       { type: "integer" },
                name:     { type: "string" },
                status:   { type: "string" },
                category: { type: "object" },
                photoUrls:{ type: "array" },
                tags:     { type: "array" },
              },
            },
          },
        },
        "400": { description: "Invalid status value" },
      },
      tags: ["pet"],
    },

    {
      method: "GET",
      path: "/pet/{petId}",
      summary: "Find pet by ID",
      parameters: [
        {
          name: "petId",
          in: "path",
          required: true,
          schema: { type: "integer", example: 1 },
          description: "ID of pet to return",
        },
      ],
      responses: {
        "200": {
          description: "Successful operation",
          schema: {
            type: "object",
            properties: {
              id:        { type: "integer" },
              name:      { type: "string" },
              status:    { type: "string" },
              category:  { type: "object" },
              photoUrls: { type: "array" },
              tags:      { type: "array" },
            },
          },
        },
        "400": { description: "Invalid ID supplied" },
        "404": { description: "Pet not found" },
      },
      tags: ["pet"],
    },

    {
      method: "POST",
      path: "/pet",
      summary: "Add a new pet to the store",
      parameters: [],
      requestBody: {
        required: true,
        schema: {
          type: "object",
          required: ["name", "photoUrls"],
          properties: {
            id:        { type: "integer" },
            name:      { type: "string" },
            status:    { type: "string" },
            category:  { type: "object" },
            photoUrls: { type: "array" },
            tags:      { type: "array" },
          },
        },
        example: {
          name: "doggie",
          photoUrls: ["https://example.com/dog.jpg"],
          status: "available",
        },
      },
      responses: {
        "200": { description: "Successful operation — created Pet object" },
        "405": { description: "Invalid input" },
      },
      tags: ["pet"],
    },

    {
      method: "PUT",
      path: "/pet",
      summary: "Update an existing pet",
      parameters: [],
      requestBody: {
        required: true,
        schema: {
          type: "object",
          required: ["name", "photoUrls"],
          properties: {
            id:        { type: "integer" },
            name:      { type: "string" },
            status:    { type: "string" },
            photoUrls: { type: "array" },
          },
        },
        example: {
          id: 1,
          name: "doggie-updated",
          photoUrls: ["https://example.com/dog.jpg"],
          status: "sold",
        },
      },
      responses: {
        "200": { description: "Successful operation" },
        "400": { description: "Invalid ID supplied" },
        "404": { description: "Pet not found" },
        "405": { description: "Validation exception" },
      },
      tags: ["pet"],
    },

    {
      method: "DELETE",
      path: "/pet/{petId}",
      summary: "Deletes a pet by ID",
      parameters: [
        {
          name: "petId",
          in: "path",
          required: true,
          schema: { type: "integer", example: 1 },
          description: "Pet ID to delete",
        },
      ],
      responses: {
        "200": { description: "Successful operation" },
        "400": { description: "Invalid pet value" },
      },
      tags: ["pet"],
    },

    // ── STORE endpoints ────────────────────────────────────────────────────

    {
      method: "GET",
      path: "/store/inventory",
      summary: "Returns pet inventories by status",
      parameters: [],
      responses: {
        "200": {
          description: "Successful operation — map of status codes to quantities",
          schema: {
            type: "object",
            additionalProperties: { type: "integer" },
          },
        },
      },
      tags: ["store"],
    },

    {
      method: "POST",
      path: "/store/order",
      summary: "Place an order for a pet",
      parameters: [],
      requestBody: {
        required: true,
        schema: {
          type: "object",
          properties: {
            id:       { type: "integer" },
            petId:    { type: "integer" },
            quantity: { type: "integer" },
            shipDate: { type: "string" },
            status:   { type: "string" },
            complete: { type: "boolean" },
          },
        },
        example: {
          petId: 1,
          quantity: 1,
          status: "placed",
          complete: false,
        },
      },
      responses: {
        "200": {
          description: "Successful operation — Order object",
          schema: {
            type: "object",
            properties: {
              id:       { type: "integer" },
              petId:    { type: "integer" },
              quantity: { type: "integer" },
              status:   { type: "string" },
              complete: { type: "boolean" },
            },
          },
        },
        "405": { description: "Invalid input" },
      },
      tags: ["store"],
    },

    {
      method: "GET",
      path: "/store/order/{orderId}",
      summary: "Find purchase order by ID",
      parameters: [
        {
          name: "orderId",
          in: "path",
          required: true,
          schema: { type: "integer", example: 1 },
          description: "ID of the order to fetch. Use IDs between 1 and 10.",
        },
      ],
      responses: {
        "200": {
          description: "Successful operation — Order object",
          schema: {
            type: "object",
            properties: {
              id:       { type: "integer" },
              petId:    { type: "integer" },
              quantity: { type: "integer" },
              status:   { type: "string" },
              complete: { type: "boolean" },
            },
          },
        },
        "400": { description: "Invalid ID supplied" },
        "404": { description: "Order not found" },
      },
      tags: ["store"],
    },

    // ── USER endpoints ─────────────────────────────────────────────────────

    {
      method: "POST",
      path: "/user",
      summary: "Create user",
      parameters: [],
      requestBody: {
        required: true,
        schema: {
          type: "object",
          properties: {
            id:         { type: "integer" },
            username:   { type: "string" },
            firstName:  { type: "string" },
            lastName:   { type: "string" },
            email:      { type: "string" },
            password:   { type: "string" },
            phone:      { type: "string" },
            userStatus: { type: "integer" },
          },
        },
        example: {
          username: "testuser",
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
          password: "secret",
          phone: "1234567890",
          userStatus: 1,
        },
      },
      responses: {
        "200": { description: "Successful operation" },
        "default": { description: "Successful operation" },
      },
      tags: ["user"],
    },

    {
      method: "GET",
      path: "/user/{username}",
      summary: "Get user by username",
      parameters: [
        {
          name: "username",
          in: "path",
          required: true,
          schema: { type: "string", example: "theUser" },
          description: "The username to fetch. Use 'theUser' for a reliable test.",
        },
      ],
      responses: {
        "200": {
          description: "Successful operation — User object",
          schema: {
            type: "object",
            properties: {
              id:         { type: "integer" },
              username:   { type: "string" },
              firstName:  { type: "string" },
              lastName:   { type: "string" },
              email:      { type: "string" },
              phone:      { type: "string" },
              userStatus: { type: "integer" },
            },
          },
        },
        "400": { description: "Invalid username supplied" },
        "404": { description: "User not found" },
      },
      tags: ["user"],
    },

  ],
};

// ─── Drift Simulation ────────────────────────────────────────────────────────
// Simulates a v2 API where Pet.id changed from integer → string prefix format
// e.g. 1 → "pet_1"  (a common migration when moving to distributed IDs)

export const DRIFTED_PET_RESPONSE = {
  id: "pet_1",           // BREAKING: was integer 1, now string "pet_1"
  name: "doggie",
  status: "available",
  category: { id: 1, name: "Dogs" },
  photoUrls: ["https://example.com/dog.jpg"],
  tags: [{ id: 0, name: "cute" }],
};

// The original assertion that breaks when drift occurs
export const ORIGINAL_ID_ASSERTION = {
  field: "response.body.id",
  operator: "type_is" as const,
  expected: "integer",
};

// The healed assertion — works with the new string-prefixed ID format
export const HEALED_ID_ASSERTION = {
  field: "response.body.id",
  operator: "type_is" as const,
  expected: "string",
};

// ─── Guaranteed Seed Test ────────────────────────────────────────────────────
// This test case is always injected into the generated suite for GET /pet/{petId}.
// It guarantees the drift simulation has a type_is assertion to detect regardless
// of what the LLM generates — LLM output is non-deterministic and may not always
// produce a type_is assertion for the id field.

export const SEED_PET_ID_TEST = {
  id: "tc_seed_01",
  name: "GET /pet/{petId} — verify id field is integer (drift sentinel)",
  type: "happy_path" as const,
  priority: "high" as const,
  endpoint: "GET /pet/{petId}",
  method: "GET",
  path: "/pet/{petId}",
  pathParams: { petId: 1 },
  queryParams: {},
  requestBody: undefined,
  assertions: [
    { field: "response.status",  operator: "equals"  as const, expected: 200 },
    { field: "response.body.id", operator: "type_is" as const, expected: "integer" },
    { field: "response.body.name", operator: "exists" as const, expected: true },
  ],
  description: "Sentinel test — asserts id is integer. Breaks under v2 string-prefix drift.",
  enabled: true,
};

export const CHARACTER_LIMIT = 50_000;
