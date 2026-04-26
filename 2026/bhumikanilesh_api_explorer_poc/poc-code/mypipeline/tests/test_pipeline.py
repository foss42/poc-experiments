"""
Comprehensive test suite for the API Explorer Pipeline
API Explorer Pipeline | GSoC 2026 | foss42/apidash
Author: Bhumika Nilesh Ujjainkar
"""

import json
import tempfile
import pytest
from pathlib import Path

import search_indexer as si_module  # needed for module-level path patching

from parser import (
    make_clean_endpoint,
    make_parsed_api,
    extract_example_from_schema,
    detect_auth_scheme,
    RefResolver,
    OpenAPIParser,
    SwaggerParser,
    HTMLParser,
    MarkdownParser,
)
from enricher import (
    Categorizer,
    AuthHeaderGenerator,
    Enricher,
    normalize_path_parameters,
    enrich_description,
    detect_content_type,
    generate_endpoint_note,
)
from publisher import (
    make_api_id,
    build_index_entry,
    build_full_template,
    write_if_changed,
    CategoryPublisher,
    Publisher,
)
from validator import (
    SchemaValidator,
    SecurityScanner,
    DuplicateDetector,
    Validator,
)
from deployer import (
    PreDeploymentVerifier,
    Deployer,
    generate_github_pages_config,
    generate_headers_file,
    generate_deploy_manifest,
)
from search_indexer import (
    extract_terms,
    compute_quality_score,
    SearchIndexBuilder,
    SearchIndexer,
)


# ═══════════════════════════════════════════════════════════════
# PARSER TESTS
# ═══════════════════════════════════════════════════════════════

class TestMakeCleanEndpoint:
    def test_method_uppercased(self):
        ep = make_clean_endpoint("Test", "get", "https://api.test.com")
        assert ep["method"] == "GET"

    def test_url_preserved(self):
        ep = make_clean_endpoint("Test", "post", "https://api.test.com/v1")
        assert ep["url"] == "https://api.test.com/v1"

    def test_empty_name_and_url(self):
        ep = make_clean_endpoint("", "post", "")
        assert ep["name"] == ""
        assert ep["method"] == "POST"
        assert ep["url"] == ""

    def test_defaults_applied(self):
        ep = make_clean_endpoint("T", "delete", "https://x.com")
        assert ep["parameters"] == []
        assert ep["request_body"] == {}
        assert ep["auth_scheme"] == "none"
        assert ep["description"] == ""
        assert ep["response_schema"] == {}

    def test_custom_fields_passed_through(self):
        ep = make_clean_endpoint(
            "T", "patch", "https://x.com",
            parameters=[{"name": "id"}],
            request_body={"key": "val"},
            auth_scheme="bearer",
            description="desc",
        )
        assert ep["parameters"] == [{"name": "id"}]
        assert ep["request_body"] == {"key": "val"}
        assert ep["auth_scheme"] == "bearer"
        assert ep["description"] == "desc"


class TestMakeParsedApi:
    def test_basic_structure(self):
        api = make_parsed_api("My API", "desc", "https://x.com", "1.0", [], "openapi_3")
        assert api["title"] == "My API"
        assert api["endpoint_count"] == 0

    def test_none_title_defaults(self):
        api = make_parsed_api(None, None, None, None, [], "swagger_2")
        assert api["title"] == "Unknown API"
        assert api["description"] == ""
        assert api["base_url"] == ""
        assert api["version"] == "1.0.0"

    def test_endpoint_count_matches_list(self):
        endpoints = [{"name": "a"}, {"name": "b"}]
        api = make_parsed_api("X", "d", "https://x.com", "2.0", endpoints, "html")
        assert api["endpoint_count"] == 2


class TestExtractExampleFromSchema:
    def test_explicit_example_returned_as_is(self):
        assert extract_example_from_schema({"type": "string", "example": "hello"}) == "hello"

    def test_string_default(self):
        assert extract_example_from_schema({"type": "string"}) == ""

    def test_integer_default(self):
        assert extract_example_from_schema({"type": "integer"}) == 0

    def test_boolean_default(self):
        assert extract_example_from_schema({"type": "boolean"}) is False

    def test_number_default(self):
        assert extract_example_from_schema({"type": "number"}) == 0.0

    def test_array_wraps_item(self):
        result = extract_example_from_schema({"type": "array", "items": {"type": "string"}})
        assert isinstance(result, list)
        assert len(result) == 1

    def test_object_recurses_into_properties(self):
        schema = {
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "age": {"type": "integer"},
            },
        }
        result = extract_example_from_schema(schema)
        assert isinstance(result, dict)
        assert "name" in result
        assert "age" in result

    def test_allOf_merged(self):
        schema = {
            "allOf": [
                {"type": "object", "properties": {"a": {"type": "string"}}},
                {"type": "object", "properties": {"b": {"type": "integer"}}},
            ]
        }
        result = extract_example_from_schema(schema)
        assert "a" in result
        assert "b" in result

    def test_oneOf_uses_first(self):
        schema = {
            "oneOf": [
                {"type": "string", "example": "first"},
                {"type": "integer"},
            ]
        }
        assert extract_example_from_schema(schema) == "first"

    def test_empty_schema_returns_empty_dict(self):
        assert extract_example_from_schema({}) == {}

    def test_depth_limit_does_not_crash(self):
        # Should not raise or infinitely recurse
        result = extract_example_from_schema({"type": "object"}, depth=10)
        assert result == {}


class TestDetectAuthScheme:
    def _bearer_spec(self):
        return {
            "components": {
                "securitySchemes": {
                    "BearerAuth": {"type": "http", "scheme": "bearer"}
                }
            },
            "security": [{"BearerAuth": []}],
        }

    def test_bearer_openapi3(self):
        assert detect_auth_scheme(self._bearer_spec(), {}, "3") == "bearer"

    def test_api_key_openapi3(self):
        spec = {
            "components": {"securitySchemes": {"ApiKey": {"type": "apikey"}}},
            "security": [{"ApiKey": []}],
        }
        assert detect_auth_scheme(spec, {}, "3") == "api_key"

    def test_basic_openapi3(self):
        spec = {
            "components": {"securitySchemes": {"Basic": {"type": "http", "scheme": "basic"}}},
            "security": [{"Basic": []}],
        }
        assert detect_auth_scheme(spec, {}, "3") == "basic"

    def test_oauth2_openapi3(self):
        spec = {
            "components": {"securitySchemes": {"OAuth2": {"type": "oauth2"}}},
            "security": [{"OAuth2": []}],
        }
        assert detect_auth_scheme(spec, {}, "3") == "oauth2"

    def test_no_security_returns_none(self):
        assert detect_auth_scheme({}, {}, "3") == "none"

    def test_api_key_swagger2(self):
        spec = {
            "securityDefinitions": {"apiKey": {"type": "apiKey"}},
            "security": [{"apiKey": []}],
        }
        assert detect_auth_scheme(spec, {}, "2") == "api_key"

    def test_basic_swagger2(self):
        spec = {
            "securityDefinitions": {"basic": {"type": "basic"}},
            "security": [{"basic": []}],
        }
        assert detect_auth_scheme(spec, {}, "2") == "basic"

    def test_operation_level_security_overrides_spec(self):
        spec = {
            "security": [{"GlobalAuth": []}],
            "components": {
                "securitySchemes": {
                    "GlobalAuth": {"type": "http", "scheme": "bearer"},
                    "OpAuth": {"type": "apikey"},
                }
            },
        }
        operation = {"security": [{"OpAuth": []}]}
        assert detect_auth_scheme(spec, operation, "3") == "api_key"


