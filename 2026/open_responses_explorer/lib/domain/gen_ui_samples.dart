const String weatherDashboardGenUiDescriptor = '''
{
  "type": "screen",
  "version": "0.1.0",
  "agent": "weather-dashboard-agent",
  "title": "Weather Comparison Dashboard",
  "description": "Live weather data for selected cities",
  "components": [
    {
      "type": "text",
      "id": "heading_tokyo",
      "content": "Tokyo, Japan",
      "style": "heading"
    },
    {
      "type": "text",
      "id": "temp_tokyo",
      "content": "Temperature: 22C | Humidity: 65% | Partly Cloudy",
      "style": "body"
    },
    {
      "type": "divider",
      "id": "div_001"
    },
    {
      "type": "text",
      "id": "heading_london",
      "content": "London, UK",
      "style": "heading"
    },
    {
      "type": "text",
      "id": "temp_london",
      "content": "Temperature: 14C | Humidity: 78% | Overcast",
      "style": "body"
    },
    {
      "type": "divider",
      "id": "div_002"
    },
    {
      "type": "table",
      "id": "comparison_table",
      "headers": ["Metric", "Tokyo", "London"],
      "rows": [
        ["Temperature", "22C", "14C"],
        ["Humidity", "65%", "78%"],
        ["Condition", "Partly cloudy", "Overcast"],
        ["Wind", "12 km/h", "18 km/h"]
      ]
    },
    {
      "type": "card",
      "id": "summary_card",
      "title": "Summary",
      "children": [
        {
          "type": "text",
          "id": "summary_card_text",
          "content": "Tokyo is 8 degrees warmer and less humid than London today.",
          "style": "body"
        }
      ]
    },
    {
      "type": "button",
      "id": "refresh_btn",
      "label": "Refresh Data",
      "variant": "primary"
    }
  ]
}
''';

const String searchInterfaceGenUiDescriptor = '''
{
  "type": "screen",
  "version": "0.1.0",
  "agent": "search-agent",
  "title": "Product Search",
  "description": "Search and filter products",
  "components": [
    {
      "type": "input",
      "id": "search_input",
      "label": "Search products",
      "placeholder": "Enter product name or category"
    },
    {
      "type": "text",
      "id": "results_label",
      "content": "Showing 24 results",
      "style": "caption"
    },
    {
      "type": "card",
      "id": "product_001",
      "title": "Wireless Headphones Pro",
      "children": [
        {
          "type": "text",
          "id": "product_001_desc",
          "content": "Premium noise cancelling headphones",
          "style": "body"
        },
        {
          "type": "text",
          "id": "product_001_price",
          "content": "299.99",
          "style": "subheading"
        },
        {
          "type": "button",
          "id": "add_cart_001",
          "label": "Add to Cart",
          "variant": "primary"
        }
      ]
    },
    {
      "type": "card",
      "id": "product_002",
      "title": "Mechanical Keyboard TKL",
      "children": [
        {
          "type": "text",
          "id": "product_002_desc",
          "content": "Tenkeyless mechanical keyboard with RGB",
          "style": "body"
        },
        {
          "type": "text",
          "id": "product_002_price",
          "content": "149.99",
          "style": "subheading"
        },
        {
          "type": "button",
          "id": "add_cart_002",
          "label": "Add to Cart",
          "variant": "primary"
        }
      ]
    },
    {
      "type": "divider",
      "id": "div_001"
    },
    {
      "type": "button",
      "id": "load_more",
      "label": "Load More Results",
      "variant": "outlined"
    }
  ]
}
''';

const String unknownComponentGenUiDescriptor = '''
{
  "type": "screen",
  "version": "0.2.0",
  "agent": "future-agent",
  "title": "Future UI Demo",
  "description": "Demonstrates fallback handling",
  "components": [
    {
      "type": "text",
      "id": "intro",
      "content": "This response contains a component type that is not yet supported.",
      "style": "body"
    },
    {
      "type": "chart",
      "id": "unknown_chart",
      "chartType": "bar",
      "data": [10, 20, 30, 40],
      "labels": ["Q1", "Q2", "Q3", "Q4"]
    },
    {
      "type": "text",
      "id": "note",
      "content": "The chart above fell back to the unknown component card. Raw data is preserved.",
      "style": "caption"
    },
    {
      "type": "button",
      "id": "continue_btn",
      "label": "Continue Anyway",
      "variant": "secondary"
    }
  ]
}
''';

class GenUISampleDescriptor {
  const GenUISampleDescriptor({
    required this.id,
    required this.title,
    required this.description,
    required this.payload,
  });

  final String id;
  final String title;
  final String description;
  final String payload;
}

const List<GenUISampleDescriptor> genUiSampleDescriptors =
    <GenUISampleDescriptor>[
  GenUISampleDescriptor(
    id: 'weather_dashboard',
    title: 'Weather Dashboard',
    description: 'Tool-driven city weather comparison dashboard',
    payload: weatherDashboardGenUiDescriptor,
  ),
  GenUISampleDescriptor(
    id: 'search_interface',
    title: 'Search Interface',
    description: 'Product search with cards, input, and actions',
    payload: searchInterfaceGenUiDescriptor,
  ),
  GenUISampleDescriptor(
    id: 'unknown_component',
    title: 'Unknown Component Fallback',
    description: 'Demonstrates fallback behavior for unsupported types',
    payload: unknownComponentGenUiDescriptor,
  ),
];
