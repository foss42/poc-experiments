import '../models/api_submission.dart';
import '../models/api_endpoint.dart';

final List<ApiSubmission> mockSubmissions = [
  ApiSubmission(
    id: 's1',
    name: 'News API',
    description: 'Get breaking news headlines and search for articles',
    longDescription:
        'Access worldwide news articles from over 80,000 sources. Search, filter by date, language, and source. Perfect for building news aggregators and media monitoring tools.',
    category: 'media',
    tags: ['news', 'media', 'articles'],
    version: '2.0.0',
    baseUrl: 'https://newsapi.org/v2',
    documentation: 'https://newsapi.org/docs',
    authType: 'apiKey',
    endpoints: [
      ApiEndpoint(method: 'GET', path: '/top-headlines', description: 'Get top headlines'),
      ApiEndpoint(method: 'GET', path: '/everything',    description: 'Search all articles'),
    ],
    githubRepo: 'https://github.com/newsapi/newsapi-docs',
    submittedBy: 'john.doe@example.com',
    submittedDate: '2026-03-07',
    status: SubmissionStatus.pending,
  ),
  ApiSubmission(
    id: 's2',
    name: 'Recipe API',
    description: 'Search and discover cooking recipes from around the world',
    longDescription:
        'Comprehensive recipe database with nutritional information, ingredient lists, and cooking instructions. Includes dietary filters and meal planning features.',
    category: 'data',
    tags: ['recipes', 'food', 'cooking'],
    version: '1.0.0',
    baseUrl: 'https://api.recipes.com/v1',
    documentation: 'https://docs.recipes.com',
    authType: 'apiKey',
    endpoints: [
      ApiEndpoint(method: 'GET', path: '/recipes/search', description: 'Search recipes'),
      ApiEndpoint(method: 'GET', path: '/recipes/{id}',   description: 'Get recipe details'),
    ],
    submittedBy: 'sarah.chef@example.com',
    submittedDate: '2026-03-06',
    status: SubmissionStatus.approved,
    reviewNotes: 'Great API! Documentation is clear and endpoints are well-structured.',
    reviewedBy: 'admin@apidash.dev',
    reviewedDate: '2026-03-07',
  ),
  ApiSubmission(
    id: 's3',
    name: 'Translation API',
    description: 'Translate text between 100+ languages',
    longDescription:
        'Real-time translation API supporting over 100 languages with high accuracy. Includes language detection and pronunciation guides.',
    category: 'ai',
    tags: ['translation', 'language', 'nlp'],
    version: '1.5.0',
    baseUrl: 'https://api.translate.example.com',
    documentation: 'https://docs.translate.example.com',
    authType: 'bearer',
    endpoints: [
      ApiEndpoint(method: 'POST', path: '/translate',  description: 'Translate text'),
      ApiEndpoint(method: 'GET',  path: '/languages',  description: 'List supported languages'),
    ],
    submittedBy: 'translator@example.com',
    submittedDate: '2026-03-05',
    status: SubmissionStatus.needsChanges,
    reviewNotes:
        'Please add more endpoint examples and update the authentication documentation.',
    reviewedBy: 'admin@apidash.dev',
    reviewedDate: '2026-03-06',
  ),
];

List<ApiSubmission> getUserSubmissions(String email) =>
    mockSubmissions.where((s) => s.submittedBy == email).toList();

List<ApiSubmission> getPendingSubmissions() =>
    mockSubmissions.where((s) => s.status == SubmissionStatus.pending).toList();