class TestRefResolver:
    def test_resolves_internal_ref(self):
        spec = {
            "components": {
                "schemas": {
                    "Foo": {"type": "object", "properties": {"id": {"type": "string"}}}
                }
            }
        }
        resolver = RefResolver(spec)
        result = resolver.resolve({"$ref": "#/components/schemas/Foo"})
        assert result["type"] == "object"
        assert "id" in result["properties"]

    def test_external_ref_returns_empty(self):
        resolver = RefResolver({})
        result = resolver.resolve({"$ref": "http://external.com/schema"})
        assert result == {}

    def test_missing_ref_returns_empty(self):
        resolver = RefResolver({})
        result = resolver.resolve({"$ref": "#/components/schemas/Missing"})
        assert result == {}

    def test_circular_ref_does_not_crash(self):
        spec = {
            "components": {
                "schemas": {
                    "Node": {
                        "type": "object",
                        "properties": {"child": {"$ref": "#/components/schemas/Node"}},
                    }
                }
            }
        }
        resolver = RefResolver(spec)
        result = resolver.resolve({"$ref": "#/components/schemas/Node"})
        assert isinstance(result, dict)

    def test_nested_ref_resolved(self):
        spec = {
            "components": {
                "schemas": {
                    "Inner": {"type": "string"},
                    "Outer": {
                        "type": "object",
                        "properties": {"inner": {"$ref": "#/components/schemas/Inner"}},
                    },
                }
            }
        }
        resolver = RefResolver(spec)
        result = resolver.resolve({"$ref": "#/components/schemas/Outer"})
        assert result["properties"]["inner"] == {"type": "string"}

    def test_non_ref_dict_resolved_recursively(self):
        spec = {"components": {"schemas": {"X": {"type": "boolean"}}}}
        resolver = RefResolver(spec)
        obj = {"a": {"$ref": "#/components/schemas/X"}, "b": 42}
        result = resolver.resolve(obj)
        assert result["a"] == {"type": "boolean"}
        assert result["b"] == 42

    def test_list_resolved_recursively(self):
        spec = {"components": {"schemas": {"X": {"type": "string"}}}}
        resolver = RefResolver(spec)
        result = resolver.resolve([{"$ref": "#/components/schemas/X"}, "literal"])
        assert result[0] == {"type": "string"}
        assert result[1] == "literal"

    def test_depth_limit_returns_obj(self):
        resolver = RefResolver({})
        # Passing a deep dict that would recurse — should return as-is at depth > 20
        assert resolver.resolve("leaf", depth=21) == "leaf"


class TestOpenAPIParser:
    def _spec(self, paths=None):
        return {
            "openapi": "3.0.0",
            "info": {"title": "Test API", "description": "desc", "version": "1.0.0"},
            "servers": [{"url": "https://api.test.com"}],
            "paths": paths or {},
        }

    def test_basic_get_endpoint(self):
        spec = self._spec({"/users": {"get": {"summary": "List users"}}})
        result = OpenAPIParser().parse(spec)
        assert result["title"] == "Test API"
        assert result["endpoint_count"] == 1
        assert result["endpoints"][0]["method"] == "GET"
        assert result["endpoints"][0]["url"] == "https://api.test.com/users"

    def test_post_with_request_body(self):
        spec = self._spec({
            "/items": {
                "post": {
                    "summary": "Create",
                    "requestBody": {
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {"name": {"type": "string", "example": "test"}},
                                }
                            }
                        }
                    },
                }
            }
        })
        result = OpenAPIParser().parse(spec)
        assert result["endpoints"][0]["request_body"] == {"name": "test"}

    def test_multiple_methods_on_same_path(self):
        spec = self._spec({
            "/things": {
                "get": {"summary": "List"},
                "post": {"summary": "Create"},
            }
        })
        result = OpenAPIParser().parse(spec)
        assert result["endpoint_count"] == 2

    def test_empty_paths_returns_zero_endpoints(self):
        spec = self._spec({})
        result = OpenAPIParser().parse(spec)
        assert result["endpoint_count"] == 0

    def test_base_url_from_servers(self):
        spec = self._spec()
        result = OpenAPIParser().parse(spec)
        assert result["base_url"] == "https://api.test.com"

    def test_no_servers_empty_base_url(self):
        spec = {
            "openapi": "3.0.0",
            "info": {"title": "T", "description": "d"},
            "paths": {},
        }
        result = OpenAPIParser().parse(spec)
        assert result["base_url"] == ""

    def test_ref_resolved_in_request_body(self):
        spec = {
            "openapi": "3.0.0",
            "info": {"title": "T", "description": "d"},
            "servers": [{"url": "https://x.com"}],
            "components": {
                "schemas": {
                    "Body": {
                        "type": "object",
                        "properties": {"model": {"type": "string", "example": "gpt-4"}},
                    }
                }
            },
            "paths": {
                "/chat": {
                    "post": {
                        "summary": "Chat",
                        "requestBody": {
                            "content": {
                                "application/json": {
                                    "schema": {"$ref": "#/components/schemas/Body"}
                                }
                            }
                        },
                    }
                }
            },
        }
        result = OpenAPIParser().parse(spec)
        assert result["endpoints"][0]["request_body"] == {"model": "gpt-4"}

    def test_path_level_parameters_merged(self):
        spec = self._spec({
            "/users/{id}": {
                "parameters": [{"name": "id", "in": "path", "required": True, "schema": {"type": "string"}}],
                "get": {"summary": "Get user"},
            }
        })
        result = OpenAPIParser().parse(spec)
        assert any(p["name"] == "id" for p in result["endpoints"][0]["parameters"])

    def test_bearer_auth_detected(self):
        spec = {
            "openapi": "3.0.0",
            "info": {"title": "T", "description": "d"},
            "servers": [{"url": "https://x.com"}],
            "security": [{"BearerAuth": []}],
            "components": {
                "securitySchemes": {"BearerAuth": {"type": "http", "scheme": "bearer"}}
            },
            "paths": {"/ep": {"get": {"summary": "EP"}}},
        }
        result = OpenAPIParser().parse(spec)
        assert result["endpoints"][0]["auth_scheme"] == "bearer"

    def test_endpoint_cap_at_50(self):
        paths = {f"/ep{i}": {"get": {"summary": f"EP {i}"}} for i in range(60)}
        spec = self._spec(paths)
        result = OpenAPIParser().parse(spec)
        assert result["endpoint_count"] <= 50


class TestSwaggerParser:
    def _spec(self, paths=None):
        return {
            "swagger": "2.0",
            "info": {"title": "Swagger API", "description": "desc", "version": "1.0"},
            "host": "api.example.com",
            "basePath": "/v1",
            "schemes": ["https"],
            "paths": paths or {},
        }

    def test_base_url_constructed_correctly(self):
        result = SwaggerParser().parse(self._spec())
        assert result["base_url"] == "https://api.example.com/v1"

    def test_body_parameter_becomes_request_body(self):
        spec = self._spec({
            "/charge": {
                "post": {
                    "summary": "Charge",
                    "parameters": [{
                        "in": "body",
                        "name": "body",
                        "schema": {
                            "type": "object",
                            "properties": {"amount": {"type": "integer", "example": 2000}},
                        },
                    }],
                }
            }
        })
        result = SwaggerParser().parse(spec)
        assert result["endpoints"][0]["request_body"] == {"amount": 2000}

    def test_query_parameter_not_treated_as_body(self):
        spec = self._spec({
            "/items": {
                "get": {
                    "summary": "List",
                    "parameters": [{"in": "query", "name": "limit", "type": "integer"}],
                }
            }
        })
        result = SwaggerParser().parse(spec)
        ep = result["endpoints"][0]
        assert ep["request_body"] == {}
        assert any(p["name"] == "limit" for p in ep["parameters"])

    def test_missing_host_uses_basepath_only(self):
        spec = {
            "swagger": "2.0",
            "info": {"title": "T", "description": "d", "version": "1"},
            "basePath": "/v2",
            "paths": {},
        }
        result = SwaggerParser().parse(spec)
        assert result["base_url"] == "/v2"

    def test_title_and_version_parsed(self):
        result = SwaggerParser().parse(self._spec())
        assert result["title"] == "Swagger API"
        assert result["version"] == "1.0"


