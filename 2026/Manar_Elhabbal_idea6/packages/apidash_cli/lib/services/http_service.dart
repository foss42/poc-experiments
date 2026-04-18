import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:apidash_cli/models/request_model.dart';
import 'package:apidash_cli/models/respond_model.dart';
import '../models/name_value_model.dart' as local;

class HttpService {
  Future<ResponseModel> sendRequest({
    required RequestMethod method,
    required String url,
    List<local.NameValueModel>? headers,
    dynamic body,
  }) async {
    final uri = Uri.parse(url);
    final Map<String, String> mappedHeaders = {
      for (var h in headers ?? []) h.name: h.value
    };

    http.Response response;
    switch (method) {
      case RequestMethod.get:
        response = await http.get(uri, headers: mappedHeaders);
        break;
      case RequestMethod.post:
        response = await http.post(uri, headers: mappedHeaders, body: body);
        break;
      case RequestMethod.put:
        response = await http.put(uri, headers: mappedHeaders, body: body);
        break;
      case RequestMethod.patch:
        response = await http.patch(uri, headers: mappedHeaders, body: body);
        break;
      case RequestMethod.delete:
        response = await http.delete(uri, headers: mappedHeaders, body: body);
        break;
    }

    dynamic parsedBody = response.body;
    try {
      parsedBody = jsonDecode(response.body);
    } catch (_) {}

    return ResponseModel(
      statusCode: response.statusCode,
      body: parsedBody,
      bodyBytes: response.bodyBytes,
      headers: response.headers.entries
          .map((e) => local.NameValueModel(name: e.key, value: e.value))
          .toList(),
    );
  }
}
