import 'package:apidash_cli/models/respond_model.dart';
import 'name_value_model.dart';

enum RequestMethod { get, post, put, patch, delete }

class RequestModel {
  final String id;
  final String name;
  final String url;
  final RequestMethod method;
  final List<NameValueModel> headers;
  final dynamic body;
  final ResponseModel? response;

  RequestModel({
    required this.id,
    required this.name,
    required this.url,
    required this.method,
    this.headers = const [],
    this.body,
    this.response,
  });

  RequestModel copyWith(
      {String? url, RequestMethod? method, ResponseModel? response}) {
    return RequestModel(
      id: id,
      name: name,
      url: url ?? this.url,
      method: method ?? this.method,
      headers: headers,
      body: body,
      response: response ?? this.response,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'url': url,
        'method': method.name,
        'headers': headers.map((e) => e.toJson()).toList(),
        'body': body,
        'response': response?.toJson(),
      };

  factory RequestModel.fromJson(Map<String, dynamic> json) => RequestModel(
        id: json['id'],
        name: json['name'],
        url: json['url'],
        method:
            RequestMethod.values.firstWhere((e) => e.name == json['method']),
        headers: (json['headers'] as List<dynamic>?)
                ?.map((e) =>
                    NameValueModel.fromJson(Map<String, dynamic>.from(e)))
                .toList() ??
            [],
        body: json['body'],
        response: json['response'] != null
            ? ResponseModel.fromJson(
                Map<String, dynamic>.from(json['response']))
            : null,
      );
}
