import 'dart:typed_data';
import 'name_value_model.dart';

class ResponseModel {
  final int statusCode;
  final dynamic body;
  final Uint8List? bodyBytes;
  final List<NameValueModel>? headers;

  ResponseModel({
    required this.statusCode,
    this.body,
    this.bodyBytes,
    this.headers,
  });

  Map<String, dynamic> toJson() => {
        'statusCode': statusCode,
        'body': body,
        'bodyBytes': bodyBytes?.toList(),
        'headers': headers?.map((e) => e.toJson()).toList(),
      };

  factory ResponseModel.fromJson(Map<String, dynamic> json) => ResponseModel(
        statusCode: json['statusCode'],
        body: json['body'],
        bodyBytes: json['bodyBytes'] != null
            ? Uint8List.fromList(List<int>.from(json['bodyBytes']))
            : null,
        headers: (json['headers'] as List<dynamic>?)
            ?.map((e) => NameValueModel.fromJson(Map<String, dynamic>.from(e)))
            .toList(),
      );
}
