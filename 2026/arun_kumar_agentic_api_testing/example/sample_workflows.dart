import 'package:agentic_api_testing/core/models/workflow.dart';
import 'package:agentic_api_testing/core/models/workflow_node.dart';
import 'package:agentic_api_testing/core/models/workflow_edge.dart';

final crudWorkflow = Workflow(
  id: 'crud-flow',
  name: 'JSONPlaceholder CRUD',
  description: 'Create, Read, Update, Delete a post with variable chaining',
  nodes: [
    WorkflowNode(
      id: 'create',
      name: 'Create Post',
      method: 'POST',
      url: 'https://jsonplaceholder.typicode.com/posts',
      headers: {'Content-Type': 'application/json'},
      body: '{"title": "Test Post", "body": "Hello from DCG", "userId": 1}',
      expectedStatus: 201,
      extractionRules: [
        ExtractionRule(variableName: 'post_id', jsonPath: 'id'),
      ],
    ),
    WorkflowNode(
      id: 'read',
      name: 'Fetch Post',
      method: 'GET',
      url: 'https://jsonplaceholder.typicode.com/posts/{{post_id}}',
      expectedStatus: 200,
    ),
    WorkflowNode(
      id: 'update',
      name: 'Update Post',
      method: 'PUT',
      url: 'https://jsonplaceholder.typicode.com/posts/{{post_id}}',
      headers: {'Content-Type': 'application/json'},
      body: '{"title": "Updated Post", "body": "Modified by DCG", "userId": 1}',
      expectedStatus: 200,
    ),
    WorkflowNode(
      id: 'delete',
      name: 'Delete Post',
      method: 'DELETE',
      url: 'https://jsonplaceholder.typicode.com/posts/{{post_id}}',
      expectedStatus: 200,
    ),
  ],
  edges: [
    WorkflowEdge(from: 'create', to: 'read'),
    WorkflowEdge(from: 'read', to: 'update'),
    WorkflowEdge(from: 'update', to: 'delete'),
  ],
);

final userPostsWorkflow = Workflow(
  id: 'user-posts',
  name: 'User + Posts Chain',
  description: 'Fetch user, then their posts, then comments — multi-level extraction',
  nodes: [
    WorkflowNode(
      id: 'get-user',
      name: 'Get User',
      method: 'GET',
      url: 'https://jsonplaceholder.typicode.com/users/1',
      expectedStatus: 200,
      extractionRules: [
        ExtractionRule(variableName: 'user_id', jsonPath: 'id'),
        ExtractionRule(variableName: 'username', jsonPath: 'username'),
      ],
    ),
    WorkflowNode(
      id: 'get-posts',
      name: 'Get User Posts',
      method: 'GET',
      url: 'https://jsonplaceholder.typicode.com/posts?userId={{user_id}}',
      expectedStatus: 200,
      extractionRules: [
        ExtractionRule(variableName: 'first_post_id', jsonPath: '[0].id'),
      ],
    ),
    WorkflowNode(
      id: 'get-comments',
      name: 'Get Comments',
      method: 'GET',
      url: 'https://jsonplaceholder.typicode.com/comments?postId={{first_post_id}}',
      expectedStatus: 200,
    ),
  ],
  edges: [
    WorkflowEdge(from: 'get-user', to: 'get-posts'),
    WorkflowEdge(from: 'get-posts', to: 'get-comments'),
  ],
);

final authFailureWorkflow = Workflow(
  id: 'auth-fail',
  name: 'Auth Failure Demo',
  description: 'Simulates registration then a failing auth request for diagnostics',
  nodes: [
    WorkflowNode(
      id: 'register',
      name: 'Register User',
      method: 'POST',
      url: 'https://jsonplaceholder.typicode.com/posts',
      headers: {'Content-Type': 'application/json'},
      body: '{"username": "testuser", "email": "test@example.com"}',
      expectedStatus: 201,
      extractionRules: [
        ExtractionRule(variableName: 'user_id', jsonPath: 'id'),
      ],
    ),
    WorkflowNode(
      id: 'login',
      name: 'Login',
      method: 'POST',
      url: 'https://jsonplaceholder.typicode.com/posts',
      headers: {'Content-Type': 'application/json'},
      body: '{"username": "testuser", "password": "secret"}',
      expectedStatus: 201,
      extractionRules: [
        ExtractionRule(variableName: 'auth_token', jsonPath: 'id'),
      ],
    ),
    WorkflowNode(
      id: 'fetch-profile',
      name: 'Fetch Profile',
      method: 'GET',
      url: 'https://jsonplaceholder.typicode.com/users/{{user_id}}',
      headers: {'Authorization': 'Bearer {{auth_token}}'},
      expectedStatus: 200,
    ),
  ],
  edges: [
    WorkflowEdge(from: 'register', to: 'login'),
    WorkflowEdge(from: 'login', to: 'fetch-profile'),
  ],
);

final allWorkflows = [crudWorkflow, userPostsWorkflow, authFailureWorkflow];
