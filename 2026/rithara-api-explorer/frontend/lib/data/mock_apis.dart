import '../models/api_item.dart';
import '../models/api_endpoint.dart';
import '../models/api_review.dart';

final List<ApiItem> mockApis = [
  ApiItem(
    id: '1',
    name: 'Blog Post API',
    description: 'API for managing blog posts',
    longDescription:
        'A comprehensive RESTful API for managing blog posts, including CRUD operations, filtering, pagination, and search functionality. Perfect for building modern blog platforms and content management systems.',
    category: 'developer',
    tags: ['blog', 'posts', 'cms'],
    version: '1.0.0',
    baseUrl: 'https://api.example.com/v1',
    documentation: 'https://docs.example.com/blog-api',
    authType: 'apiKey',
    rating: 4.5,
    totalReviews: 128,
    popularity: 850,
    icon: '📝',
    updated: '2026-03-05',
    added: '',
    unofficial: false,
    provider: 'Example Inc',
    providerUrl: '',
    endpoints: [
      ApiEndpoint(
        method: 'GET',
        path: '/posts',
        description: 'Get all blog posts',
        parameters: [
          ApiParameter(name: 'page',  location: 'query', type: 'integer', required: false, description: 'Page number'),
          ApiParameter(name: 'limit', location: 'query', type: 'integer', required: false, description: 'Items per page'),
        ],
      ),
      ApiEndpoint(
        method: 'POST',
        path: '/posts',
        description: 'Create a new blog post',
        requestBody: {'type': 'object', 'example': {'title': 'string', 'content': 'string', 'author': 'string'}},
      ),
      ApiEndpoint(method: 'GET',    path: '/posts/{id}', description: 'Get a specific blog post'),
      ApiEndpoint(method: 'PUT',    path: '/posts/{id}', description: 'Update a blog post'),
      ApiEndpoint(method: 'DELETE', path: '/posts/{id}', description: 'Delete a blog post'),
    ],
    sampleCode: {
      'curl': '''curl -X GET "https://api.example.com/v1/posts" \\
  -H "Authorization: Bearer YOUR_API_KEY"''',
      'javascript': '''fetch('https://api.example.com/v1/posts', {
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY'
  }
})
.then(res => res.json())
.then(data => console.log(data));''',
      'python': '''import requests

response = requests.get(
    'https://api.example.com/v1/posts',
    headers={'Authorization': 'Bearer YOUR_API_KEY'}
)
print(response.json())''',
    },
    reviews: [
      ApiReview(id: 'r1', author: 'Sarah Johnson', rating: 5, comment: 'Excellent API! Very well documented and easy to integrate. The response times are consistently fast.', date: '2026-03-01', helpful: 24),
      ApiReview(id: 'r2', author: 'Mike Chen',     rating: 4, comment: 'Great for basic blog functionality. Would love to see more advanced filtering options.',             date: '2026-02-28', helpful: 12),
    ],
  ),

  ApiItem(
    id: '2',
    name: 'E-commerce API',
    description: 'API for managing products, orders, and customers in an e-commerce platform',
    longDescription:
        'A robust e-commerce API that provides complete functionality for online stores. Includes product catalog management, inventory tracking, order processing, customer management, payment integration, and comprehensive analytics.',
    category: 'ecommerce',
    tags: ['ecommerce', 'products', 'orders', 'customers'],
    version: '2.1.0',
    baseUrl: 'https://api.ecommerce.example.com',
    documentation: 'https://docs.ecommerce.example.com',
    authType: 'oauth2',
    rating: 4.7,
    totalReviews: 342,
    popularity: 1250,
    icon: '🛍️',
    updated: '2026-03-07',
    added: '',
    unofficial: false,
    provider: 'ShopCore',
    providerUrl: '',
    endpoints: [
      ApiEndpoint(method: 'GET',  path: '/products',  description: 'List all products with filtering and pagination'),
      ApiEndpoint(method: 'POST', path: '/products',  description: 'Create a new product'),
      ApiEndpoint(method: 'GET',  path: '/orders',    description: 'Get all orders'),
      ApiEndpoint(method: 'POST', path: '/orders',    description: 'Create a new order'),
      ApiEndpoint(method: 'GET',  path: '/customers', description: 'List all customers'),
    ],
    sampleCode: {
      'curl': '''curl -X GET "https://api.ecommerce.example.com/products" \\
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"''',
      'javascript': '''const response = await fetch('https://api.ecommerce.example.com/products', {
  headers: {
    'Authorization': 'Bearer YOUR_ACCESS_TOKEN'
  }
});
const products = await response.json();''',
      'python': '''import requests

headers = {'Authorization': 'Bearer YOUR_ACCESS_TOKEN'}
response = requests.get('https://api.ecommerce.example.com/products', headers=headers)
products = response.json()''',
    },
    reviews: [
      ApiReview(id: 'r3', author: 'Alex Kumar', rating: 5, comment: 'Perfect for building online stores. The OAuth2 implementation is secure and straightforward.', date: '2026-03-05', helpful: 45),
    ],
  ),

  ApiItem(
    id: '3',
    name: 'Order Processing API',
    description: 'API for processing customer orders and checking order status',
    longDescription:
        'Specialized API for order management and fulfillment. Handles order creation, status tracking, payment processing, shipping integration, and real-time notifications. Ideal for logistics and fulfillment systems.',
    category: 'ecommerce',
    tags: ['orders', 'ecommerce', 'processing'],
    version: '1.2.0',
    baseUrl: 'https://api.orders.example.com',
    documentation: 'https://docs.orders.example.com',
    authType: 'apiKey',
    rating: 4.3,
    totalReviews: 89,
    popularity: 620,
    icon: '📦',
    updated: '2026-03-02',
    added: '',
    unofficial: false,
    provider: 'OrderFlow',
    providerUrl: '',
    endpoints: [
      ApiEndpoint(method: 'POST', path: '/orders',            description: 'Create a new order'),
      ApiEndpoint(method: 'GET',  path: '/orders/{id}/status',description: 'Check order status'),
      ApiEndpoint(method: 'PUT',  path: '/orders/{id}/cancel',description: 'Cancel an order'),
    ],
    sampleCode: {},
    reviews: [],
  ),

  ApiItem(
    id: '4',
    name: 'Swagger Petstore',
    description: 'API for managing pets in the pet store',
    longDescription:
        'The classic Swagger Petstore API - a comprehensive example API demonstrating OpenAPI 3.0 specification. Includes pet management, store inventory, and user operations. Widely used for API testing and learning.',
    category: 'developer',
    tags: ['pets', 'petstore', 'api'],
    version: '3.0.0',
    baseUrl: 'https://petstore.swagger.io/v2',
    documentation: 'https://petstore.swagger.io',
    authType: 'none',
    rating: 4.8,
    totalReviews: 520,
    popularity: 2100,
    icon: '🐾',
    updated: '2026-03-08',
    added: '',
    unofficial: false,
    provider: 'SmartBear',
    providerUrl: '',
    endpoints: [
      ApiEndpoint(method: 'GET',  path: '/pet/findByStatus', description: 'Find pets by status'),
      ApiEndpoint(method: 'POST', path: '/pet',              description: 'Add a new pet to the store'),
      ApiEndpoint(method: 'GET',  path: '/store/inventory',  description: 'Returns pet inventories by status'),
    ],
    sampleCode: {},
    reviews: [
      ApiReview(id: 'r4', author: 'Emma Watson', rating: 5, comment: 'The go-to example API for learning REST principles. Clean, well-structured, and perfect for testing.', date: '2026-03-07', helpful: 89),
    ],
  ),

  ApiItem(
    id: '5',
    name: 'Product Catalog API',
    description: 'API for managing a product catalog, including listing and adding products',
    longDescription:
        'Flexible product catalog API with advanced search, filtering, categorization, and inventory management. Supports multi-currency pricing, product variants, bulk operations, and real-time stock updates.',
    category: 'ecommerce',
    tags: ['products', 'catalog', 'e-commerce'],
    version: '1.5.0',
    baseUrl: 'https://api.catalog.example.com',
    documentation: 'https://docs.catalog.example.com',
    authType: 'bearer',
    rating: 4.4,
    totalReviews: 156,
    popularity: 780,
    icon: '📋',
    updated: '2026-02-28',
    added: '',
    unofficial: true,
    provider: 'CatalogPro',
    providerUrl: '',
    endpoints: [
      ApiEndpoint(method: 'GET',  path: '/products',   description: 'Get all products'),
      ApiEndpoint(method: 'POST', path: '/products',   description: 'Add a new product'),
      ApiEndpoint(method: 'GET',  path: '/categories', description: 'List all categories'),
    ],
    sampleCode: {},
    reviews: [],
  ),

  ApiItem(
    id: '6',
    name: 'User Management API',
    description: 'API for managing user accounts, including registration, retrieval, and updates',
    longDescription:
        'Complete user management solution with authentication, authorization, profile management, role-based access control, and security features. Includes password reset, email verification, and activity logging.',
    category: 'developer',
    tags: ['users', 'management', 'authentication'],
    version: '2.0.0',
    baseUrl: 'https://api.users.example.com',
    documentation: 'https://docs.users.example.com',
    authType: 'oauth2',
    rating: 4.6,
    totalReviews: 234,
    popularity: 980,
    icon: '👤',
    updated: '2026-03-04',
    added: '',
    unofficial: false,
    provider: 'AuthPro',
    providerUrl: '',
    endpoints: [
      ApiEndpoint(method: 'POST', path: '/users/{id}', description: 'Register a new user'),
      ApiEndpoint(method: 'GET',  path: '/users/{id}', description: 'Get user details'),
      ApiEndpoint(method: 'PUT',  path: '/users/{id}', description: 'Update user information'),
    ],
    sampleCode: {},
    reviews: [
      ApiReview(id: 'r5', author: 'David Lee', rating: 5, comment: "Best user management API I've used. The OAuth2 flow is seamless and the documentation is top-notch.", date: '2026-03-06', helpful: 67),
    ],
  ),

  ApiItem(
    id: '7',
    name: 'Weather API',
    description: 'Real-time weather data and forecasts for any location',
    longDescription:
        'Comprehensive weather API providing current conditions, hourly forecasts, 14-day forecasts, historical data, and severe weather alerts. Includes air quality, UV index, and astronomical data for over 200,000 locations worldwide.',
    category: 'weather',
    tags: ['weather', 'forecast', 'climate'],
    version: '3.0.0',
    baseUrl: 'https://api.weather.example.com',
    documentation: 'https://docs.weather.example.com',
    authType: 'apiKey',
    rating: 4.9,
    totalReviews: 1240,
    popularity: 3500,
    icon: '⛅',
    updated: '2026-03-01',
    added: '',
    unofficial: false,
    provider: 'WeatherLab',
    providerUrl: '',
    endpoints: [
      ApiEndpoint(method: 'GET', path: '/current',  description: 'Get current weather'),
      ApiEndpoint(method: 'GET', path: '/forecast', description: 'Get weather forecast'),
      ApiEndpoint(method: 'GET', path: '/alerts',   description: 'Get weather alerts'),
    ],
    sampleCode: {},
    reviews: [
      ApiReview(id: 'r6', author: 'Lisa Zhang', rating: 5, comment: 'Incredibly accurate and fast. The data quality is exceptional and the API is very reliable.', date: '2026-03-08', helpful: 156),
    ],
  ),

  ApiItem(
    id: '8',
    name: 'OpenAI API',
    description: 'Access powerful AI models for text generation, analysis, and more',
    longDescription:
        'State-of-the-art AI API providing access to GPT-4, GPT-3.5, DALL-E, Whisper, and Embeddings. Build intelligent applications with natural language processing, content generation, code completion, and image generation.',
    category: 'ai',
    tags: ['ai', 'gpt', 'machine-learning', 'nlp'],
    version: '1.0.0',
    baseUrl: 'https://api.openai.com/v1',
    documentation: 'https://platform.openai.com/docs',
    authType: 'bearer',
    rating: 4.8,
    totalReviews: 2850,
    popularity: 8900,
    icon: '🤖',
    updated: '2026-03-06',
    added: '2023-01-15',
    unofficial: false,
    provider: 'OpenAI',
    providerUrl: 'https://openai.com',
    versions: ['1.0.0', '0.28.0', '0.27.0'],
    preferredVersion: '1.0.0',
    openapiVersion: '3.0.0',
    specUrl: 'https://api.openai.com/v1/openapi.json',
    contactEmail: 'support@openai.com',
    license: ApiLicense(name: 'MIT License', url: 'https://opensource.org/licenses/MIT'),
    termsOfService: 'https://openai.com/terms',
    authDetails: ApiAuthDetails(parameterName: 'Authorization', location: 'header'),
    registrationUrl: 'https://platform.openai.com/signup',
    githubUrl: 'https://github.com/openai/openai-openapi',
    changelog: [
      ApiChangelog(version: '1.0.0',  date: '2026-03-06', changes: ['Added GPT-4 Turbo model', 'Improved response times', 'Updated pricing structure']),
      ApiChangelog(version: '0.28.0', date: '2025-12-15', changes: ['Added function calling support', 'New embedding models', 'Bug fixes']),
    ],
    endpoints: [
      ApiEndpoint(
        method: 'POST',
        path: '/chat/completions',
        description: 'Create chat completion',
        parameters: [
          ApiParameter(name: 'model',       location: 'body', type: 'string',  required: true,  description: 'ID of the model to use'),
          ApiParameter(name: 'messages',    location: 'body', type: 'array',   required: true,  description: 'Messages to generate chat completions'),
          ApiParameter(name: 'temperature', location: 'body', type: 'number',  required: false, description: 'Sampling temperature between 0 and 2'),
          ApiParameter(name: 'max_tokens',  location: 'body', type: 'integer', required: false, description: 'Maximum number of tokens to generate'),
        ],
        requestBody: {
          'type': 'object',
          'example': {'model': 'gpt-4', 'messages': [{'role': 'user', 'content': 'Hello, how are you?'}], 'temperature': 0.7},
        },
        responses: {
          '200': ApiEndpointResponse(description: 'Successful response', example: {'id': 'chatcmpl-123', 'object': 'chat.completion'}),
          '400': ApiEndpointResponse(description: 'Bad request',         example: {'error': {'message': 'Invalid request parameters'}}),
          '401': ApiEndpointResponse(description: 'Authentication failed',example: {'error': {'message': 'Incorrect API key provided'}}),
        },
      ),
      ApiEndpoint(
        method: 'POST',
        path: '/completions',
        description: 'Create text completion',
        parameters: [
          ApiParameter(name: 'model',  location: 'body', type: 'string', required: true, description: 'ID of the model to use'),
          ApiParameter(name: 'prompt', location: 'body', type: 'string', required: true, description: 'The prompt to generate completions for'),
        ],
        requestBody: {
          'type': 'object',
          'example': {'model': 'gpt-3.5-turbo-instruct', 'prompt': 'Write a haiku about programming', 'max_tokens': 50},
        },
        responses: {
          '200': ApiEndpointResponse(description: 'Successful response', example: {'id': 'cmpl-123', 'object': 'text_completion'}),
        },
      ),
      ApiEndpoint(
        method: 'POST',
        path: '/images/generations',
        description: 'Generate images',
        parameters: [
          ApiParameter(name: 'prompt', location: 'body', type: 'string',  required: true,  description: 'Text description of the desired image(s)'),
          ApiParameter(name: 'n',      location: 'body', type: 'integer', required: false, description: 'Number of images to generate (1-10)'),
          ApiParameter(name: 'size',   location: 'body', type: 'string',  required: false, description: 'Size of the generated images'),
        ],
        requestBody: {
          'type': 'object',
          'example': {'prompt': 'A white siamese cat', 'n': 1, 'size': '1024x1024'},
        },
        responses: {
          '200': ApiEndpointResponse(description: 'Successful response', example: {'created': 1589478378, 'data': [{'url': 'https://...'}]}),
        },
      ),
    ],
    sampleCode: {
      'curl': r'''curl https://api.openai.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello!"}]
  }' ''',
      'javascript': '''const OpenAI = require('openai');
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const completion = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [
    {"role": "user", "content": "Hello!"}
  ]
});

console.log(completion.choices[0].message);''',
      'python': '''from openai import OpenAI
client = OpenAI(api_key="YOUR_API_KEY")

completion = client.chat.completions.create(
  model="gpt-4",
  messages=[
    {"role": "user", "content": "Hello!"}
  ]
)

print(completion.choices[0].message)''',
    },
    reviews: [
      ApiReview(id: 'r7',  author: 'Tom Anderson',   rating: 5, comment: 'Revolutionary AI capabilities. The quality of responses is amazing and the API is well-designed.',                       date: '2026-03-07', helpful: 234),
      ApiReview(id: 'r7b', author: 'Jessica Miller',  rating: 5, comment: 'GPT-4 is incredibly powerful. The API is straightforward and documentation is comprehensive.',                           date: '2026-03-05', helpful: 189),
      ApiReview(id: 'r7c', author: 'Chris Wong',      rating: 4, comment: 'Great API but can be expensive for high-volume use cases. Quality is excellent though.',                                 date: '2026-03-02', helpful: 145),
      ApiReview(id: 'r7d', author: 'Maya Patel',      rating: 5, comment: 'Best AI API on the market. Response quality is consistently excellent across all models.',                               date: '2026-02-28', helpful: 178),
      ApiReview(id: 'r7e', author: 'Robert Kim',      rating: 4, comment: 'Very powerful but rate limits can be frustrating. Overall great experience.',                                            date: '2026-02-25', helpful: 92),
    ],
  ),

  ApiItem(
    id: '9',
    name: 'Stripe Payment API',
    description: 'Process payments, manage subscriptions, and handle financial transactions',
    longDescription:
        'Industry-leading payment processing API supporting credit cards, digital wallets, bank transfers, and 135+ currencies. Includes subscription management, invoicing, fraud detection, and comprehensive financial reporting.',
    category: 'finance',
    tags: ['payments', 'stripe', 'finance', 'transactions'],
    version: '2023-10-16',
    baseUrl: 'https://api.stripe.com/v1',
    documentation: 'https://stripe.com/docs/api',
    authType: 'bearer',
    rating: 4.9,
    totalReviews: 3420,
    popularity: 7800,
    icon: '💳',
    updated: '2026-03-03',
    added: '',
    unofficial: false,
    provider: 'Stripe',
    providerUrl: '',
    endpoints: [
      ApiEndpoint(method: 'POST', path: '/payment_intents', description: 'Create a payment intent'),
      ApiEndpoint(method: 'POST', path: '/customers',       description: 'Create a customer'),
      ApiEndpoint(method: 'POST', path: '/subscriptions',   description: 'Create a subscription'),
    ],
    sampleCode: {},
    reviews: [
      ApiReview(id: 'r8', author: 'Rachel Green', rating: 5, comment: 'The best payment API available. Incredibly reliable, secure, and the documentation is excellent.', date: '2026-03-05', helpful: 289),
    ],
  ),
];

ApiItem? getApiById(String id) {
  try {
    return mockApis.firstWhere((a) => a.id == id);
  } catch (_) {
    return null;
  }
}

List<ApiItem> getApisByCategory(String categoryId) {
  if (categoryId == 'all') return mockApis;
  return mockApis.where((a) => a.category == categoryId).toList();
}

List<ApiItem> searchApis(String query) {
  if (query.isEmpty) return mockApis;
  final q = query.toLowerCase();
  return mockApis.where((a) =>
    a.name.toLowerCase().contains(q) ||
    a.description.toLowerCase().contains(q) ||
    a.provider.toLowerCase().contains(q) ||
    a.tags.any((t) => t.toLowerCase().contains(q)),
  ).toList();
}