class TestHTMLParser:
    _HTML = """
    <html>
    <head>
        <title>My API Reference</title>
        <meta name="description" content="My API description">
    </head>
    <body>
        <h2>List Users</h2>
        <pre><code>GET /v1/users</code></pre>
        <h2>Create User</h2>
        <pre><code>POST /v1/users</code></pre>
    </body>
    </html>
    """

    def test_endpoints_extracted_from_code_blocks(self):
        result = HTMLParser().parse(self._HTML, "https://api.test.com", "My API")
        assert result["endpoint_count"] == 2

    def test_base_url_prepended_to_path(self):
        result = HTMLParser().parse(self._HTML, "https://api.test.com", "My API")
        urls = [ep["url"] for ep in result["endpoints"]]
        assert "https://api.test.com/v1/users" in urls

    def test_title_extracted_from_html_title_tag(self):
        result = HTMLParser().parse(self._HTML, "", "")
        assert "My API" in result["title"]

    def test_description_from_meta_tag(self):
        result = HTMLParser().parse(self._HTML, "", "")
        assert result["description"] == "My API description"

    def test_empty_page_returns_zero_endpoints(self):
        html = "<html><body>No endpoints here</body></html>"
        result = HTMLParser().parse(html, "", "Empty")
        assert result["endpoint_count"] == 0

    def test_duplicate_endpoints_deduplicated(self):
        html = """
        <html><body>
        <pre><code>GET /v1/users</code></pre>
        <pre><code>GET /v1/users</code></pre>
        </body></html>
        """
        result = HTMLParser().parse(html, "", "")
        assert result["endpoint_count"] == 1

    def test_method_normalised_to_uppercase(self):
        html = "<html><body><pre><code>get /v1/items</code></pre></body></html>"
        result = HTMLParser().parse(html, "", "")
        if result["endpoint_count"] > 0:
            assert result["endpoints"][0]["method"] == "GET"


class TestMarkdownParser:
    _MD = """# Mistral AI API

Access Mistral's powerful language models easily.

## Chat Completions

`POST /v1/chat/completions`

## List Models

`GET /v1/models`
"""

    def test_endpoints_extracted(self):
        result = MarkdownParser().parse(self._MD, "https://api.mistral.ai", "Mistral")
        assert result["endpoint_count"] == 2

    def test_title_from_h1(self):
        result = MarkdownParser().parse(self._MD, "", "")
        assert result["title"] == "Mistral AI API"

    def test_description_from_first_paragraph(self):
        result = MarkdownParser().parse(self._MD, "", "")
        assert "Mistral" in result["description"]

    def test_base_url_prepended(self):
        result = MarkdownParser().parse(self._MD, "https://api.mistral.ai", "")
        urls = [ep["url"] for ep in result["endpoints"]]
        assert any("api.mistral.ai" in u for u in urls)

    def test_heading_used_as_endpoint_name(self):
        result = MarkdownParser().parse(self._MD, "", "")
        names = [ep["name"] for ep in result["endpoints"]]
        assert "Chat Completions" in names

    def test_empty_markdown_returns_zero_endpoints(self):
        result = MarkdownParser().parse("# Empty\n\nNo endpoints here.", "", "")
        assert result["endpoint_count"] == 0

    def test_fallback_api_name_used_when_no_h1(self):
        result = MarkdownParser().parse("No heading here", "", "FallbackName")
        assert result["title"] == "FallbackName"


# ═══════════════════════════════════════════════════════════════
# ENRICHER TESTS
# ═══════════════════════════════════════════════════════════════

class TestCategorizer:
    def test_keyword_match_text_generation(self):
        cats = Categorizer().categorize("Chat Bot", "text generation model", [])
        assert "text-generation" in cats

    def test_keyword_match_ai(self):
        cats = Categorizer().categorize("AI Model", "neural inference API", [])
        assert "ai" in cats

    def test_keyword_match_voice(self):
        cats = Categorizer().categorize("Voice API", "text to speech generation", [])
        assert "voice" in cats

    def test_keyword_match_finance(self):
        cats = Categorizer().categorize("Payments", "billing and invoice API", [])
        assert "finance" in cats

    def test_apis_guru_category_mapped(self):
        cats = Categorizer().categorize("X", "X", ["machine_learning"])
        assert "ai" in cats

    def test_apis_guru_audio_maps_to_voice(self):
        cats = Categorizer().categorize("X", "X", ["audio"])
        assert "voice" in cats

    def test_fallback_to_other(self):
        cats = Categorizer().categorize("Unknown", "nothing relevant", [])
        assert cats == ["other"]

    def test_multiple_categories_returned(self):
        cats = Categorizer().categorize("OpenAI", "text generation and image creation AI", [])
        assert len(cats) >= 2

    def test_only_predefined_categories_returned(self):
        from enricher import PREDEFINED_CATEGORIES
        cats = Categorizer().categorize("Test", "machine learning neural", ["machine_learning"])
        for c in cats:
            assert c in PREDEFINED_CATEGORIES


class TestAuthHeaderGenerator:
    def test_bearer_format(self):
        headers = AuthHeaderGenerator().generate("OpenAI API", "bearer")
        assert "Authorization" in headers
        assert headers["Authorization"].startswith("Bearer {{")
        assert headers["Authorization"].endswith("}}")

    def test_bearer_placeholder_contains_api_name(self):
        headers = AuthHeaderGenerator().generate("OpenAI API", "bearer")
        assert "OPENAI" in headers["Authorization"]

    def test_api_key_default_header(self):
        headers = AuthHeaderGenerator().generate("ElevenLabs", "api_key")
        assert "X-API-Key" in headers

    def test_api_key_custom_header(self):
        headers = AuthHeaderGenerator().generate("Test", "api_key", "X-CUSTOM-KEY")
        assert "X-CUSTOM-KEY" in headers

    def test_basic_auth_format(self):
        headers = AuthHeaderGenerator().generate("Test", "basic")
        assert "Authorization" in headers
        assert "Basic" in headers["Authorization"]

    def test_oauth2_format(self):
        headers = AuthHeaderGenerator().generate("Test", "oauth2")
        assert "Authorization" in headers
        assert "Bearer" in headers["Authorization"]

    def test_no_auth_returns_empty(self):
        headers = AuthHeaderGenerator().generate("Test", "none")
        assert headers == {}

    def test_placeholder_uses_screaming_snake_case(self):
        headers = AuthHeaderGenerator().generate("ElevenLabs Voice API", "bearer")
        auth = headers["Authorization"]
        assert "{{" in auth and "}}" in auth
        # placeholder should be uppercase with underscores
        import re
        match = re.search(r'\{\{([^}]+)\}\}', auth)
        placeholder = match.group(1)
        assert placeholder == placeholder.upper()


class TestNormalizePathParameters:
    def test_camel_case_converted_to_screaming_snake(self):
        assert "{{USER_ID}}" in normalize_path_parameters("/v1/users/{userId}")

    def test_snake_case_converted_to_upper(self):
        assert "{{VOICE_ID}}" in normalize_path_parameters("/v1/voices/{voice_id}")

    def test_multiple_params(self):
        result = normalize_path_parameters("/v1/{a}/{b}")
        assert "{{A}}" in result
        assert "{{B}}" in result

    def test_already_double_braced_left_unchanged(self):
        url = "https://api.com/v1/{{ALREADY}}"
        assert normalize_path_parameters(url) == url

    def test_no_params_unchanged(self):
        url = "https://api.com/v1/users"
        assert normalize_path_parameters(url) == url

    def test_full_url_preserved(self):
        result = normalize_path_parameters("https://api.com/v1/users/{userId}/posts")
        assert result.startswith("https://api.com/v1/users/")
        assert result.endswith("/posts")


class TestEnrichDescription:
    def test_empty_description_generated(self):
        desc = enrich_description("My API", "", ["ai"])
        assert "My API" in desc
        assert len(desc) > 0

    def test_description_equal_to_title_replaced(self):
        desc = enrich_description("My API", "My API", ["voice"])
        assert "Voice" in desc or "voice" in desc.lower()

    def test_long_description_truncated(self):
        long = "x " * 200
        desc = enrich_description("T", long, ["ai"])
        assert len(desc) <= 203  # 200 + "..."

    def test_truncation_ends_with_ellipsis(self):
        long = "word " * 100
        desc = enrich_description("T", long, ["ai"])
        assert desc.endswith("...")

    def test_html_tags_stripped(self):
        desc = enrich_description("T", "<b>Bold</b> description here that is long enough", ["ai"])
        assert "<b>" not in desc
        assert "Bold" in desc

    def test_short_valid_description_unchanged(self):
        desc = enrich_description("T", "A perfectly fine description", ["ai"])
        assert desc == "A perfectly fine description"


