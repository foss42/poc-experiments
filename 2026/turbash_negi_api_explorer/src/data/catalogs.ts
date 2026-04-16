import { SourceInput } from "../core/types.js";

export interface APILibraryEntry {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  rating: number;
  source: SourceInput;
  featured: boolean;
}

export interface ApiTemplate {
  title: string;
  description: string;
  method: string;
  path: string;
  query?: Record<string, string | number | boolean>;
  pathParams?: Record<string, string | number | boolean>;
  body?: Record<string, unknown>;
}

export interface ApiEndpointEntry {
  id: string;
  apiId: string;
  name: string;
  description: string;
  category: string;
  method: "get" | "post" | "put" | "patch" | "delete";
  path: string;
  tags: string[];
  template: ApiTemplate;
}

export interface EndpointSearchResult {
  endpoint: ApiEndpointEntry;
  api: APILibraryEntry;
}

export interface ApiReview {
  id: string;
  apiId: string;
  author: string;
  comment: string;
  rating?: number;
  createdAt: string;
}

// Static reference - exported from api-library.ts (which loads from database.json)
const STATIC_API_LIBRARY: APILibraryEntry[] = [
  {
    id: "petstore",
    name: "Swagger Petstore",
    description: "Sample pet store API for testing and learning OpenAPI",
    category: "general",
    tags: ["sample", "testing", "rest"],
    rating: 4.5,
    featured: true,
    source: {
      id: "petstore",
      name: "Swagger Petstore",
      type: "openapi_url",
      location: "https://petstore3.swagger.io/api/v3/openapi.json",
    },
  },
  {
    id: "github-api",
    name: "GitHub REST API",
    description: "Powerful collaborative development platform",
    category: "developer_tools",
    tags: ["github", "rest", "vcs"],
    rating: 4.8,
    featured: true,
    source: {
      id: "github",
      name: "GitHub API",
      type: "openapi_url",
      location: "https://raw.githubusercontent.com/github/rest-api-description/main/openapi.json",
    },
  },
  {
    id: "stripe",
    name: "Stripe API",
    description: "Payment processing and money movement API",
    category: "finance",
    tags: ["payments", "stripe", "rest"],
    rating: 4.9,
    featured: true,
    source: {
      id: "stripe",
      name: "Stripe API",
      type: "openapi_url",
      location: "https://raw.githubusercontent.com/stripe/stripe-openapi/master/openapi/spec3.json",
    },
  },
  {
    id: "openweather",
    name: "OpenWeather API",
    description: "Weather data and forecasts for any location",
    category: "weather",
    tags: ["weather", "forecast", "rest"],
    rating: 4.6,
    featured: true,
    source: {
      id: "openweather",
      name: "OpenWeather API",
      type: "openapi_url",
      location: "https://api.openapis.org/openapi.json",
    },
  },
  {
    id: "twilio",
    name: "Twilio API",
    description: "SMS, voice, video, and messaging platform",
    category: "messaging",
    tags: ["sms", "voice", "messaging"],
    rating: 4.7,
    featured: true,
    source: {
      id: "twilio",
      name: "Twilio API",
      type: "openapi_url",
      location: "https://raw.githubusercontent.com/twilio/twilio-oai/main/rest/twilio-rest.json",
    },
  },
  {
    id: "spotify",
    name: "Spotify Web API",
    description: "Access Spotify music catalog and user data",
    category: "social",
    tags: ["music", "streaming", "rest"],
    rating: 4.7,
    featured: false,
    source: {
      id: "spotify",
      name: "Spotify API",
      type: "openapi_url",
      location: "https://raw.githubusercontent.com/APIs-guru/openapi-directory/master/APIs/spotify.com/1.0.0/openapi.yaml",
    },
  },
  {
    id: "airtable",
    name: "Airtable API",
    description: "Create and collaborate on databases and spreadsheets",
    category: "developer_tools",
    tags: ["database", "spreadsheet", "rest"],
    rating: 4.6,
    featured: false,
    source: {
      id: "airtable",
      name: "Airtable API",
      type: "openapi_url",
      location: "https://raw.githubusercontent.com/Airtable/openapi/main/openapi.json",
    },
  },
  {
    id: "slack",
    name: "Slack API",
    description: "Build apps and integrate tools with Slack",
    category: "messaging",
    tags: ["slack", "messaging", "rest"],
    rating: 4.8,
    featured: false,
    source: {
      id: "slack",
      name: "Slack API",
      type: "openapi_url",
      location: "https://raw.githubusercontent.com/slackapi/slack-api-specs/master/web-api/slack_web_openapi_v2.json",
    },
  },
  {
    id: "graphql-swapi",
    name: "Star Wars API (GraphQL)",
    description: "GraphQL API for Star Wars data",
    category: "general",
    tags: ["graphql", "sample", "rest"],
    rating: 4.3,
    featured: false,
    source: {
      id: "swapi",
      name: "Star Wars API",
      type: "openapi_url",
      location: "https://raw.githubusercontent.com/APIs-guru/openapi-directory/master/APIs/swapi.dev/1.0/openapi.json",
    },
  },
  {
    id: "coindesk",
    name: "CoinDesk Bitcoin API",
    description: "Real-time Bitcoin and cryptocurrency price data",
    category: "finance",
    tags: ["crypto", "bitcoin", "rest"],
    rating: 4.4,
    featured: false,
    source: {
      id: "coindesk",
      name: "CoinDesk API",
      type: "openapi_url",
      location: "https://raw.githubusercontent.com/APIs-guru/openapi-directory/master/APIs/coindesk.com/1.0.0/openapi.yaml",
    },
  },
];

