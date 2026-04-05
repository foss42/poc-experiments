import 'package:flutter/material.dart';
import 'ui/app.dart';
import 'core/models/workflow.dart';
import 'core/models/workflow_node.dart';
import 'core/models/workflow_edge.dart';

void main() {
  runApp(AgenticTestingApp(workflows: [_crudFlow, _userPostsFlow, _authFlow]));
}

final _crudFlow = Workflow(
  id: 'crud-flow',
  name: 'CRUD Flow',
  description: 'List → Read → Update → Delete with variable chaining',
  nodes: [
    WorkflowNode(
      id: 'list', name: 'List Posts', method: HTTPMethod.get,
      url: 'https://jsonplaceholder.typicode.com/posts?_limit=3',
      extractionRules: [
        ExtractionRule(variableName: 'post_id', jsonPath: '[0].id'),
        ExtractionRule(variableName: 'user_id', jsonPath: '[0].userId'),
      ],
    ),
    WorkflowNode(
      id: 'read', name: 'Fetch Post', method: HTTPMethod.get,
      url: 'https://jsonplaceholder.typicode.com/posts/{{post_id}}',
      extractionRules: [ExtractionRule(variableName: 'post_title', jsonPath: 'title')],
    ),
    WorkflowNode(
      id: 'update', name: 'Update Post', method: HTTPMethod.put,
      url: 'https://jsonplaceholder.typicode.com/posts/{{post_id}}',
      headers: {'Content-Type': 'application/json'},
      body: '{"title": "Updated by DCG", "body": "Modified", "userId": 1}',
    ),
    WorkflowNode(
      id: 'delete', name: 'Delete Post', method: HTTPMethod.delete,
      url: 'https://jsonplaceholder.typicode.com/posts/{{post_id}}',
    ),
  ],
  edges: [
    WorkflowEdge(from: 'list', to: 'read'),
    WorkflowEdge(from: 'read', to: 'update'),
    WorkflowEdge(from: 'update', to: 'delete'),
  ],
);

final _userPostsFlow = Workflow(
  id: 'user-posts',
  name: 'User + Posts',
  description: 'Fetch user → their posts → comments on first post',
  nodes: [
    WorkflowNode(
      id: 'get-user', name: 'Get User', method: HTTPMethod.get,
      url: 'https://jsonplaceholder.typicode.com/users/1',
      extractionRules: [
        ExtractionRule(variableName: 'user_id', jsonPath: 'id'),
        ExtractionRule(variableName: 'username', jsonPath: 'username'),
      ],
    ),
    WorkflowNode(
      id: 'get-posts', name: 'Get User Posts', method: HTTPMethod.get,
      url: 'https://jsonplaceholder.typicode.com/posts?userId={{user_id}}',
      extractionRules: [ExtractionRule(variableName: 'first_post_id', jsonPath: '[0].id')],
    ),
    WorkflowNode(
      id: 'get-comments', name: 'Get Comments', method: HTTPMethod.get,
      url: 'https://jsonplaceholder.typicode.com/comments?postId={{first_post_id}}',
    ),
  ],
  edges: [
    WorkflowEdge(from: 'get-user', to: 'get-posts'),
    WorkflowEdge(from: 'get-posts', to: 'get-comments'),
  ],
);

final _authFlow = Workflow(
  id: 'auth-flow',
  name: 'Auth Flow',
  description: 'Register → Login → Profile (toggle Simulate Failure for diagnostics)',
  nodes: [
    WorkflowNode(
      id: 'register', name: 'Register User', method: HTTPMethod.get,
      url: 'https://jsonplaceholder.typicode.com/users/3',
      extractionRules: [
        ExtractionRule(variableName: 'user_id', jsonPath: 'id'),
        ExtractionRule(variableName: 'user_email', jsonPath: 'email'),
      ],
    ),
    WorkflowNode(
      id: 'login', name: 'Login', method: HTTPMethod.post,
      url: 'https://jsonplaceholder.typicode.com/posts',
      headers: {'Content-Type': 'application/json'},
      body: '{"username": "{{user_email}}", "password": "secret"}',
      expectedStatus: 201,
      extractionRules: [ExtractionRule(variableName: 'auth_token', jsonPath: 'id')],
    ),
    WorkflowNode(
      id: 'fetch-profile', name: 'Fetch Profile', method: HTTPMethod.get,
      url: 'https://jsonplaceholder.typicode.com/users/{{user_id}}',
      headers: {'Authorization': 'Bearer {{auth_token}}'},
    ),
  ],
  edges: [
    WorkflowEdge(from: 'register', to: 'login'),
    WorkflowEdge(from: 'login', to: 'fetch-profile'),
  ],
);