class TestDetectContentType:
    def test_get_returns_empty(self):
        assert detect_content_type("GET", {"key": "val"}, "https://x.com") == ""

    def test_delete_returns_empty(self):
        assert detect_content_type("DELETE", {"key": "val"}, "https://x.com") == ""

    def test_no_body_returns_empty(self):
        assert detect_content_type("POST", {}, "https://x.com") == ""

    def test_upload_url_returns_multipart(self):
        assert detect_content_type("POST", {"f": "v"}, "https://x.com/upload") == "multipart/form-data"

    def test_audio_url_returns_multipart(self):
        assert detect_content_type("POST", {"f": "v"}, "https://x.com/audio") == "multipart/form-data"

    def test_form_url_returns_form_encoded(self):
        assert detect_content_type("POST", {"f": "v"}, "https://x.com/form") == "application/x-www-form-urlencoded"

    def test_regular_post_returns_json(self):
        assert detect_content_type("POST", {"f": "v"}, "https://x.com/v1/chat") == "application/json"

    def test_put_returns_json(self):
        assert detect_content_type("PUT", {"f": "v"}, "https://x.com/v1/resource") == "application/json"


class TestGenerateEndpointNote:
    def test_auth_note_included(self):
        note = generate_endpoint_note("OpenAI API", "POST", "https://x.com/v1", "bearer")
        assert "API_KEY" in note

    def test_upload_note_included(self):
        note = generate_endpoint_note("Test", "POST", "https://x.com/upload", "bearer")
        assert "multipart" in note.lower() or "upload" in note.lower()

    def test_path_param_note_included(self):
        note = generate_endpoint_note("Test", "GET", "https://x.com/v1/{voice_id}", "bearer")
        assert "path" in note.lower() or "VOICE_ID" in note

    def test_no_auth_no_auth_note(self):
        note = generate_endpoint_note("Test", "GET", "https://x.com/v1/public", "none")
        assert "API_KEY" not in note

    def test_clean_endpoint_returns_empty_string(self):
        note = generate_endpoint_note("Test", "GET", "https://x.com/v1/simple", "none")
        assert note == ""


class TestEnricher:
    def _api(self, **kwargs):
        base = {
            "title": "ElevenLabs",
            "description": "Voice AI API for text to speech",
            "base_url": "https://api.elevenlabs.io/v1",
            "version": "1.0.0",
            "apis_guru_categories": ["audio"],
            "api_id": "elevenlabs",
            "source": "awesome",
            "endpoints": [
                {
                    "name": "TTS",
                    "method": "POST",
                    "url": "https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
                    "auth_scheme": "api_key",
                    "request_body": {"text": "hello"},
                    "parameters": [],
                    "description": "TTS endpoint",
                }
            ],
        }
        base.update(kwargs)
        return base

    def test_enrich_api_assigns_categories(self):
        result = Enricher().enrich_api(self._api())
        assert "voice" in result["categories"] or "ai" in result["categories"]

    def test_enrich_api_normalizes_path_params(self):
        result = Enricher().enrich_api(self._api())
        ep = result["requests"][0]
        assert "{{VOICE_ID}}" in ep["url"]

    def test_enrich_api_generates_auth_header(self):
        result = Enricher().enrich_api(self._api())
        headers = result["requests"][0]["headers"]
        assert any("ELEVENLABS" in v or "KEY" in v for v in headers.values())

    def test_enrich_api_adds_content_type_for_post_with_body(self):
        result = Enricher().enrich_api(self._api())
        headers = result["requests"][0]["headers"]
        assert "Content-Type" in headers

    def test_enrich_api_preserves_title_and_base_url(self):
        result = Enricher().enrich_api(self._api())
        assert result["title"] == "ElevenLabs"
        assert result["base_url"] == "https://api.elevenlabs.io/v1"

    def test_enrich_all_returns_list(self):
        results = Enricher().enrich_all([self._api()])
        assert isinstance(results, list)
        assert len(results) == 1

    def test_enrich_all_skips_failed_api_and_continues(self):
        # Second item is badly malformed (non-dict endpoints)
        bad = {"title": None, "description": None, "base_url": None,
               "version": None, "apis_guru_categories": [], "api_id": "", "endpoints": None}
        results = Enricher().enrich_all([self._api(), bad])
        # At minimum the good one should have enriched
        assert len(results) >= 1

    def test_no_auth_endpoint_no_auth_header(self):
        api = self._api()
        api["endpoints"][0]["auth_scheme"] = "none"
        result = Enricher().enrich_api(api)
        headers = result["requests"][0]["headers"]
        assert "Authorization" not in headers
        assert "X-API-Key" not in headers


# ═══════════════════════════════════════════════════════════════
# PUBLISHER TESTS
# ═══════════════════════════════════════════════════════════════

class TestMakeApiId:
    def test_uses_existing_id_field(self):
        assert make_api_id({"id": "openai"}) == "openai"

    def test_uses_existing_api_id_field(self):
        assert make_api_id({"api_id": "openai.com"}) == "openai.com"

    def test_generates_from_title_when_no_id(self):
        # "OpenAI API" → "openai-api" (spaces → hyphens, lowercased)
        assert make_api_id({"title": "OpenAI API"}) == "openai-api"

    def test_special_chars_in_title_removed(self):
        api_id = make_api_id({"title": "My!!!API"})
        assert "!" not in api_id

    def test_filesystem_unsafe_chars_in_id_sanitized(self):
        api_id = make_api_id({"id": "bad/id:here"})
        assert "/" not in api_id
        assert ":" not in api_id

    def test_empty_input_returns_unknown(self):
        assert make_api_id({}) == "unknown"

    def test_id_max_length_60_chars(self):
        api_id = make_api_id({"id": "a" * 100})
        assert len(api_id) <= 60

    def test_multiple_spaces_in_title_collapsed(self):
        api_id = make_api_id({"title": "My   API"})
        assert "--" not in api_id


class TestBuildIndexEntry:
    def _api(self):
        return {
            "title": "OpenAI API",
            "description": "A " * 200,
            "categories": ["ai", "text-generation"],
            "requests": [{}, {}, {}],
            "requires_auth": True,
            "source": "apis.guru",
        }

    def test_description_truncated_under_200_chars(self):
        entry = build_index_entry(self._api(), "openai")
        assert len(entry["description"]) < 200

    def test_truncated_description_ends_with_ellipsis(self):
        entry = build_index_entry(self._api(), "openai")
        assert entry["description"].endswith("...")

    def test_endpoint_count_matches_requests_length(self):
        entry = build_index_entry(self._api(), "openai")
        assert entry["endpoint_count"] == 3

    def test_filename_uses_api_id(self):
        entry = build_index_entry(self._api(), "openai")
        assert entry["filename"] == "apis/openai.json"

    def test_id_field_set(self):
        entry = build_index_entry(self._api(), "openai")
        assert entry["id"] == "openai"

    def test_categories_and_tags_set(self):
        entry = build_index_entry(self._api(), "openai")
        assert "ai" in entry["categories"]
        assert "ai" in entry["tags"]

    def test_short_description_not_modified(self):
        api = self._api()
        api["description"] = "Short description"
        entry = build_index_entry(api, "test")
        assert entry["description"] == "Short description"


class TestBuildFullTemplate:
    def _api(self):
        return {
            "title": "Test API",
            "description": "desc",
            "base_url": "https://x.com",
            "version": "1.0",
            "categories": ["ai"],
            "source": "apis.guru",
            "requests": [
                {"name": "ep1", "method": "GET", "url": "https://x.com/v1", "headers": {}, "body": {}},
                {"name": "ep2", "method": "POST", "url": "https://x.com/v1/create", "headers": {}, "body": {}, "note": "A note"},
            ],
        }

    def test_basic_structure(self):
        t = build_full_template(self._api(), "test")
        assert "id" in t
        assert "info" in t
        assert "requests" in t

    def test_duplicate_method_url_deduplicated(self):
        api = self._api()
        api["requests"].append(
            {"name": "ep1 dup", "method": "GET", "url": "https://x.com/v1", "headers": {}, "body": {}}
        )
        t = build_full_template(api, "test")
        assert len(t["requests"]) == 2  # only unique method+url combos

    def test_empty_url_endpoints_excluded(self):
        api = self._api()
        api["requests"].append(
            {"name": "no url", "method": "GET", "url": "", "headers": {}, "body": {}}
        )
        t = build_full_template(api, "test")
        urls = [r["url"] for r in t["requests"]]
        assert "" not in urls

    def test_note_included_when_present(self):
        t = build_full_template(self._api(), "test")
        notes = [r.get("note") for r in t["requests"]]
        assert "A note" in notes

    def test_info_block_has_required_fields(self):
        t = build_full_template(self._api(), "test")
        for field in ["title", "description", "tags", "version", "base_url", "source"]:
            assert field in t["info"]

    def test_tags_sorted_and_deduplicated(self):
        api = self._api()
        api["categories"] = ["voice", "ai", "ai"]
        t = build_full_template(api, "test")
        assert t["info"]["tags"] == sorted(set(["voice", "ai"]))


