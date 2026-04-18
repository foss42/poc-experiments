import 'api_endpoint.dart';

enum SubmissionStatus { pending, approved, rejected, needsChanges }

class ApiSubmission {
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
  final List<ApiEndpoint> endpoints;
  final String? githubRepo;
  final String submittedBy;
  final String submittedDate;
  final SubmissionStatus status;
  final String? reviewNotes;
  final String? reviewedBy;
  final String? reviewedDate;

  const ApiSubmission({
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
    required this.endpoints,
    this.githubRepo,
    required this.submittedBy,
    required this.submittedDate,
    required this.status,
    this.reviewNotes,
    this.reviewedBy,
    this.reviewedDate,
  });
}