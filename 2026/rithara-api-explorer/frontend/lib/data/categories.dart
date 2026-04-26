import 'package:flutter/material.dart';
import '../models/api_category.dart';

const List<ApiCategory> categories = [
  ApiCategory(id: 'all',           name: 'All APIs',              icon: Icons.folder_open),
  ApiCategory(id: 'ai',            name: 'AI & Machine Learning', icon: Icons.psychology),
  ApiCategory(id: 'finance',       name: 'Finance & Payments',    icon: Icons.attach_money),
  ApiCategory(id: 'weather',       name: 'Weather & Geography',   icon: Icons.cloud),
  ApiCategory(id: 'social',        name: 'Social Media',          icon: Icons.share),
  ApiCategory(id: 'ecommerce',     name: 'E-commerce',            icon: Icons.shopping_cart),
  ApiCategory(id: 'data',          name: 'Data & Analytics',      icon: Icons.bar_chart),
  ApiCategory(id: 'communication', name: 'Communication',         icon: Icons.chat_bubble_outline),
  ApiCategory(id: 'media',         name: 'Media & Content',       icon: Icons.movie),
  ApiCategory(id: 'developer',     name: 'Developer Tools',       icon: Icons.code),
];