class TestWriteIfChanged:
    def test_first_write_returns_true(self, tmp_path):
        p = tmp_path / "out.json"
        assert write_if_changed(p, {"a": 1}) is True

    def test_same_content_returns_false(self, tmp_path):
        p = tmp_path / "out.json"
        write_if_changed(p, {"a": 1})
        assert write_if_changed(p, {"a": 1}) is False

    def test_changed_content_returns_true(self, tmp_path):
        p = tmp_path / "out.json"
        write_if_changed(p, {"a": 1})
        assert write_if_changed(p, {"a": 2}) is True

    def test_parent_dirs_created(self, tmp_path):
        p = tmp_path / "nested" / "deep" / "out.json"
        write_if_changed(p, {"x": 1})
        assert p.exists()

    def test_file_is_valid_json(self, tmp_path):
        p = tmp_path / "out.json"
        write_if_changed(p, {"key": "value", "num": 42})
        data = json.loads(p.read_text())
        assert data["key"] == "value"


class TestCategoryPublisher:
    def test_api_added_to_all_its_categories(self):
        cp = CategoryPublisher()
        cp.add_api({"title": "OpenAI", "categories": ["ai", "text-generation"], "id": "openai"})
        assert "ai" in cp.categories
        assert "text-generation" in cp.categories
        assert len(cp.categories["ai"]) == 1

    def test_multiple_apis_same_category(self):
        cp = CategoryPublisher()
        cp.add_api({"title": "OpenAI", "categories": ["ai"], "id": "openai"})
        cp.add_api({"title": "Anthropic", "categories": ["ai"], "id": "anthropic"})
        assert len(cp.categories["ai"]) == 2

    def test_publish_writes_category_files(self, tmp_path):
        import publisher as pub_mod
        orig = pub_mod.CATEGORIES_DIR
        pub_mod.CATEGORIES_DIR = tmp_path / "categories"
        try:
            cp = CategoryPublisher()
            cp.add_api({"title": "OpenAI", "categories": ["ai"], "id": "openai"})
            cp.publish()
            assert (tmp_path / "categories" / "ai.json").exists()
        finally:
            pub_mod.CATEGORIES_DIR = orig

    def test_category_file_sorted_alphabetically(self, tmp_path):
        import publisher as pub_mod
        orig = pub_mod.CATEGORIES_DIR
        pub_mod.CATEGORIES_DIR = tmp_path / "categories"
        try:
            cp = CategoryPublisher()
            cp.add_api({"title": "Zebra API", "categories": ["ai"], "id": "zebra"})
            cp.add_api({"title": "Alpha API", "categories": ["ai"], "id": "alpha"})
            cp.publish()
            data = json.loads((tmp_path / "categories" / "ai.json").read_text())
            titles = [a["title"] for a in data["apis"]]
            assert titles == sorted(titles, key=str.lower)
        finally:
            pub_mod.CATEGORIES_DIR = orig


class TestPublisher:
    def _enriched_api(self):
        return {
            "title": "Test API",
            "description": "A test API for unit tests",
            "base_url": "https://api.test.com",
            "version": "1.0.0",
            "categories": ["ai"],
            "requires_auth": True,
            "api_id": "test-api",
            "source": "apis.guru",
            "requests": [
                {
                    "name": "List Items",
                    "method": "GET",
                    "url": "https://api.test.com/v1/items",
                    "headers": {"Authorization": "Bearer {{TEST_API_KEY}}"},
                    "body": {},
                }
            ],
        }

    def test_publish_api_creates_file(self, tmp_path):
        pub = Publisher(output_dir=str(tmp_path))
        api_id, entry = pub.publish_api(self._enriched_api())
        assert api_id is not None
        assert (tmp_path / "apis" / f"{api_id}.json").exists()

    def test_publish_api_returns_index_entry(self, tmp_path):
        pub = Publisher(output_dir=str(tmp_path))
        api_id, entry = pub.publish_api(self._enriched_api())
        assert entry is not None
        assert entry["title"] == "Test API"

    def test_publish_api_skips_empty_requests(self, tmp_path):
        pub = Publisher(output_dir=str(tmp_path))
        api = self._enriched_api()
        api["requests"] = []
        api_id, entry = pub.publish_api(api)
        assert api_id is None
        assert entry is None

    def test_publish_all_generates_index(self, tmp_path):
        import publisher as pub_mod
        orig_index = pub_mod.INDEX_FILE
        orig_apis = pub_mod.APIS_DIR
        orig_cats = pub_mod.CATEGORIES_DIR
        pub_mod.INDEX_FILE = tmp_path / "index.json"
        pub_mod.APIS_DIR = tmp_path / "apis"
        pub_mod.CATEGORIES_DIR = tmp_path / "categories"
        try:
            pub = Publisher(output_dir=str(tmp_path))
            pub.publish_all([self._enriched_api()])
            assert (tmp_path / "index.json").exists()
            index = json.loads((tmp_path / "index.json").read_text())
            assert len(index) > 0
        finally:
            pub_mod.INDEX_FILE = orig_index
            pub_mod.APIS_DIR = orig_apis
            pub_mod.CATEGORIES_DIR = orig_cats


# ═══════════════════════════════════════════════════════════════
# VALIDATOR TESTS
# ═══════════════════════════════════════════════════════════════

class TestSchemaValidator:
    def _valid(self):
        return {
            "info": {
                "title": "Test API",
                "description": "A valid description here",
                "tags": ["ai"],
            },
            "requests": [{"name": "ep", "url": "https://x.com", "method": "GET"}],
        }

    def test_valid_template_no_errors(self):
        assert SchemaValidator().validate(self._valid()) == []

    def test_missing_info_field(self):
        errors = SchemaValidator().validate({"requests": []})
        assert any("info" in e["message"] for e in errors)

    def test_missing_requests_field(self):
        errors = SchemaValidator().validate({"info": {}})
        assert any("requests" in e["message"] for e in errors)

    def test_empty_template_has_errors(self):
        assert len(SchemaValidator().validate({})) > 0

    def test_invalid_method_reported(self):
        t = self._valid()
        t["requests"][0]["method"] = "FETCH"
        errors = SchemaValidator().validate(t)
        assert any("method" in e["message"] for e in errors)

    def test_empty_requests_list_reported(self):
        t = self._valid()
        t["requests"] = []
        errors = SchemaValidator().validate(t)
        assert any("No requests" in e["message"] for e in errors)

    def test_missing_info_title(self):
        t = self._valid()
        del t["info"]["title"]
        errors = SchemaValidator().validate(t)
        assert any("title" in e["message"] for e in errors)

    def test_missing_info_description(self):
        t = self._valid()
        del t["info"]["description"]
        errors = SchemaValidator().validate(t)
        assert any("description" in e["message"] for e in errors)

    def test_missing_tags_reported(self):
        t = self._valid()
        del t["info"]["tags"]
        errors = SchemaValidator().validate(t)
        assert any("tags" in e["message"] for e in errors)

    def test_short_description_is_quality_warning(self):
        t = self._valid()
        t["info"]["description"] = "Short"
        errors = SchemaValidator().validate(t)
        quality_errs = [e for e in errors if e.get("type") == "quality"]
        assert len(quality_errs) > 0

    def test_missing_request_url(self):
        t = self._valid()
        del t["requests"][0]["url"]
        errors = SchemaValidator().validate(t)
        assert any("url" in e["message"] for e in errors)

    def test_missing_request_name(self):
        t = self._valid()
        del t["requests"][0]["name"]
        errors = SchemaValidator().validate(t)
        assert any("name" in e["message"] for e in errors)

    def test_all_valid_http_methods_accepted(self):
        for method in ["GET", "POST", "PUT", "DELETE", "PATCH"]:
            t = self._valid()
            t["requests"][0]["method"] = method
            errors = SchemaValidator().validate(t)
            method_errors = [e for e in errors if "method" in e.get("message", "")]
            assert method_errors == [], f"{method} should be valid"


