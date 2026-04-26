class ApiReview {
  final String id;
  final String author;
  final double rating;
  final String comment;
  final String date;
  final int helpful;

  const ApiReview({
    required this.id,
    required this.author,
    required this.rating,
    required this.comment,
    required this.date,
    required this.helpful,
  });
}