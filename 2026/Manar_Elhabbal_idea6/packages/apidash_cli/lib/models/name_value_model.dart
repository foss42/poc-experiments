class NameValueModel {
  final String name;
  final String value;

  NameValueModel({required this.name, required this.value});

  Map<String, dynamic> toJson() => {
        'name': name,
        'value': value,
      };

  factory NameValueModel.fromJson(Map<String, dynamic> json) => NameValueModel(
        name: json['name'],
        value: json['value'],
      );
}