class TestSecurityScanner:
    def _wrap(self, headers):
        return {
            "info": {"title": "x", "description": "x", "tags": ["ai"]},
            "requests": [{"name": "t", "url": "https://x.com", "method": "GET", "headers": headers}],
        }

    def test_openai_key_detected(self):
        # key needs 20+ chars after "sk-"
        template = self._wrap({"Authorization": "Bearer sk-abc12345678901234567890"})
        assert len(SecurityScanner().scan(template)) > 0

    def test_placeholder_not_flagged(self):
        template = self._wrap({"Authorization": "Bearer {{OPENAI_API_KEY}}"})
        assert SecurityScanner().scan(template) == []

    def test_clean_template_no_issues(self):
        template = self._wrap({"Content-Type": "application/json"})
        assert SecurityScanner().scan(template) == []

    def test_aws_key_detected(self):
        template = self._wrap({"X-AWS": "AKIAIOSFODNN7EXAMPLE"})
        assert len(SecurityScanner().scan(template)) > 0

    def test_github_token_detected(self):
        ghp = "ghp_" + "a" * 36
        template = self._wrap({"Authorization": f"Bearer {ghp}"})
        assert len(SecurityScanner().scan(template)) > 0

    def test_localhost_url_flagged(self):
        t = {
            "info": {"title": "x", "description": "x", "tags": ["ai"]},
            "requests": [{"name": "t", "url": "http://localhost:8080/api", "method": "GET"}],
        }
        assert len(SecurityScanner().scan_localhost(t)) > 0

    def test_127_flagged(self):
        t = {
            "info": {"title": "x", "description": "x", "tags": ["ai"]},
            "requests": [{"name": "t", "url": "http://127.0.0.1/api", "method": "GET"}],
        }
        assert len(SecurityScanner().scan_localhost(t)) > 0

    def test_production_url_not_flagged(self):
        t = {
            "info": {"title": "x", "description": "x", "tags": ["ai"]},
            "requests": [{"name": "t", "url": "https://api.prod.com/v1", "method": "GET"}],
        }
        assert SecurityScanner().scan_localhost(t) == []


class TestDuplicateDetector:
    def _tpl(self, title):
        return {"info": {"title": title}, "requests": []}

    def test_first_occurrence_not_duplicate(self):
        dd = DuplicateDetector()
        is_dup, _ = dd.is_duplicate(self._tpl("OpenAI API"), "openai.json")
        assert is_dup is False

    def test_second_occurrence_is_duplicate(self):
        dd = DuplicateDetector()
        dd.is_duplicate(self._tpl("OpenAI API"), "openai.json")
        is_dup, reason = dd.is_duplicate(self._tpl("OpenAI API v2"), "openai2.json")
        assert is_dup is True
        assert "openai.json" in reason

    def test_version_number_stripped_from_title(self):
        dd = DuplicateDetector()
        dd.is_duplicate(self._tpl("Stripe API"), "stripe.json")
        is_dup, _ = dd.is_duplicate(self._tpl("Stripe API v3.1"), "stripe2.json")
        assert is_dup is True

    def test_different_apis_not_duplicate(self):
        dd = DuplicateDetector()
        dd.is_duplicate(self._tpl("OpenAI API"), "openai.json")
        is_dup, _ = dd.is_duplicate(self._tpl("ElevenLabs Voice"), "elevenlabs.json")
        assert is_dup is False

    def test_normalize_title_lowercases(self):
        dd = DuplicateDetector()
        assert dd.normalize_title("OpenAI API") == dd.normalize_title("openai api")

    def test_normalize_strips_api_suffix(self):
        dd = DuplicateDetector()
        normalized = dd.normalize_title("Stripe API")
        assert "api" not in normalized


class TestValidatorFull:
    def _make_marketplace(self, tmp_path, templates: dict):
        """Helper: write templates to tmp marketplace dir + build index."""
        apis_dir = tmp_path / "apis"
        apis_dir.mkdir()
        index = {}
        for name, content in templates.items():
            (apis_dir / f"{name}.json").write_text(json.dumps(content))
            index[name] = {"title": content.get("info", {}).get("title", name),
                           "filename": f"apis/{name}.json", "categories": ["ai"]}
        (tmp_path / "index.json").write_text(json.dumps(index))
        return tmp_path

    def _valid_template(self, title="Good API"):
        return {
            "info": {"title": title, "description": "A valid description here", "tags": ["ai"]},
            "requests": [{"name": "ep", "url": "https://api.com/v1", "method": "GET"}],
        }

    def test_valid_template_kept(self, tmp_path):
        mp = self._make_marketplace(tmp_path, {"good": self._valid_template()})
        Validator(marketplace_dir=str(mp)).validate_all()
        assert (mp / "apis" / "good.json").exists()

    def test_invalid_method_template_removed(self, tmp_path):
        bad = self._valid_template("Bad API")
        bad["requests"][0]["method"] = "INVALID"
        mp = self._make_marketplace(tmp_path, {"bad": bad})
        Validator(marketplace_dir=str(mp)).validate_all()
        assert not (mp / "apis" / "bad.json").exists()

    def test_leaked_key_template_removed(self, tmp_path):
        leaked = self._valid_template("Leaked")
        leaked["requests"][0]["headers"] = {"Authorization": "Bearer sk-abc12345678901234567890"}
        mp = self._make_marketplace(tmp_path, {"leaked": leaked})
        Validator(marketplace_dir=str(mp)).validate_all()
        assert not (mp / "apis" / "leaked.json").exists()

    def test_removed_template_purged_from_index(self, tmp_path):
        bad = self._valid_template("Bad API")
        bad["requests"][0]["method"] = "INVALID"
        mp = self._make_marketplace(tmp_path, {"bad": bad, "good": self._valid_template()})
        Validator(marketplace_dir=str(mp)).validate_all()
        index = json.loads((mp / "index.json").read_text())
        assert "bad" not in index
        assert "good" in index

    def test_summary_counts_correct(self, tmp_path):
        bad = self._valid_template("Bad")
        bad["requests"][0]["method"] = "BAD"
        mp = self._make_marketplace(tmp_path, {"good": self._valid_template(), "bad": bad})
        summary = Validator(marketplace_dir=str(mp)).validate_all()
        assert summary["valid"] == 1
        assert summary["invalid"] == 1
        assert summary["removed"] == 1

    def test_no_apis_dir_returns_zeros(self, tmp_path):
        summary = Validator(marketplace_dir=str(tmp_path)).validate_all()
        assert summary["valid"] == 0
        assert summary["invalid"] == 0


# ═══════════════════════════════════════════════════════════════
# DEPLOYER TESTS
# ═══════════════════════════════════════════════════════════════

class TestPreDeploymentVerifier:
    def test_missing_index_fails(self, tmp_path):
        result = PreDeploymentVerifier().verify(tmp_path)
        assert result["passed"] is False
        assert any("index.json" in e for e in result["errors"])

    def test_invalid_index_json_fails(self, tmp_path):
        (tmp_path / "index.json").write_text("not valid json {{{")
        result = PreDeploymentVerifier().verify(tmp_path)
        assert result["passed"] is False

    def test_valid_structure_passes(self, tmp_path):
        (tmp_path / "index.json").write_text("{}")
        (tmp_path / "apis").mkdir()
        (tmp_path / "apis" / "test.json").write_text(
            json.dumps({"info": {}, "requests": []})
        )
        result = PreDeploymentVerifier().verify(tmp_path)
        assert "file_counts" in result

    def test_missing_required_fields_in_api_file_flagged(self, tmp_path):
        (tmp_path / "index.json").write_text('{"test": {}}')
        (tmp_path / "apis").mkdir()
        # Missing both "info" and "requests"
        (tmp_path / "apis" / "test.json").write_text('{"title": "Missing fields"}')
        result = PreDeploymentVerifier().verify(tmp_path)
        assert len(result["errors"]) > 0
        assert result["passed"] is False

    def test_file_count_tracked(self, tmp_path):
        (tmp_path / "index.json").write_text('{"a": {}, "b": {}}')
        (tmp_path / "apis").mkdir()
        for name in ["a", "b"]:
            (tmp_path / "apis" / f"{name}.json").write_text(
                json.dumps({"info": {}, "requests": []})
            )
        result = PreDeploymentVerifier().verify(tmp_path)
        assert result["file_counts"]["api_files"] == 2

    def test_count_mismatch_is_warning_not_error(self, tmp_path):
        # index has 2 entries but only 1 file
        (tmp_path / "index.json").write_text('{"a": {}, "b": {}}')
        (tmp_path / "apis").mkdir()
        (tmp_path / "apis" / "a.json").write_text(json.dumps({"info": {}, "requests": []}))
        result = PreDeploymentVerifier().verify(tmp_path)
        assert len(result["warnings"]) > 0


