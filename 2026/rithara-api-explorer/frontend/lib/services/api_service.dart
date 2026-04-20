import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:flutter/foundation.dart';
import '../models/api_item.dart';

part 'api_service.g.dart';

class ApiService {
  final Dio _dio;
  final String baseUrl;

  ApiService(this._dio)
      : baseUrl = kReleaseMode
            ? 'apidash-explorer/marketplace/'
            : 'http://127.0.0.1:8000/';

  Future<List<ApiItem>> fetchApis() async {
    try {
      print('DEBUG: Fetching APIs from ${baseUrl}index.json');
      final response = await _dio.get(
        '${baseUrl}index.json',
        options: Options(responseType: ResponseType.json),
      );
      print('DEBUG: Status Code: ${response.statusCode}');
      
      if (response.statusCode == 200) {
        final Map<String, dynamic> data;
        if (response.data is String) {
          data = jsonDecode(response.data as String) as Map<String, dynamic>;
        } else {
          data = response.data as Map<String, dynamic>;
        }
        
        final List<dynamic> apiList = data['apis'] ?? [];
        print('DEBUG: Found ${apiList.length} APIs');
        return apiList.map((json) => ApiItem.fromMarketplaceJson(json as Map<String, dynamic>)).toList();
      }
      throw Exception('Failed to load APIs: ${response.statusCode}');
    } catch (e) {
      print('DEBUG: Fetch Error: $e');
      throw Exception('Error fetching APIs: $e');
    }
  }

  Future<Map<String, dynamic>> fetchApiTemplates(String templatePath) async {
    try {
      // templatePath is usually "apis/{api_id}/templates.json"
      final response = await _dio.get('$baseUrl$templatePath');
      if (response.statusCode == 200) {
        return response.data as Map<String, dynamic>;
      }
      throw Exception('Failed to load templates: ${response.statusCode}');
    } catch (e) {
      throw Exception('Error fetching templates: $e');
    }
  }
}

@riverpod
ApiService apiService(Ref ref) {
  return ApiService(Dio());
}
