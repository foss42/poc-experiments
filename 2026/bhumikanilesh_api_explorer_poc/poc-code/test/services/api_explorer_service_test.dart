import 'dart:io';

import 'package:apidash/models/api_explorer_models.dart';
import 'package:apidash/services/api_explorer_service.dart';
import 'package:apidash/services/hive_services.dart';
import 'package:flutter_test/flutter_test.dart';

import '../providers/helpers.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() async {
    await testSetUpForHive();
    await clearHiveBoxes();
  });

  tearDown(() async {
    await clearHiveBoxes();
  });

  test('seedDemoData stores catalog and import-ready requests', () async {
    final service = ApiExplorerService();

    await service.seedDemoData();

    final catalog = service.getCatalog();
    expect(catalog, isNotEmpty);
    expect(catalog.first.title, isNotEmpty);

    final details = service.getApiDetails('stripe-demo');
    expect(details, isNotNull);
    final request = service.buildRequestModel(
      details!,
      details.endpoints.firstWhere((endpoint) => endpoint.method.name == 'post'),
    );
    expect(request.url, contains('/customers'));
    expect(request.method.name, 'post');
  });

  test('low ratings create remediation queue items', () async {
    final service = ApiExplorerService();

    await service.seedDemoData();
    await service.submitReview(
      apiId: 'stripe-demo',
      userId: 'demo-user',
      rating: 1,
      comment: 'Request body is missing auth guidance',
    );

    final reviews = service.getReviews(apiId: 'stripe-demo');
    final remediations = service.getRemediations();

    expect(reviews, hasLength(1));
    expect(remediations, hasLength(1));
    expect(remediations.first.trigger, 'bad_review');
  });

  test('syncFromPipelineRoot imports pipeline outputs', () async {
    final service = ApiExplorerService();
    final root = await Directory.systemTemp.createTemp('api-explorer-pipeline');
    final marketplaceDir = Directory('${root.path}${Platform.pathSeparator}marketplace');
    final apisDir = Directory('${marketplaceDir.path}${Platform.pathSeparator}apis');
    await apisDir.create(recursive: true);

    final indexFile = File('${marketplaceDir.path}${Platform.pathSeparator}index.json');
    await indexFile.writeAsString(
      '''
{
  "weather-api": {
    "id": "weather-api",
    "title": "Weather API",
    "description": "Forecast API",
    "categories": ["Weather"],
    "requires_auth": false,
    "source": "pipeline",
    "filename": "weather-api.json"
  }
}
''',
    );

    final apiFile = File('${apisDir.path}${Platform.pathSeparator}weather-api.json');
    await apiFile.writeAsString(
      '''
{
  "id": "weather-api",
  "info": {
    "title": "Weather API",
    "description": "Forecast API",
    "base_url": "https://weather.example.com",
    "version": "1.0.0",
    "source": "https://weather.example.com/openapi.json",
    "tags": ["weather"]
  },
  "requests": [
    {
      "id": "get-forecast",
      "method": "get",
      "path": "/forecast",
      "name": "Get forecast",
      "description": "Returns forecast",
      "params": [
        {"name": "city", "value": "Bengaluru"}
      ],
      "response_example": {"temp_c": 26}
    }
  ]
}
''',
    );

    await service.syncFromPipelineRoot(root.path);

    final catalog = service.getCatalog();
    final details = service.getApiDetails('weather-api');

    expect(catalog.map((api) => api.id), contains('weather-api'));
    expect(details, isNotNull);
    expect(details!.endpoints.single.path, '/forecast');
  });
}