class TestGithubPagesConfig:
    def test_config_contains_json_include(self):
        config = generate_github_pages_config()
        assert "*.json" in config

    def test_config_is_string(self):
        assert isinstance(generate_github_pages_config(), str)

    def test_headers_contains_cors_origin(self):
        headers = generate_headers_file()
        assert "Access-Control-Allow-Origin" in headers

    def test_headers_is_string(self):
        assert isinstance(generate_headers_file(), str)


class TestGenerateDeployManifest:
    def _setup(self, tmp_path):
        apis_dir = tmp_path / "apis"
        apis_dir.mkdir()
        (tmp_path / "index.json").write_text(
            json.dumps({"openai": {"categories": ["ai"]}})
        )
        (apis_dir / "openai.json").write_text(
            json.dumps({"info": {}, "requests": [{}, {}, {}]})
        )
        return tmp_path

    def test_endpoint_count_summed(self, tmp_path):
        mp = self._setup(tmp_path)
        verify = {"passed": True, "errors": [], "warnings": [], "file_counts": {"api_files": 1}, "total_size_kb": 5}
        manifest = generate_deploy_manifest(mp, verify)
        assert manifest["endpoint_count"] == 3

    def test_category_counts_populated(self, tmp_path):
        mp = self._setup(tmp_path)
        verify = {"passed": True, "errors": [], "warnings": [], "file_counts": {"api_files": 1}, "total_size_kb": 5}
        manifest = generate_deploy_manifest(mp, verify)
        assert manifest["category_counts"].get("ai") == 1

    def test_manifest_has_required_keys(self, tmp_path):
        mp = self._setup(tmp_path)
        verify = {"passed": True, "errors": [], "warnings": [], "file_counts": {"api_files": 1}, "total_size_kb": 0}
        manifest = generate_deploy_manifest(mp, verify)
        for key in ["deployed_at", "api_count", "endpoint_count", "endpoints", "verification"]:
            assert key in manifest

    def test_deployed_at_is_iso_format(self, tmp_path):
        mp = self._setup(tmp_path)
        verify = {"passed": True, "errors": [], "warnings": [], "file_counts": {"api_files": 1}, "total_size_kb": 0}
        manifest = generate_deploy_manifest(mp, verify)
        assert "T" in manifest["deployed_at"]
        assert "Z" in manifest["deployed_at"]


class TestDeployer:
    def _make_valid_marketplace(self, tmp_path):
        import deployer as dep_mod
        dep_mod.DEPLOY_MANIFEST = tmp_path / "logs" / "deploy_manifest.json"

        apis_dir = tmp_path / "apis"
        apis_dir.mkdir()
        cats_dir = tmp_path / "categories"
        cats_dir.mkdir()
        (tmp_path / "index.json").write_text(
            json.dumps({"openai": {"title": "OpenAI", "categories": ["ai"]}})
        )
        (apis_dir / "openai.json").write_text(
            json.dumps({
                "info": {"title": "OpenAI"},
                "requests": [{"name": "chat", "method": "POST", "url": "https://api.openai.com/v1/chat"}],
            })
        )

    def test_deploy_succeeds_with_valid_marketplace(self, tmp_path):
        self._make_valid_marketplace(tmp_path)
        summary = Deployer(marketplace_dir=str(tmp_path)).deploy()
        assert summary["status"] == "ready"

    def test_deploy_missing_marketplace_fails(self, tmp_path):
        result = Deployer(marketplace_dir=str(tmp_path / "nonexistent")).deploy()
        assert result["status"] == "failed"

    def test_nojekyll_file_created(self, tmp_path):
        self._make_valid_marketplace(tmp_path)
        Deployer(marketplace_dir=str(tmp_path)).deploy()
        assert (tmp_path / ".nojekyll").exists()

    def test_config_yml_created(self, tmp_path):
        self._make_valid_marketplace(tmp_path)
        Deployer(marketplace_dir=str(tmp_path)).deploy()
        assert (tmp_path / "_config.yml").exists()

    def test_headers_file_created(self, tmp_path):
        self._make_valid_marketplace(tmp_path)
        Deployer(marketplace_dir=str(tmp_path)).deploy()
        assert (tmp_path / "_headers").exists()

    def test_manifest_json_created_in_marketplace(self, tmp_path):
        self._make_valid_marketplace(tmp_path)
        Deployer(marketplace_dir=str(tmp_path)).deploy()
        assert (tmp_path / "manifest.json").exists()

    def test_summary_includes_api_count(self, tmp_path):
        self._make_valid_marketplace(tmp_path)
        summary = Deployer(marketplace_dir=str(tmp_path)).deploy()
        assert summary["api_count"] == 1


# ═══════════════════════════════════════════════════════════════
# SEARCH INDEXER TESTS
# ═══════════════════════════════════════════════════════════════

class TestExtractTerms:
    def test_title_words_included(self):
        terms = extract_terms("openai", {"title": "OpenAI API", "description": "", "tags": []})
        assert "openai" in terms

    def test_description_words_included(self):
        terms = extract_terms("x", {"title": "X", "description": "AI text generation model", "tags": []})
        assert "text" in terms
        assert "generation" in terms

    def test_tags_included(self):
        terms = extract_terms("x", {"title": "X", "description": "", "tags": ["voice"]})
        assert "voice" in terms

    def test_hyphenated_tag_split(self):
        terms = extract_terms("x", {"title": "X", "description": "", "tags": ["text-generation"]})
        assert "text" in terms
        assert "generation" in terms

    def test_stop_words_excluded(self):
        terms = extract_terms("api", {"title": "The API", "description": "This is a test", "tags": []})
        for stop in ["the", "is", "a", "this", "api"]:
            assert stop not in terms

    def test_short_terms_excluded(self):
        terms = extract_terms("ab", {"title": "AB Test", "description": "to be", "tags": []})
        for t in terms:
            assert len(t) >= 3

    def test_api_id_parts_included(self):
        terms = extract_terms("eleven-labs", {"title": "ElevenLabs", "description": "", "tags": []})
        assert "eleven" in terms
        assert "labs" in terms

    def test_terms_are_lowercase(self):
        terms = extract_terms("openai", {"title": "OpenAI Chat API", "description": "", "tags": []})
        for t in terms:
            assert t == t.lower()

    def test_max_50_terms_per_api(self):
        long_desc = " ".join([f"word{i}" for i in range(200)])
        terms = extract_terms("x", {"title": "X", "description": long_desc, "tags": []})
        assert len(terms) <= 50


