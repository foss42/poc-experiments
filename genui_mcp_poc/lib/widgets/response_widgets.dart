import 'package:flutter/material.dart';

// 1. A beautiful card for User/Profile data
class ProfileCard extends StatelessWidget {
  final Map<String, dynamic> data;
  const ProfileCard({super.key, required this.data});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            CircleAvatar(
              radius: 40,
              backgroundImage: NetworkImage(data['avatar'] ?? ''),
            ),
            const SizedBox(height: 12),
            Text(data['username'] ?? 'Unknown', 
                 style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            Text(data['role'] ?? '', style: TextStyle(color: Colors.grey[600])),
            const Divider(),
            Text(data['bio'] ?? '', textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}

// 2. A clean error widget
class ErrorDisplay extends StatelessWidget {
  final Map<String, dynamic> errorData;
  const ErrorDisplay({super.key, required this.errorData});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.red[50],
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.red),
      ),
      child: Column(
        children: [
          const Icon(Icons.error_outline, color: Colors.red, size: 40),
          Text("Error ${errorData['status_code']}", 
               style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.red)),
          Text(errorData['message'] ?? 'An unknown error occurred'),
        ],
      ),
    );
  }
}