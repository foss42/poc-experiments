/**
 * API Registry — Hardcoded catalog of 12 popular public APIs across 8 categories.
 *
 * Part of the API Explorer MCP Server (GSoC 2026, API Dash).
 * In production this would be backed by the Python pipeline's JSON output + a database.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ApiEndpoint {
  method: string;
  path: string;
  summary: string;
  description: string;
  parameters: Array<{
    name: string;
    in: string;
    required: boolean;
    type: string;
    description: string;
  }>;
  request_body_example: Record<string, unknown> | unknown[];
  response_example: Record<string, unknown> | unknown[];
  content_type: string;
}

export interface ApiEntry {
  id: string;
  name: string;
  provider: string;
  category: string;
  auth_type: string;
  base_url: string;
  description: string;
  docs_url: string;
  quality_score: number;
  tags: string[];
  endpoints: ApiEndpoint[];
  total_endpoints: number;
  sample_request: {
    method: string;
    url: string;
    headers: Record<string, string>;
    query_params: Record<string, string>;
    body?: Record<string, unknown>;
  };
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export const CATEGORIES = [
  "AI & ML",
  "Weather",
  "Finance",
  "Developer Tools",
  "Maps & Geo",
  "Communication",
  "Data",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const API_REGISTRY: ApiEntry[] = [
  // 1. OpenWeatherMap — Weather
  {
    id: "openweathermap",
    name: "OpenWeatherMap",
    provider: "OpenWeather Ltd",
    category: "Weather",
    auth_type: "api_key",
    base_url: "https://api.openweathermap.org/data/2.5",
    description:
      "Access current weather, forecasts, and historical data for any location worldwide.",
    docs_url: "https://openweathermap.org/api",
    quality_score: 82,
    tags: ["weather", "forecast", "temperature", "climate"],
    endpoints: [
      {
        method: "GET",
        path: "/weather",
        summary: "Current weather data",
        description: "Get current weather data for a city or coordinates.",
        parameters: [
          { name: "q", in: "query", required: false, type: "string", description: "City name" },
          { name: "lat", in: "query", required: false, type: "number", description: "Latitude" },
          { name: "lon", in: "query", required: false, type: "number", description: "Longitude" },
          { name: "appid", in: "query", required: true, type: "string", description: "API key" },
        ],
        request_body_example: {},
        response_example: { main: { temp: 293.15, humidity: 65 }, weather: [{ description: "clear sky" }] },
        content_type: "application/json",
      },
      {
        method: "GET",
        path: "/forecast",
        summary: "5-day weather forecast",
        description: "Get 5-day / 3-hour forecast data for a location.",
        parameters: [
          { name: "q", in: "query", required: false, type: "string", description: "City name" },
          { name: "appid", in: "query", required: true, type: "string", description: "API key" },
        ],
        request_body_example: {},
        response_example: { list: [{ dt: 1700000000, main: { temp: 290 } }] },
        content_type: "application/json",
      },
      {
        method: "GET",
        path: "/geo/1.0/direct",
        summary: "Geocoding",
        description: "Get coordinates by city name.",
        parameters: [
          { name: "q", in: "query", required: true, type: "string", description: "City name" },
          { name: "limit", in: "query", required: false, type: "integer", description: "Max results" },
        ],
        request_body_example: {},
        response_example: { name: "London", lat: 51.5074, lon: -0.1278 },
        content_type: "application/json",
      },
    ],
    total_endpoints: 3,
    sample_request: {
      method: "GET",
      url: "https://api.openweathermap.org/data/2.5/weather?q=London&appid=YOUR_API_KEY",
      headers: {},
      query_params: { q: "London", appid: "YOUR_API_KEY" },
    },
  },

  // 2. GitHub REST API — Developer Tools
  {
    id: "github",
    name: "GitHub REST API",
    provider: "GitHub, Inc.",
    category: "Developer Tools",
    auth_type: "bearer",
    base_url: "https://api.github.com",
    description:
      "Build integrations, retrieve data, and automate workflows on GitHub.",
    docs_url: "https://docs.github.com/en/rest",
    quality_score: 95,
    tags: ["github", "git", "repository", "issues", "pull-requests"],
    endpoints: [
      {
        method: "GET",
        path: "/repos/{owner}/{repo}",
        summary: "Get a repository",
        description: "Get detailed information about a repository.",
        parameters: [
          { name: "owner", in: "path", required: true, type: "string", description: "Repository owner" },
          { name: "repo", in: "path", required: true, type: "string", description: "Repository name" },
        ],
        request_body_example: {},
        response_example: { id: 1, full_name: "octocat/Hello-World", private: false },
        content_type: "application/json",
      },
      {
        method: "GET",
        path: "/repos/{owner}/{repo}/issues",
        summary: "List repository issues",
        description: "List issues in a repository.",
        parameters: [
          { name: "owner", in: "path", required: true, type: "string", description: "Repository owner" },
          { name: "repo", in: "path", required: true, type: "string", description: "Repository name" },
          { name: "state", in: "query", required: false, type: "string", description: "State filter: open, closed, all" },
        ],
        request_body_example: {},
        response_example: [{ id: 1, title: "Bug report", state: "open" }],
        content_type: "application/json",
      },
      {
        method: "GET",
        path: "/repos/{owner}/{repo}/pulls",
        summary: "List pull requests",
        description: "List pull requests in a repository.",
        parameters: [
          { name: "owner", in: "path", required: true, type: "string", description: "Repository owner" },
          { name: "repo", in: "path", required: true, type: "string", description: "Repository name" },
        ],
        request_body_example: {},
        response_example: [{ id: 1, title: "Feature PR", state: "open" }],
        content_type: "application/json",
      },
      {
        method: "GET",
        path: "/users/{username}",
        summary: "Get a user",
        description: "Get public information about a GitHub user.",
        parameters: [
          { name: "username", in: "path", required: true, type: "string", description: "GitHub username" },
        ],
        request_body_example: {},
        response_example: { login: "octocat", id: 1, type: "User" },
        content_type: "application/json",
      },
      {
        method: "GET",
        path: "/search/repositories",
        summary: "Search repositories",
        description: "Find repositories via various criteria.",
        parameters: [
          { name: "q", in: "query", required: true, type: "string", description: "Search query" },
          { name: "sort", in: "query", required: false, type: "string", description: "Sort field: stars, forks, updated" },
        ],
        request_body_example: {},
        response_example: { total_count: 1, items: [{ full_name: "octocat/Hello-World" }] },
        content_type: "application/json",
      },
    ],
    total_endpoints: 5,
    sample_request: {
      method: "GET",
      url: "https://api.github.com/repos/foss42/apidash",
      headers: { Authorization: "Bearer YOUR_GITHUB_TOKEN", Accept: "application/vnd.github+json" },
      query_params: {},
    },
  },

  // 3. OpenAI API — AI & ML
  {
    id: "openai",
    name: "OpenAI API",
    provider: "OpenAI",
    category: "AI & ML",
    auth_type: "bearer",
    base_url: "https://api.openai.com/v1",
    description:
      "Access GPT-4o, DALL-E, embeddings, and other AI models via a simple REST API.",
    docs_url: "https://platform.openai.com/docs/api-reference",
    quality_score: 92,
    tags: ["ai", "gpt", "llm", "embeddings", "chat", "images"],
    endpoints: [
      {
        method: "POST",
        path: "/chat/completions",
        summary: "Create chat completion",
        description: "Generate a model response for a chat conversation.",
        parameters: [],
        request_body_example: {
          model: "gpt-4o",
          messages: [{ role: "user", content: "Hello!" }],
        },
        response_example: {
          choices: [{ message: { role: "assistant", content: "Hi there!" } }],
        },
        content_type: "application/json",
      },
      {
        method: "POST",
        path: "/embeddings",
        summary: "Create embeddings",
        description: "Get a vector representation of text for search and similarity.",
        parameters: [],
        request_body_example: {
          model: "text-embedding-3-small",
          input: "The quick brown fox",
        },
        response_example: { data: [{ embedding: [0.0023, -0.009], index: 0 }] },
        content_type: "application/json",
      },
      {
        method: "GET",
        path: "/models",
        summary: "List models",
        description: "List all available models.",
        parameters: [],
        request_body_example: {},
        response_example: { data: [{ id: "gpt-4o", object: "model" }] },
        content_type: "application/json",
      },
      {
        method: "POST",
        path: "/images/generations",
        summary: "Create image",
        description: "Generate an image from a text prompt using DALL-E.",
        parameters: [],
        request_body_example: {
          model: "dall-e-3",
          prompt: "A white siamese cat",
          n: 1,
          size: "1024x1024",
        },
        response_example: { data: [{ url: "https://..." }] },
        content_type: "application/json",
      },
    ],
    total_endpoints: 4,
    sample_request: {
      method: "POST",
      url: "https://api.openai.com/v1/chat/completions",
      headers: {
        Authorization: "Bearer {{OPENAI_API_KEY}}",
        "Content-Type": "application/json",
      },
      query_params: {},
      body: {
        model: "gpt-4o",
        messages: [{ role: "user", content: "Hello!" }],
      },
    },
  },

  // 4. Stripe API — Finance
  {
    id: "stripe",
    name: "Stripe API",
    provider: "Stripe, Inc.",
    category: "Finance",
    auth_type: "bearer",
    base_url: "https://api.stripe.com/v1",
    description:
      "Accept payments, manage subscriptions, and handle billing for internet businesses.",
    docs_url: "https://stripe.com/docs/api",
    quality_score: 96,
    tags: ["payments", "billing", "subscriptions", "finance", "invoices"],
    endpoints: [
      {
        method: "POST",
        path: "/charges",
        summary: "Create a charge",
        description: "Create a new charge to charge a credit card.",
        parameters: [],
        request_body_example: { amount: 2000, currency: "usd", source: "tok_visa" },
        response_example: { id: "ch_1A", amount: 2000, status: "succeeded" },
        content_type: "application/x-www-form-urlencoded",
      },
      {
        method: "GET",
        path: "/customers",
        summary: "List customers",
        description: "Retrieve a list of customers.",
        parameters: [
          { name: "limit", in: "query", required: false, type: "integer", description: "Max results (1-100)" },
        ],
        request_body_example: {},
        response_example: { data: [{ id: "cus_1A", email: "user@example.com" }] },
        content_type: "application/json",
      },
      {
        method: "POST",
        path: "/payment_intents",
        summary: "Create a PaymentIntent",
        description: "Create a PaymentIntent to collect a payment.",
        parameters: [],
        request_body_example: { amount: 1099, currency: "usd", payment_method_types: ["card"] },
        response_example: { id: "pi_1A", status: "requires_payment_method" },
        content_type: "application/x-www-form-urlencoded",
      },
      {
        method: "GET",
        path: "/invoices",
        summary: "List invoices",
        description: "Retrieve a list of invoices.",
        parameters: [
          { name: "customer", in: "query", required: false, type: "string", description: "Filter by customer ID" },
        ],
        request_body_example: {},
        response_example: { data: [{ id: "in_1A", total: 5000, status: "paid" }] },
        content_type: "application/json",
      },
    ],
    total_endpoints: 4,
    sample_request: {
      method: "POST",
      url: "https://api.stripe.com/v1/charges",
      headers: { Authorization: "Bearer {{STRIPE_SECRET_KEY}}", "Content-Type": "application/x-www-form-urlencoded" },
      query_params: {},
      body: { amount: 2000, currency: "usd", source: "tok_visa" },
    },
  },

  // 5. Google Maps Places — Maps & Geo
  {
    id: "google-maps",
    name: "Google Maps Places API",
    provider: "Google",
    category: "Maps & Geo",
    auth_type: "api_key",
    base_url: "https://maps.googleapis.com/maps/api",
    description:
      "Geocode addresses, get directions, and discover places around the world.",
    docs_url: "https://developers.google.com/maps/documentation",
    quality_score: 90,
    tags: ["maps", "geocoding", "places", "directions", "location"],
    endpoints: [
      {
        method: "GET",
        path: "/geocode/json",
        summary: "Geocode an address",
        description: "Convert an address into geographic coordinates.",
        parameters: [
          { name: "address", in: "query", required: true, type: "string", description: "Address to geocode" },
          { name: "key", in: "query", required: true, type: "string", description: "API key" },
        ],
        request_body_example: {},
        response_example: { results: [{ geometry: { location: { lat: 40.714, lng: -74.006 } } }] },
        content_type: "application/json",
      },
      {
        method: "GET",
        path: "/directions/json",
        summary: "Get directions",
        description: "Get directions between two points.",
        parameters: [
          { name: "origin", in: "query", required: true, type: "string", description: "Start address" },
          { name: "destination", in: "query", required: true, type: "string", description: "End address" },
          { name: "key", in: "query", required: true, type: "string", description: "API key" },
        ],
        request_body_example: {},
        response_example: { routes: [{ legs: [{ distance: { text: "5.2 km" } }] }] },
        content_type: "application/json",
      },
      {
        method: "GET",
        path: "/place/nearbysearch/json",
        summary: "Nearby place search",
        description: "Search for places near a location.",
        parameters: [
          { name: "location", in: "query", required: true, type: "string", description: "Lat,Lng" },
          { name: "radius", in: "query", required: true, type: "integer", description: "Search radius in meters" },
          { name: "key", in: "query", required: true, type: "string", description: "API key" },
        ],
        request_body_example: {},
        response_example: { results: [{ name: "Central Park", vicinity: "New York" }] },
        content_type: "application/json",
      },
    ],
    total_endpoints: 3,
    sample_request: {
      method: "GET",
      url: "https://maps.googleapis.com/maps/api/geocode/json?address=1600+Amphitheatre+Parkway&key=YOUR_API_KEY",
      headers: {},
      query_params: { address: "1600 Amphitheatre Parkway", key: "YOUR_API_KEY" },
    },
  },

  // 6. SendGrid Email — Communication
  {
    id: "sendgrid",
    name: "SendGrid Email API",
    provider: "Twilio SendGrid",
    category: "Communication",
    auth_type: "bearer",
    base_url: "https://api.sendgrid.com/v3",
    description:
      "Send transactional and marketing emails at scale with reliable delivery.",
    docs_url: "https://docs.sendgrid.com/api-reference",
    quality_score: 88,
    tags: ["email", "transactional", "marketing", "smtp"],
    endpoints: [
      {
        method: "POST",
        path: "/mail/send",
        summary: "Send an email",
        description: "Send a single email to one or more recipients.",
        parameters: [],
        request_body_example: {
          personalizations: [{ to: [{ email: "user@example.com" }] }],
          from: { email: "sender@example.com" },
          subject: "Hello!",
          content: [{ type: "text/plain", value: "Hi there!" }],
        },
        response_example: {},
        content_type: "application/json",
      },
      {
        method: "GET",
        path: "/marketing/contacts",
        summary: "List contacts",
        description: "Retrieve all marketing contacts.",
        parameters: [],
        request_body_example: {},
        response_example: { result: [{ email: "user@example.com", first_name: "Jane" }] },
        content_type: "application/json",
      },
      {
        method: "GET",
        path: "/templates",
        summary: "List email templates",
        description: "Retrieve all transactional email templates.",
        parameters: [
          { name: "generations", in: "query", required: false, type: "string", description: "Filter: legacy or dynamic" },
        ],
        request_body_example: {},
        response_example: { templates: [{ id: "t1", name: "Welcome Email" }] },
        content_type: "application/json",
      },
    ],
    total_endpoints: 3,
    sample_request: {
      method: "POST",
      url: "https://api.sendgrid.com/v3/mail/send",
      headers: {
        Authorization: "Bearer {{SENDGRID_API_KEY}}",
        "Content-Type": "application/json",
      },
      query_params: {},
      body: {
        personalizations: [{ to: [{ email: "user@example.com" }] }],
        from: { email: "sender@example.com" },
        subject: "Hello!",
        content: [{ type: "text/plain", value: "Hi there!" }],
      },
    },
  },

  // 7. Hugging Face Inference API — AI & ML
  {
    id: "huggingface",
    name: "Hugging Face Inference API",
    provider: "Hugging Face",
    category: "AI & ML",
    auth_type: "bearer",
    base_url: "https://api-inference.huggingface.co",
    description:
      "Run inference on thousands of open-source ML models for text, image, and audio tasks.",
    docs_url: "https://huggingface.co/docs/api-inference",
    quality_score: 80,
    tags: ["ai", "ml", "inference", "transformers", "nlp", "models"],
    endpoints: [
      {
        method: "POST",
        path: "/models/{model_id}",
        summary: "Run inference",
        description: "Run inference on a specific model.",
        parameters: [
          { name: "model_id", in: "path", required: true, type: "string", description: "Model ID (e.g. gpt2)" },
        ],
        request_body_example: { inputs: "The answer to the universe is" },
        response_example: [{ generated_text: "The answer to the universe is 42" }],
        content_type: "application/json",
      },
      {
        method: "GET",
        path: "/api/models",
        summary: "List models",
        description: "Search and list available models on the Hub.",
        parameters: [
          { name: "search", in: "query", required: false, type: "string", description: "Search query" },
          { name: "limit", in: "query", required: false, type: "integer", description: "Max results" },
        ],
        request_body_example: {},
        response_example: [{ modelId: "gpt2", pipeline_tag: "text-generation" }],
        content_type: "application/json",
      },
      {
        method: "GET",
        path: "/api/datasets",
        summary: "List datasets",
        description: "Search and list available datasets.",
        parameters: [
          { name: "search", in: "query", required: false, type: "string", description: "Search query" },
        ],
        request_body_example: {},
        response_example: [{ id: "squad", description: "Stanford Question Answering Dataset" }],
        content_type: "application/json",
      },
    ],
    total_endpoints: 3,
    sample_request: {
      method: "POST",
      url: "https://api-inference.huggingface.co/models/gpt2",
      headers: { Authorization: "Bearer {{HF_TOKEN}}", "Content-Type": "application/json" },
      query_params: {},
      body: { inputs: "The answer to the universe is" },
    },
  },

  // 8. Twilio SMS — Communication
  {
    id: "twilio",
    name: "Twilio SMS API",
    provider: "Twilio",
    category: "Communication",
    auth_type: "basic",
    base_url: "https://api.twilio.com/2010-04-01",
    description:
      "Send and receive SMS, MMS, and WhatsApp messages programmatically.",
    docs_url: "https://www.twilio.com/docs/sms",
    quality_score: 91,
    tags: ["sms", "messaging", "voice", "whatsapp", "verification"],
    endpoints: [
      {
        method: "POST",
        path: "/Accounts/{AccountSid}/Messages.json",
        summary: "Send an SMS",
        description: "Send a new outgoing SMS message.",
        parameters: [
          { name: "AccountSid", in: "path", required: true, type: "string", description: "Twilio Account SID" },
        ],
        request_body_example: {
          To: "+15558675310",
          From: "+15017122661",
          Body: "Hello from API Dash!",
        },
        response_example: { sid: "SM123", status: "queued", to: "+15558675310" },
        content_type: "application/x-www-form-urlencoded",
      },
      {
        method: "GET",
        path: "/Accounts/{AccountSid}/Calls.json",
        summary: "List calls",
        description: "Retrieve a list of phone calls.",
        parameters: [
          { name: "AccountSid", in: "path", required: true, type: "string", description: "Twilio Account SID" },
        ],
        request_body_example: {},
        response_example: { calls: [{ sid: "CA123", status: "completed", duration: "30" }] },
        content_type: "application/json",
      },
      {
        method: "POST",
        path: "/Accounts/{AccountSid}/Messages/{MessageSid}.json",
        summary: "Fetch message",
        description: "Fetch details of a specific message.",
        parameters: [
          { name: "AccountSid", in: "path", required: true, type: "string", description: "Twilio Account SID" },
          { name: "MessageSid", in: "path", required: true, type: "string", description: "Message SID" },
        ],
        request_body_example: {},
        response_example: { sid: "SM123", body: "Hello!", status: "delivered" },
        content_type: "application/json",
      },
    ],
    total_endpoints: 3,
    sample_request: {
      method: "POST",
      url: "https://api.twilio.com/2010-04-01/Accounts/{{ACCOUNT_SID}}/Messages.json",
      headers: { Authorization: "Basic {{BASE64_AUTH}}", "Content-Type": "application/x-www-form-urlencoded" },
      query_params: {},
      body: { To: "+15558675310", From: "+15017122661", Body: "Hello from API Dash!" },
    },
  },

  // 9. CoinGecko Crypto — Finance
  {
    id: "coingecko",
    name: "CoinGecko API",
    provider: "CoinGecko",
    category: "Finance",
    auth_type: "none",
    base_url: "https://api.coingecko.com/api/v3",
    description:
      "Free crypto market data: prices, volumes, market caps, and trending coins.",
    docs_url: "https://www.coingecko.com/en/api/documentation",
    quality_score: 78,
    tags: ["crypto", "bitcoin", "market-data", "prices", "blockchain"],
    endpoints: [
      {
        method: "GET",
        path: "/simple/price",
        summary: "Get coin price",
        description: "Get current price of one or more coins.",
        parameters: [
          { name: "ids", in: "query", required: true, type: "string", description: "Coin IDs (comma-separated)" },
          { name: "vs_currencies", in: "query", required: true, type: "string", description: "Target currencies" },
        ],
        request_body_example: {},
        response_example: { bitcoin: { usd: 67000 }, ethereum: { usd: 3500 } },
        content_type: "application/json",
      },
      {
        method: "GET",
        path: "/coins/markets",
        summary: "List coin markets",
        description: "Get market data for coins: price, volume, market cap.",
        parameters: [
          { name: "vs_currency", in: "query", required: true, type: "string", description: "Target currency" },
          { name: "order", in: "query", required: false, type: "string", description: "Sort order" },
        ],
        request_body_example: {},
        response_example: [{ id: "bitcoin", current_price: 67000, market_cap: 1300000000000 }],
        content_type: "application/json",
      },
      {
        method: "GET",
        path: "/search/trending",
        summary: "Trending coins",
        description: "Get the top trending coins on CoinGecko.",
        parameters: [],
        request_body_example: {},
        response_example: { coins: [{ item: { id: "bitcoin", name: "Bitcoin", score: 0 } }] },
        content_type: "application/json",
      },
    ],
    total_endpoints: 3,
    sample_request: {
      method: "GET",
      url: "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
      headers: {},
      query_params: { ids: "bitcoin", vs_currencies: "usd" },
    },
  },

  // 10. NASA Open APIs — Data
  {
    id: "nasa",
    name: "NASA Open APIs",
    provider: "NASA",
    category: "Data",
    auth_type: "api_key",
    base_url: "https://api.nasa.gov",
    description:
      "Access NASA data: Astronomy Picture of the Day, Mars Rover photos, near-Earth objects, and more.",
    docs_url: "https://api.nasa.gov",
    quality_score: 75,
    tags: ["space", "astronomy", "mars", "earth", "science"],
    endpoints: [
      {
        method: "GET",
        path: "/planetary/apod",
        summary: "Astronomy Picture of the Day",
        description: "Get the APOD image and metadata.",
        parameters: [
          { name: "date", in: "query", required: false, type: "string", description: "Date (YYYY-MM-DD)" },
          { name: "api_key", in: "query", required: true, type: "string", description: "NASA API key" },
        ],
        request_body_example: {},
        response_example: { title: "The Eagle Nebula", url: "https://apod.nasa.gov/...", media_type: "image" },
        content_type: "application/json",
      },
      {
        method: "GET",
        path: "/mars-photos/api/v1/rovers/curiosity/photos",
        summary: "Mars Rover photos",
        description: "Get photos from Mars rovers by sol or Earth date.",
        parameters: [
          { name: "sol", in: "query", required: false, type: "integer", description: "Martian sol" },
          { name: "api_key", in: "query", required: true, type: "string", description: "NASA API key" },
        ],
        request_body_example: {},
        response_example: { photos: [{ id: 1, img_src: "https://...", earth_date: "2024-01-01" }] },
        content_type: "application/json",
      },
      {
        method: "GET",
        path: "/neo/rest/v1/feed",
        summary: "Near Earth Objects",
        description: "Get a list of near-Earth asteroids.",
        parameters: [
          { name: "start_date", in: "query", required: true, type: "string", description: "Start date" },
          { name: "end_date", in: "query", required: true, type: "string", description: "End date" },
          { name: "api_key", in: "query", required: true, type: "string", description: "NASA API key" },
        ],
        request_body_example: {},
        response_example: { element_count: 25, near_earth_objects: {} },
        content_type: "application/json",
      },
    ],
    total_endpoints: 3,
    sample_request: {
      method: "GET",
      url: "https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY",
      headers: {},
      query_params: { api_key: "DEMO_KEY" },
    },
  },

  // 11. Spotify Web API — Developer Tools
  {
    id: "spotify",
    name: "Spotify Web API",
    provider: "Spotify AB",
    category: "Developer Tools",
    auth_type: "oauth2",
    base_url: "https://api.spotify.com/v1",
    description:
      "Search for music, manage playlists, control playback, and access Spotify's catalog.",
    docs_url: "https://developer.spotify.com/documentation/web-api",
    quality_score: 93,
    tags: ["music", "streaming", "playlists", "audio", "tracks"],
    endpoints: [
      {
        method: "GET",
        path: "/search",
        summary: "Search for items",
        description: "Search Spotify catalog for artists, albums, tracks, or playlists.",
        parameters: [
          { name: "q", in: "query", required: true, type: "string", description: "Search query" },
          { name: "type", in: "query", required: true, type: "string", description: "Item types: album,artist,track" },
          { name: "limit", in: "query", required: false, type: "integer", description: "Max results" },
        ],
        request_body_example: {},
        response_example: { tracks: { items: [{ name: "Bohemian Rhapsody", artists: [{ name: "Queen" }] }] } },
        content_type: "application/json",
      },
      {
        method: "GET",
        path: "/tracks/{id}",
        summary: "Get a track",
        description: "Get detailed information about a track.",
        parameters: [
          { name: "id", in: "path", required: true, type: "string", description: "Spotify track ID" },
        ],
        request_body_example: {},
        response_example: { name: "Bohemian Rhapsody", duration_ms: 354320, popularity: 89 },
        content_type: "application/json",
      },
      {
        method: "GET",
        path: "/me/playlists",
        summary: "Get current user's playlists",
        description: "Get a list of the current user's playlists.",
        parameters: [
          { name: "limit", in: "query", required: false, type: "integer", description: "Max results" },
        ],
        request_body_example: {},
        response_example: { items: [{ name: "My Playlist", tracks: { total: 50 } }] },
        content_type: "application/json",
      },
      {
        method: "PUT",
        path: "/me/player/play",
        summary: "Start/resume playback",
        description: "Start or resume playback on an active device.",
        parameters: [],
        request_body_example: { uris: ["spotify:track:4iV5W9uYEdYUVa79Axb7Rh"] },
        response_example: {},
        content_type: "application/json",
      },
    ],
    total_endpoints: 4,
    sample_request: {
      method: "GET",
      url: "https://api.spotify.com/v1/search?q=bohemian+rhapsody&type=track&limit=5",
      headers: { Authorization: "Bearer {{SPOTIFY_TOKEN}}" },
      query_params: { q: "bohemian rhapsody", type: "track", limit: "5" },
    },
  },

  // 12. Cloudinary — Data
  {
    id: "cloudinary",
    name: "Cloudinary API",
    provider: "Cloudinary",
    category: "Data",
    auth_type: "basic",
    base_url: "https://api.cloudinary.com/v1_1/{cloud_name}",
    description:
      "Upload, transform, optimize, and deliver images and videos at scale.",
    docs_url: "https://cloudinary.com/documentation",
    quality_score: 85,
    tags: ["images", "video", "media", "upload", "cdn", "optimization"],
    endpoints: [
      {
        method: "POST",
        path: "/image/upload",
        summary: "Upload an image",
        description: "Upload an image file or URL to Cloudinary.",
        parameters: [],
        request_body_example: {
          file: "https://example.com/photo.jpg",
          upload_preset: "my_preset",
        },
        response_example: { public_id: "sample", secure_url: "https://res.cloudinary.com/..." },
        content_type: "multipart/form-data",
      },
      {
        method: "GET",
        path: "/resources/image",
        summary: "List images",
        description: "List uploaded image resources.",
        parameters: [
          { name: "max_results", in: "query", required: false, type: "integer", description: "Max results" },
        ],
        request_body_example: {},
        response_example: { resources: [{ public_id: "sample", format: "jpg", bytes: 120000 }] },
        content_type: "application/json",
      },
      {
        method: "DELETE",
        path: "/resources/image/upload",
        summary: "Delete images",
        description: "Delete uploaded images by public IDs.",
        parameters: [],
        request_body_example: { public_ids: ["sample1", "sample2"] },
        response_example: { deleted: { sample1: "deleted", sample2: "deleted" } },
        content_type: "application/json",
      },
    ],
    total_endpoints: 3,
    sample_request: {
      method: "POST",
      url: "https://api.cloudinary.com/v1_1/demo/image/upload",
      headers: { Authorization: "Basic {{BASE64_CREDENTIALS}}" },
      query_params: {},
      body: { file: "https://example.com/photo.jpg", upload_preset: "my_preset" },
    },
  },
];
