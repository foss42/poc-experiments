import 'api_endpoint.dart';
import 'api_review.dart';

class ApiChangelog {
  final String version;
  final String date;
  final List<String> changes;

  const ApiChangelog({
    required this.version,
    required this.date,
    required this.changes,
  });
}

class ApiLicense {
  final String name;
  final String url;

  const ApiLicense({required this.name, required this.url});
}

class ApiAuthDetails {
  final String? parameterName;
  final String? location;
  final dynamic oauth2Flows;

  const ApiAuthDetails({
    this.parameterName,
    this.location,
    this.oauth2Flows,
  });
}

class ApiItem {
  final String id;
  final String name;
  final String description;
  final String longDescription;
  final String category;
  final List<String> tags;
  final String version;
  final String baseUrl;
  final String documentation;
  final String authType;
  final double rating;
  final int totalReviews;
  final int popularity;
  final String icon;
  final List<ApiEndpoint> endpoints;
  final List<ApiReview> reviews;
  final Map<String, String> sampleCode;
  final String updated;
  final String added;
  final bool unofficial;
  final String provider;
  final String providerUrl;
  final List<String>? versions;
  final String? preferredVersion;
  final String? openapiVersion;
  final String? specUrl;
  final String? contactEmail;
  final ApiLicense? license;
  final String? termsOfService;
  final ApiAuthDetails? authDetails;
  final String? registrationUrl;
  final String? githubUrl;
  final List<ApiChangelog>? changelog;

  const ApiItem({
    required this.id,
    required this.name,
    required this.description,
    required this.longDescription,
    required this.category,
    required this.tags,
    required this.version,
    required this.baseUrl,
    required this.documentation,
    required this.authType,
    required this.rating,
    required this.totalReviews,
    required this.popularity,
    required this.icon,
    required this.endpoints,
    required this.reviews,
    required this.sampleCode,
    required this.updated,
    required this.added,
    required this.unofficial,
    required this.provider,
    required this.providerUrl,
    this.versions,
    this.preferredVersion,
    this.openapiVersion,
    this.specUrl,
    this.contactEmail,
    this.license,
    this.termsOfService,
    this.authDetails,
    this.registrationUrl,
    this.githubUrl,
    this.changelog,
    this.templateFile,
  });

  final String? templateFile;

  factory ApiItem.fromMarketplaceJson(Map<String, dynamic> json) {
    return ApiItem(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Unnamed API',
      provider: json['provider']?.toString() ?? 'Unknown',
      description: json['description']?.toString() ?? 'No description available',
      longDescription: json['description']?.toString() ?? 'No description available',
      category: (json['categories'] as List<dynamic>?)?.firstOrNull?.toString() ?? 'Other',
      tags: (json['categories'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      version: '1.0.0', 
      baseUrl: json['base_url']?.toString() ?? '',
      documentation: json['docs_url']?.toString() ?? json['base_url']?.toString() ?? '',
      authType: json['auth_type']?.toString() ?? 'none',
      rating: (json['rating'] as num?)?.toDouble() ?? 0.0,
      totalReviews: json['review_count'] as int? ?? 0,
      popularity: 0,
      icon: json['logo_url']?.toString() ?? 'https://api.dicebear.com/7.x/identicon/svg?seed=${json['id']}',
      endpoints: [], 
      reviews: [],
      sampleCode: {},
      updated: '2026-03-15', 
      added: '2026-01-01',
      unofficial: !(json['verified'] as bool? ?? false),
      providerUrl: json['base_url']?.toString() ?? '',
      specUrl: json['spec_url']?.toString(),
      templateFile: json['template_file']?.toString(),
    );
  }
}