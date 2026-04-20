export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD";

export interface SampleRequest {
  name: string;
  method: HttpMethod;
  url: string;
  queryParams?: Record<string, string>;
  headers?: Record<string, string>;
  body?: string;
  bodyContentType?: string;
}

export const SAMPLE_REQUESTS: SampleRequest[] = [
  {
    name: "Basic GET",
    method: "GET",
    url: "https://api.apidash.dev",
  },
  {
    name: "GET Country Data",
    method: "GET",
    url: "https://api.apidash.dev/country/data",
    queryParams: { code: "US" },
  },
  {
    name: "GET Humanize Social",
    method: "GET",
    url: "https://api.apidash.dev/humanize/social",
    queryParams: { num: "8700000", digits: "3", system: "SS" },
  },
  {
    name: "GET with Headers",
    method: "GET",
    url: "https://api.apidash.dev/humanize/social",
    queryParams: { num: "8700000", digits: "3" },
    headers: { "User-Agent": "Test Agent" },
  },
  {
    name: "POST Case Lower",
    method: "POST",
    url: "https://api.apidash.dev/case/lower",
    body: JSON.stringify({ text: "I LOVE Flutter" }),
    bodyContentType: "application/json",
  },
  {
    name: "POST Case Lower (Full)",
    method: "POST",
    url: "https://api.apidash.dev/case/lower",
    headers: {
      "User-Agent": "Test Agent",
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({ text: "I LOVE Flutter" }),
    bodyContentType: "application/json",
  },
  {
    name: "POST Form Data",
    method: "POST",
    url: "https://api.apidash.dev/io/form",
    body: JSON.stringify({ text: "API", sep: "|", times: "3" }),
    bodyContentType: "application/json",
  },
  {
    name: "GET Convert Leet",
    method: "GET",
    url: "https://api.apidash.dev/convert/leet",
    queryParams: { text: "Hello World" },
  },
];