class TestComputeQualityScore:
    def test_empty_entry_scores_zero(self):
        assert compute_quality_score({}) == 0

    def test_description_adds_score(self):
        entry = {"description": "A short desc"}
        assert compute_quality_score(entry) > 0

    def test_long_description_adds_more(self):
        short = compute_quality_score({"description": "Short"})
        long = compute_quality_score({"description": "A " * 30})
        assert long > short

    def test_tags_add_score(self):
        without = compute_quality_score({"description": "desc"})
        with_tags = compute_quality_score({"description": "desc", "tags": ["ai"]})
        assert with_tags > without

    def test_endpoints_add_score(self):
        without = compute_quality_score({"description": "desc"})
        with_eps = compute_quality_score({"description": "desc", "endpoint_count": 5})
        assert with_eps > without

    def test_apis_guru_source_adds_score(self):
        base = {"description": "desc", "endpoint_count": 2}
        without = compute_quality_score(base)
        with_src = compute_quality_score({**base, "source": "apis.guru"})
        assert with_src > without

    def test_full_template_adds_score(self):
        entry = {"description": "A good description with plenty of chars to score well", "tags": ["ai"], "endpoint_count": 3, "source": "apis.guru"}
        full = {"requests": [{"body": {"key": "val"}, "headers": {"Authorization": "Bearer {{KEY}}"}}], "info": {"base_url": "https://api.com"}}
        with_full = compute_quality_score(entry, full)
        without_full = compute_quality_score(entry, None)
        assert with_full > without_full

    def test_score_capped_at_100(self):
        entry = {"description": "A " * 100, "tags": ["ai", "voice"], "endpoint_count": 100, "source": "apis.guru"}
        full = {"requests": [{"body": {"k": "v"}, "headers": {"Authorization": "Bearer {{K}}"}}], "info": {"base_url": "https://x.com"}}
        assert compute_quality_score(entry, full) <= 100


class TestSearchIndexBuilder:
    def test_add_api_creates_inverted_index_entries(self):
        b = SearchIndexBuilder()
        b.add_api("openai", {"title": "OpenAI API", "description": "AI text generation", "tags": ["ai"], "endpoint_count": 5, "source": "apis.guru"})
        result = b.build()
        assert "openai" in result["terms"]

    def test_term_maps_to_correct_api(self):
        b = SearchIndexBuilder()
        b.add_api("elevenlabs", {"title": "ElevenLabs", "description": "Voice generation", "tags": ["voice"], "endpoint_count": 2, "source": ""})
        result = b.build()
        assert "elevenlabs" in result["terms"].get("voice", [])

    def test_no_duplicate_api_id_per_term(self):
        b = SearchIndexBuilder()
        b.add_api("openai", {"title": "OpenAI API", "description": "AI text", "tags": ["ai"], "endpoint_count": 1, "source": ""})
        b.add_api("openai", {"title": "OpenAI API", "description": "AI text", "tags": ["ai"], "endpoint_count": 1, "source": ""})
        result = b.build()
        for term, api_ids in result["terms"].items():
            assert api_ids.count("openai") == 1

    def test_build_result_has_required_keys(self):
        b = SearchIndexBuilder()
        result = b.build()
        for key in ["version", "generated_at", "api_count", "term_count", "terms", "apis"]:
            assert key in result

    def test_higher_score_apis_ranked_first(self):
        b = SearchIndexBuilder()
        # low quality
        b.add_api("low", {"title": "Low Quality text", "description": "Short", "tags": [], "endpoint_count": 0, "source": ""})
        # high quality
        b.add_api("high", {"title": "High Quality text", "description": "A very detailed description with more than fifty chars easily", "tags": ["ai"], "endpoint_count": 10, "source": "apis.guru"})
        result = b.build()
        text_results = result["terms"].get("text", [])
        if len(text_results) >= 2:
            high_pos = text_results.index("high")
            low_pos = text_results.index("low")
            assert high_pos < low_pos


class TestSearchIndexer:
    def _setup(self, tmp_path):
        """Patch module-level paths and create a minimal marketplace."""
        si_module.SEARCH_DIR = tmp_path / "search"
        si_module.SEARCH_INDEX = si_module.SEARCH_DIR / "index.json"

        apis_dir = tmp_path / "apis"
        apis_dir.mkdir()
        index = {
            "openai": {
                "title": "OpenAI API",
                "description": "AI text generation and embeddings",
                "tags": ["ai", "text-generation"],
                "endpoint_count": 5,
                "source": "apis.guru",
                "requires_auth": True,
                "filename": "apis/openai.json",
            },
            "elevenlabs": {
                "title": "ElevenLabs Voice",
                "description": "Voice generation API",
                "tags": ["voice"],
                "endpoint_count": 3,
                "source": "awesome",
                "requires_auth": True,
                "filename": "apis/elevenlabs.json",
            },
        }
        (tmp_path / "index.json").write_text(json.dumps(index))
        (apis_dir / "openai.json").write_text(
            json.dumps({"info": {"base_url": "https://api.openai.com"},
                        "requests": [{"body": {"m": "gpt-4"}, "headers": {"Authorization": "Bearer {{K}}"}}]})
        )
        return tmp_path

    def test_build_index_succeeds(self, tmp_path):
        mp = self._setup(tmp_path)
        result = SearchIndexer(marketplace_dir=str(mp)).build_index()
        assert result["status"] == "success"

    def test_build_index_counts_apis(self, tmp_path):
        mp = self._setup(tmp_path)
        result = SearchIndexer(marketplace_dir=str(mp)).build_index()
        assert result["apis_indexed"] == 2

    def test_search_index_file_created(self, tmp_path):
        mp = self._setup(tmp_path)
        SearchIndexer(marketplace_dir=str(mp)).build_index()
        assert si_module.SEARCH_INDEX.exists()

    def test_term_count_positive(self, tmp_path):
        mp = self._setup(tmp_path)
        result = SearchIndexer(marketplace_dir=str(mp)).build_index()
        assert result["term_count"] > 0

    def test_voice_term_maps_to_elevenlabs(self, tmp_path):
        mp = self._setup(tmp_path)
        SearchIndexer(marketplace_dir=str(mp)).build_index()
        data = json.loads(si_module.SEARCH_INDEX.read_text())
        assert "elevenlabs" in data["terms"].get("voice", [])

    def test_missing_index_returns_failed(self, tmp_path):
        si_module.SEARCH_DIR = tmp_path / "search"
        si_module.SEARCH_INDEX = si_module.SEARCH_DIR / "index.json"
        result = SearchIndexer(marketplace_dir=str(tmp_path)).build_index()
        assert result["status"] == "failed"


# ═══════════════════════════════════════════════════════════════
# INTEGRATION TEST
# ═══════════════════════════════════════════════════════════════

class TestIntegration:
    def test_full_pipeline_flow(self):
        parsed = [
            {
                "title": "Test API",
                "description": "AI API for text generation",
                "base_url": "https://x.com",
                "endpoints": [
                    {
                        "name": "Chat",
                        "method": "POST",
                        "url": "https://x.com/v1/chat",
                        "auth_scheme": "bearer",
                        "request_body": {"prompt": "hello"},
                        "parameters": [],
                        "description": "Chat endpoint",
                    }
                ],
                "version": "1.0",
                "source_format": "openapi",
                "apis_guru_categories": ["machine_learning"],
                "api_id": "test-api",
                "source": "apis.guru",
            }
        ]
        enriched = Enricher().enrich_all(parsed)
        assert len(enriched) == 1
        assert "ai" in enriched[0]["categories"] or "text-generation" in enriched[0]["categories"]

        enriched_api = enriched[0]
        api_id = make_api_id(enriched_api)
        assert isinstance(api_id, str) and len(api_id) > 0

        index_entry = build_index_entry(enriched_api, api_id)
        assert index_entry["endpoint_count"] == 1

        template = build_full_template(enriched_api, api_id)
        schema_errors = SchemaValidator().validate(template)
        assert schema_errors == []

        security_issues = SecurityScanner().scan(template)
        assert security_issues == []

    def test_categorizer_to_enricher_chain(self):
        cats = Categorizer().categorize("Voice Bot", "text to speech generation API", [])
        assert isinstance(cats, list)
        assert len(cats) > 0
        desc = enrich_description("Voice Bot", "", cats)
        assert len(desc) > 0

    def test_parser_to_publisher_chain(self):
        spec = {
            "openapi": "3.0.0",
            "info": {"title": "Chain Test", "description": "Test", "version": "1.0"},
            "servers": [{"url": "https://api.chain.com"}],
            "paths": {"/data": {"get": {"summary": "Get data"}}},
        }
        parsed = OpenAPIParser().parse(spec)
        assert parsed["endpoint_count"] == 1

        enriched = Enricher().enrich_api({
            **parsed,
            "apis_guru_categories": [],
            "api_id": "chain-test",
            "source": "apis.guru",
        })
        template = build_full_template(enriched, "chain-test")
        assert len(template["requests"]) == 1
        assert SchemaValidator().validate(template) == []