export const API_ENDPOINTS: ApiEndpointEntry[] = [
  {
    id: "petstore-list-pets",
    apiId: "petstore",
    name: "List pets",
    description: "Get all pets with optional limit.",
    category: "general",
    method: "get",
    path: "/pet/findByStatus",
    tags: ["pets", "listing"],
    template: {
      title: "Petstore list pets",
      description: "List available pets with status filter.",
      method: "GET",
      path: "/pet/findByStatus",
      query: { status: "available" },
    },
  },
  {
    id: "petstore-create-pet",
    apiId: "petstore",
    name: "Create pet",
    description: "Create a new pet record.",
    category: "general",
    method: "post",
    path: "/pet",
    tags: ["pets", "create"],
    template: {
      title: "Petstore create pet",
      description: "Create a pet with basic details.",
      method: "POST",
      path: "/pet",
      body: {
        id: 9001,
        name: "Snowball",
        status: "available",
      },
    },
  },
  {
    id: "github-get-repo",
    apiId: "github-api",
    name: "Get repository",
    description: "Get repository metadata.",
    category: "developer_tools",
    method: "get",
    path: "/repos/{owner}/{repo}",
    tags: ["repository", "metadata"],
    template: {
      title: "GitHub get repository",
      description: "Fetch repository details by owner and name.",
      method: "GET",
      path: "/repos/{owner}/{repo}",
      pathParams: {
        owner: "microsoft",
        repo: "vscode",
      },
    },
  },
  {
    id: "github-list-issues",
    apiId: "github-api",
    name: "List repository issues",
    description: "List open issues for a repository.",
    category: "developer_tools",
    method: "get",
    path: "/repos/{owner}/{repo}/issues",
    tags: ["issues", "triage"],
    template: {
      title: "GitHub list issues",
      description: "List open issues sorted by newest.",
      method: "GET",
      path: "/repos/{owner}/{repo}/issues",
      pathParams: {
        owner: "microsoft",
        repo: "vscode",
      },
      query: {
        state: "open",
        per_page: 20,
      },
    },
  },
  {
    id: "stripe-create-payment-intent",
    apiId: "stripe",
    name: "Create payment intent",
    description: "Create a payment intent.",
    category: "finance",
    method: "post",
    path: "/v1/payment_intents",
    tags: ["payments", "checkout"],
    template: {
      title: "Stripe create payment intent",
      description: "Create a basic USD payment intent.",
      method: "POST",
      path: "/v1/payment_intents",
      body: {
        amount: 2500,
        currency: "usd",
        automatic_payment_methods: { enabled: true },
      },
    },
  },
  {
    id: "stripe-list-customers",
    apiId: "stripe",
    name: "List customers",
    description: "List customer records.",
    category: "finance",
    method: "get",
    path: "/v1/customers",
    tags: ["customers", "billing"],
    template: {
      title: "Stripe list customers",
      description: "List recently created customers.",
      method: "GET",
      path: "/v1/customers",
      query: {
        limit: 10,
      },
    },
  },
  {
    id: "openweather-current",
    apiId: "openweather",
    name: "Current weather",
    description: "Get current weather by city.",
    category: "weather",
    method: "get",
    path: "/data/2.5/weather",
    tags: ["weather", "current"],
    template: {
      title: "OpenWeather current weather",
      description: "Get weather for a city in metric units.",
      method: "GET",
      path: "/data/2.5/weather",
      query: {
        q: "Bengaluru",
        units: "metric",
      },
    },
  },
  {
    id: "openweather-forecast",
    apiId: "openweather",
    name: "5-day forecast",
    description: "Get 5-day weather forecast.",
    category: "weather",
    method: "get",
    path: "/data/2.5/forecast",
    tags: ["weather", "forecast"],
    template: {
      title: "OpenWeather 5-day forecast",
      description: "Forecast by city in metric units.",
      method: "GET",
      path: "/data/2.5/forecast",
      query: {
        q: "Bengaluru",
        units: "metric",
        cnt: 8,
      },
    },
  },
  {
    id: "twilio-send-sms",
    apiId: "twilio",
    name: "Send SMS",
    description: "Send an SMS message.",
    category: "messaging",
    method: "post",
    path: "/2010-04-01/Accounts/{AccountSid}/Messages.json",
    tags: ["sms", "messaging"],
    template: {
      title: "Twilio send SMS",
      description: "Send a transactional SMS message.",
      method: "POST",
      path: "/2010-04-01/Accounts/{AccountSid}/Messages.json",
      pathParams: {
        AccountSid: "ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      },
      body: {
        From: "+14155550123",
        To: "+14155559876",
        Body: "Your code is 123456",
      },
    },
  },
  {
    id: "twilio-list-messages",
    apiId: "twilio",
    name: "List messages",
    description: "List recent SMS messages.",
    category: "messaging",
    method: "get",
    path: "/2010-04-01/Accounts/{AccountSid}/Messages.json",
    tags: ["sms", "history"],
    template: {
      title: "Twilio list messages",
      description: "Get recent outbound and inbound messages.",
      method: "GET",
      path: "/2010-04-01/Accounts/{AccountSid}/Messages.json",
      pathParams: {
        AccountSid: "ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      },
      query: {
        PageSize: 20,
      },
    },
  },
];
