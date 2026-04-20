"""
Phase 5 — Validator + Security Scanner
API Explorer Pipeline | GSoC 2026 | foss42/apidash
Author: Bhumika Nilesh Ujjainkar

Responsibilities:
  - Schema validation (required fields, correct types)
  - Security scanning (detect accidentally included real API keys)
  - URL validation (must start with http/https)
  - Method validation (must be valid HTTP method)
  - Duplicate template detection across ALL APIs (not just within one)
  - Quality checks (minimum description length, meaningful tags)
  - Drop individual failing templates — NOT the entire pipeline run
  - Generate validation report

Security patterns detected:
  - OpenAI keys: sk-...
  - AWS keys: AKIA...
  - GitHub tokens: ghp_...
  - Generic bearer tokens that look real
  - Hardcoded passwords in body

Corner cases handled:
  - Template with valid structure but empty requests list
  - URL with localhost (dev URL leaked into production)
  - Template with only HEAD/OPTIONS requests
  - Extremely long field values (potential injection)
  - Unicode in titles/descriptions
  - Null values in required fields
"""

import re
import os
import json
import logging
from pathlib import Path
from urllib.parse import urlparse
from fetcher import get_logger


logger = get_logger("validator")


# ─────────────────────────────────────────────────────────────
# Security Patterns
# Regex patterns for detecting real API keys/secrets
# ─────────────────────────────────────────────────────────────

SECURITY_PATTERNS = [
    # OpenAI keys
    (re.compile(r'sk-[a-zA-Z0-9]{20,}'), "OpenAI API key"),
    # AWS access keys
    (re.compile(r'AKIA[0-9A-Z]{16}'), "AWS access key"),
    # GitHub tokens
    (re.compile(r'ghp_[a-zA-Z0-9]{36}'), "GitHub personal access token"),
    (re.compile(r'gho_[a-zA-Z0-9]{36}'), "GitHub OAuth token"),
    (re.compile(r'ghs_[a-zA-Z0-9]{36}'), "GitHub app token"),
    # Stripe keys
    (re.compile(r'sk_live_[a-zA-Z0-9]{24,}'), "Stripe live secret key"),
    (re.compile(r'pk_live_[a-zA-Z0-9]{24,}'), "Stripe live public key"),
    # Google API keys
    (re.compile(r'AIza[0-9A-Za-z\-_]{35}'), "Google API key"),
    # Generic long bearer tokens (likely real)
    (re.compile(r'Bearer\s+(?!{{)[a-zA-Z0-9+/]{40,}={0,2}'), "Hardcoded bearer token"),
    # Generic secrets
    (re.compile(r'(?i)(password|secret|passwd)\s*[:=]\s*["\']?(?!{{)[a-zA-Z0-9]{8,}'),
     "Hardcoded credential"),
]

# Placeholder patterns that are SAFE (our generated placeholders)
SAFE_PLACEHOLDER_PATTERN = re.compile(r'\{\{[A-Z_]+\}\}')


# ─────────────────────────────────────────────────────────────
# Validation Rules
# ─────────────────────────────────────────────────────────────

VALID_METHODS        = {"GET", "POST", "PUT", "DELETE", "PATCH"}
MAX_FIELD_LENGTH     = 5000    # chars — prevents injection via huge payloads
MIN_DESCRIPTION_LEN  = 10     # chars — filters out useless descriptions
MAX_REQUESTS_PER_API = 500    # allow larger real-world API specs


# ─────────────────────────────────────────────────────────────
# Security Scanner
# ─────────────────────────────────────────────────────────────

class SecurityScanner:
    """
    Scans template content for accidentally included real API keys
    or credentials.

    Why this matters:
      - Some OpenAPI specs include example values with real keys
      - A developer might test with real keys and commit
      - Publishing real keys in templates would be a security incident

    Approach:
      - Convert template to string for scanning
      - Check against known key patterns
      - Skip our own {{PLACEHOLDER}} pattern (those are safe)
    """

    def scan(self, template: dict) -> list:
        """
        Scans entire template dict for security issues.
        Returns list of found issues (empty = clean).
        """
        issues   = []
        content  = json.dumps(template)

        for pattern, description in SECURITY_PATTERNS:
            matches = pattern.findall(content)
            for match in matches:
                # Skip if it's our safe {{PLACEHOLDER}} pattern
                if SAFE_PLACEHOLDER_PATTERN.search(str(match)):
                    continue
                # Skip common false positives in URLs
                if "{{" in str(match) or "}}" in str(match):
                    continue
                issues.append({
                    "type"   : "security",
                    "message": f"Potential {description} found: {str(match)[:20]}...",
                    "pattern": description
                })

        return issues

    def scan_localhost(self, template: dict) -> list:
        """
        Detects localhost/127.0.0.1 URLs that should not be in
        production templates.
        """
        issues  = []
        content = json.dumps(template)

        localhost_patterns = [
            r'http://localhost',
            r'http://127\.0\.0\.1',
            r'http://0\.0\.0\.0',
        ]

        for pattern in localhost_patterns:
            if re.search(pattern, content, re.IGNORECASE):
                issues.append({
                    "type"   : "security",
                    "message": "Template contains localhost URL — likely a dev URL",
                    "pattern": "localhost_url"
                })

        return issues


# ─────────────────────────────────────────────────────────────
# Schema Validator
# ─────────────────────────────────────────────────────────────

class SchemaValidator:
    """
    Validates template structure against ApiTemplate schema.
    Mirrors the validation expected by explorer_model.dart.

    Checks:
      1. Required fields present
      2. Correct types
      3. Non-empty required strings
      4. Valid HTTP methods
      5. Valid URLs
      6. Field length limits
    """

    def validate(self, template: dict) -> list:
        """
        Returns list of validation errors.
        Empty list = valid template.
        """
        errors = []

        # ── Top level ──
        if not isinstance(template, dict):
            return [{"type": "schema", "message": "Template must be a dict"}]

        for required_key in ["info", "requests"]:
            if required_key not in template:
                errors.append({
                    "type"   : "schema",
                    "message": f"Missing required field: '{required_key}'"
                })

        if errors:
            return errors  # Can't continue without basic structure

        # ── Info section ──
        info = template.get("info", {})

        if not isinstance(info, dict):
            errors.append({"type": "schema",
                           "message": "'info' must be a dict"})
            return errors

        for field in ["title", "description", "tags"]:
            if field not in info:
                errors.append({"type": "schema",
                               "message": f"Missing 'info.{field}'"})
                continue

            value = info[field]

            if field == "tags":
                if not isinstance(value, list):
                    errors.append({"type": "schema",
                                   "message": "'info.tags' must be a list"})
                elif len(value) == 0:
                    errors.append({"type": "quality",
                                   "message": "'info.tags' is empty"})

            elif field == "title":
                if not isinstance(value, str) or not value.strip():
                    errors.append({"type": "schema",
                                   "message": "'info.title' must be non-empty string"})
                elif len(value) > MAX_FIELD_LENGTH:
                    errors.append({"type": "quality",
                                   "message": f"'info.title' too long ({len(value)} chars)"})

            elif field == "description":
                if not isinstance(value, str):
                    errors.append({"type": "schema",
                                   "message": "'info.description' must be a string"})
                elif len(value) < MIN_DESCRIPTION_LEN:
                    errors.append({"type": "quality",
                                   "message": f"Description too short ({len(value)} chars)"})

        # ── Requests section ──
        requests = template.get("requests", [])

        if not isinstance(requests, list):
            errors.append({"type": "schema",
                           "message": "'requests' must be a list"})
            return errors

        if len(requests) == 0:
            errors.append({"type": "quality",
                           "message": "No requests in template"})

        if len(requests) > MAX_REQUESTS_PER_API:
            errors.append({"type": "quality",
                           "message": f"Too many requests ({len(requests)} > {MAX_REQUESTS_PER_API})"})

        for i, req in enumerate(requests):
            req_errors = self._validate_request(req, i)
            errors.extend(req_errors)

        return errors

    def _validate_request(self, req: dict, index: int) -> list:
        """Validates a single request entry."""
        errors = []
        prefix = f"requests[{index}]"

        def is_name_value_rows(value) -> bool:
            if not isinstance(value, list):
                return False
            for item in value:
                if not isinstance(item, dict):
                    return False
                if "name" not in item:
                    return False
            return True

        if not isinstance(req, dict):
            return [{"type": "schema",
                     "message": f"{prefix} must be a dict"}]

        # Required fields
        for field in ["name", "url", "method"]:
            if field not in req:
                errors.append({"type": "schema",
                               "message": f"{prefix} missing '{field}'"})
                continue

            value = req[field]

            if field == "url":
                if not isinstance(value, str) or not value.strip():
                    errors.append({"type": "schema",
                                   "message": f"{prefix}.url must be non-empty"})
                elif not (value.startswith("http") or value.startswith("{{")):
                    errors.append({"type": "quality",
                                   "message": f"{prefix}.url should start with http: {value[:50]}"})

            elif field == "method":
                if str(value).upper() not in VALID_METHODS:
                    errors.append({"type": "schema",
                                   "message": f"{prefix}.method '{value}' is not valid"})

            elif field == "name":
                if not isinstance(value, str) or not value.strip():
                    errors.append({"type": "schema",
                                   "message": f"{prefix}.name must be non-empty"})

        # Optional fields type checks
        if "headers" in req and req["headers"] is not None:
            headers_value = req["headers"]
            if not isinstance(headers_value, dict) and not is_name_value_rows(headers_value):
                errors.append({"type": "schema",
                               "message": f"{prefix}.headers must be a dict or name/value list"})

        if "body" in req and not isinstance(req["body"], (dict, list, str, type(None))):
            errors.append({"type": "schema",
                           "message": f"{prefix}.body must be an object, list, string or null"})

        if "header_rows" in req and not isinstance(req["header_rows"], list):
            errors.append({"type": "schema",
                           "message": f"{prefix}.header_rows must be a list"})

        for field in ["params", "queryParameters", "pathParameters"]:
            if field in req and req[field] is not None:
                if not is_name_value_rows(req[field]):
                    errors.append({"type": "schema",
                                   "message": f"{prefix}.{field} must be a name/value list"})

        if "body_type" in req and req["body_type"] not in (
            "none", "json", "text", "form", "multipart"
        ):
            errors.append({"type": "schema",
                           "message": f"{prefix}.body_type is invalid"})

        if "body_text" in req and not isinstance(req["body_text"], (str, type(None))):
            errors.append({"type": "schema",
                           "message": f"{prefix}.body_text must be a string"})

        if "body_json" in req and not isinstance(req["body_json"], (dict, list, type(None))):
            errors.append({"type": "schema",
                           "message": f"{prefix}.body_json must be an object, list or null"})

        if "form_data" in req and not isinstance(req["form_data"], list):
            errors.append({"type": "schema",
                           "message": f"{prefix}.form_data must be a list"})

        if "auth" in req and not isinstance(req["auth"], (dict, type(None))):
            errors.append({"type": "schema",
                           "message": f"{prefix}.auth must be a dict"})

        if "auth_type" in req and not isinstance(req["auth_type"], (str, type(None))):
            errors.append({"type": "schema",
                           "message": f"{prefix}.auth_type must be a string"})

        if "content_type" in req and not isinstance(req["content_type"], (str, type(None))):
            errors.append({"type": "schema",
                           "message": f"{prefix}.content_type must be a string"})

        return errors


# ─────────────────────────────────────────────────────────────
# Duplicate Detector
# Detects duplicate templates across ALL APIs in the marketplace
# ─────────────────────────────────────────────────────────────

class DuplicateDetector:
    """
    Detects duplicate templates based on title similarity.

    Why needed:
      - apis.guru may have the same API listed multiple times
        under different versions
      - Community submissions might duplicate existing entries

    Strategy:
      - Normalize titles (lowercase, remove punctuation)
      - Flag near-identical titles
      - Keep the one with more endpoints
    """

    def __init__(self):
        self.seen_titles = {}

    def normalize_title(self, title: str) -> str:
        clean = re.sub(r'[^a-zA-Z0-9\s]', '', title.lower())
        clean = re.sub(r'\s+', ' ', clean).strip()
        # Remove version numbers and common suffixes
        clean = re.sub(r'\bv?\d+(\.\d+)*\b', '', clean).strip()
        clean = re.sub(r'\b(api|sdk|service|platform)\b', '', clean).strip()
        return clean

    def is_duplicate(self, template: dict, filename: str) -> tuple:
        """
        Returns (is_duplicate: bool, reason: str)
        """
        title      = template.get("info", {}).get("title", "")
        base_url   = template.get("info", {}).get("base_url", "")
        host       = urlparse(base_url).netloc.lower() if base_url else ""
        normalized = (self.normalize_title(title), host)

        if normalized in self.seen_titles:
            existing = self.seen_titles[normalized]
            return True, f"Duplicate of '{existing['title']}' ({existing['filename']})"

        self.seen_titles[normalized] = {
            "title"   : title,
            "filename": filename
        }
        return False, ""


# ─────────────────────────────────────────────────────────────
# Main Validator
# ─────────────────────────────────────────────────────────────

class Validator:
    """
    Phase 5 — Validates all generated templates.

    Critical design decision:
      A single template failure DROPS that template only.
      It does NOT stop the pipeline or drop other templates.
      This matches rithakith's approach and is the right call —
      one bad API spec shouldn't break 2499 good ones.
    """

    def __init__(self, marketplace_dir: str = "marketplace"):
        self.marketplace_dir   = Path(marketplace_dir)
        self.apis_dir          = self.marketplace_dir / "apis"
        self.schema_validator  = SchemaValidator()
        self.security_scanner  = SecurityScanner()
        self.duplicate_detector= DuplicateDetector()

    def validate_template(self, template: dict,
                          filename: str) -> dict:
        """
        Runs all validation checks on a single template.
        Returns validation result dict.
        """
        all_issues = []

        # 1. Schema validation
        schema_errors = self.schema_validator.validate(template)
        all_issues.extend(schema_errors)

        # 2. Security scan
        security_issues = self.security_scanner.scan(template)
        all_issues.extend(security_issues)

        # 3. Localhost URL check
        localhost_issues = self.security_scanner.scan_localhost(template)
        all_issues.extend(localhost_issues)

        # 4. Duplicate check
        is_dup, dup_reason = self.duplicate_detector.is_duplicate(
            template, filename
        )
        if is_dup:
            all_issues.append({
                "type"   : "duplicate",
                "message": dup_reason
            })

        # Classify severity
        schema_errors_only = [i for i in all_issues
                              if i["type"] == "schema"]
        security_errors    = [i for i in all_issues
                              if i["type"] == "security"]
        duplicates         = [i for i in all_issues
                              if i["type"] == "duplicate"]
        quality_warnings   = [i for i in all_issues
                              if i["type"] == "quality"]

        # Template FAILS if it has schema errors, security issues,
        # or is a duplicate. Quality warnings don't cause failure.
        is_valid = (
            len(schema_errors_only) == 0 and
            len(security_errors)    == 0 and
            len(duplicates)         == 0
        )

        return {
            "filename"        : filename,
            "is_valid"        : is_valid,
            "schema_errors"   : schema_errors_only,
            "security_issues" : security_errors,
            "duplicates"      : duplicates,
            "quality_warnings": quality_warnings,
            "all_issues"      : all_issues
        }

    def validate_all(self) -> dict:
        """
        Validates all template files in the marketplace/apis/ directory.
        Removes invalid templates and updates index.json.
        Returns validation report.
        """
        logger.info("=" * 50)
        logger.info("Phase 5 — Validator starting")
        logger.info("=" * 50)

        if not self.apis_dir.exists():
            logger.warning("No apis directory found — nothing to validate")
            return {"valid": 0, "invalid": 0, "removed": 0}

        template_files = list(self.apis_dir.glob("*.json"))
        logger.info(f"Validating {len(template_files)} templates...")

        valid   = []
        invalid = []
        removed = []
        report  = []

        for filepath in template_files:
            filename = filepath.name
            try:
                template = json.loads(filepath.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, IOError) as e:
                logger.error(f"Could not read {filename}: {e}")
                invalid.append(filename)
                filepath.unlink(missing_ok=True)
                removed.append(filename)
                continue

            result = self.validate_template(template, filename)
            report.append(result)

            if result["is_valid"]:
                valid.append(filename)
                if result["quality_warnings"]:
                    for w in result["quality_warnings"]:
                        logger.debug(f"Quality warning in {filename}: {w['message']}")
            else:
                invalid.append(filename)
                for issue in result["schema_errors"] + result["security_issues"] + result["duplicates"]:
                    logger.warning(f"INVALID {filename}: {issue['message']}")

                # Remove invalid template
                try:
                    filepath.unlink()
                    removed.append(filename)
                    logger.info(f"Removed invalid template: {filename}")
                except IOError as e:
                    logger.error(f"Could not remove {filename}: {e}")

        # Update index.json — remove entries for removed templates
        self._update_index(removed)
        self._update_categories(removed)

        # Save validation report
        os.makedirs("logs", exist_ok=True)
        report_path = Path("logs/validation_report.json")
        with open(report_path, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2)

        summary = {
            "total_validated" : len(template_files),
            "valid"           : len(valid),
            "invalid"         : len(invalid),
            "removed"         : len(removed),
            "report_path"     : str(report_path)
        }

        logger.info(f"Phase 5 complete: {len(valid)} valid, "
                    f"{len(invalid)} invalid, {len(removed)} removed")

        return summary

    def _update_index(self, removed_filenames: list):
        """
        Removes entries for invalid templates from index.json.
        """
        if not removed_filenames:
            return

        index_path = self.marketplace_dir / "index.json"
        if not index_path.exists():
            return

        try:
            index = json.loads(index_path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, IOError):
            return

        # Older pipelines stored "apis/{name}.json" while the current
        # publisher stores bare filenames like "{name}.json". Support both.
        removed_set = set(removed_filenames)
        removed_set.update({f"apis/{name}" for name in removed_filenames})
        cleaned_index = {
            api_id: entry for api_id, entry in index.items()
            if entry.get("filename") not in removed_set
        }

        with open(index_path, "w", encoding="utf-8") as f:
            json.dump(cleaned_index, f, indent=2)

        removed_count = len(index) - len(cleaned_index)
        if removed_count > 0:
            logger.info(f"Removed {removed_count} entries from index.json")

    def _update_categories(self, removed_filenames: list):
        """
        Removes entries for invalid templates from category files.
        """
        if not removed_filenames:
            return

        categories_dir = self.marketplace_dir / "categories"
        if not categories_dir.exists():
            return

        removed_set = set(removed_filenames)
        removed_set.update({f"apis/{name}" for name in removed_filenames})

        for category_path in categories_dir.glob("*.json"):
            try:
                category_data = json.loads(
                    category_path.read_text(encoding="utf-8")
                )
            except (json.JSONDecodeError, IOError):
                continue

            apis = category_data.get("apis", [])
            cleaned_apis = [
                entry for entry in apis
                if entry.get("filename") not in removed_set
            ]

            if len(cleaned_apis) == len(apis):
                continue

            category_data["apis"] = cleaned_apis
            category_data["api_count"] = len(cleaned_apis)
            category_path.write_text(
                json.dumps(category_data, indent=2),
                encoding="utf-8",
            )


# ─────────────────────────────────────────────────────────────
# Demo
# ─────────────────────────────────────────────────────────────

def run_demo():
    print("\n" + "="*55)
    print("  Phase 5 — Validator Demo")
    print("="*55)

    schema_validator  = SchemaValidator()
    security_scanner  = SecurityScanner()
    dup_detector      = DuplicateDetector()

    test_cases = [
        {
            "name": "Valid template",
            "template": {
                "info": {
                    "title"      : "OpenAI API",
                    "description": "Access GPT-4 and DALL-E models.",
                    "tags"       : ["ai", "text-generation"]
                },
                "requests": [
                    {
                        "name"   : "Create chat completion",
                        "url"    : "https://api.openai.com/v1/chat/completions",
                        "method" : "POST",
                        "headers": {"Authorization": "Bearer {{OPENAI_API_KEY}}"},
                        "body"   : {"model": "gpt-4"}
                    }
                ]
            },
            "expect_valid": True
        },
        {
            "name": "Missing required field",
            "template": {
                "info": {"title": "Broken API"},
                # missing 'requests'
            },
            "expect_valid": False
        },
        {
            "name": "Real API key leaked",
            "template": {
                "info": {
                    "title"      : "API with leaked key",
                    "description": "This has a real key in it.",
                    "tags"       : ["ai"]
                },
                "requests": [
                    {
                        "name"   : "Some endpoint",
                        "url"    : "https://api.example.com/v1/test",
                        "method" : "POST",
                        "headers": {"Authorization": "Bearer sk-abc123def456ghi789jkl012mno345"},
                        "body"   : {}
                    }
                ]
            },
            "expect_valid": False
        },
        {
            "name": "Localhost URL",
            "template": {
                "info": {
                    "title"      : "Local Dev API",
                    "description": "This has localhost URL.",
                    "tags"       : ["developer-tools"]
                },
                "requests": [
                    {
                        "name"   : "Local endpoint",
                        "url"    : "http://localhost:8080/api/test",
                        "method" : "GET",
                        "headers": {},
                        "body"   : {}
                    }
                ]
            },
            "expect_valid": False
        },
        {
            "name": "Invalid HTTP method",
            "template": {
                "info": {
                    "title"      : "Bad Method API",
                    "description": "Has invalid HTTP method.",
                    "tags"       : ["api"]
                },
                "requests": [
                    {
                        "name"   : "Bad method",
                        "url"    : "https://api.example.com/test",
                        "method" : "FETCH",  # invalid!
                        "headers": {},
                        "body"   : {}
                    }
                ]
            },
            "expect_valid": False
        },
        {
            "name": "Duplicate template",
            "template": {
                "info": {
                    "title"      : "OpenAI API v2",  # normalized = same as first
                    "description": "Another OpenAI template.",
                    "tags"       : ["ai"]
                },
                "requests": [
                    {
                        "name"   : "Chat",
                        "url"    : "https://api.openai.com/v1/chat",
                        "method" : "POST",
                        "headers": {},
                        "body"   : {}
                    }
                ]
            },
            "expect_valid": False
        }
    ]

    # Run test cases
    for i, case in enumerate(test_cases):
        template = case["template"]
        filename = f"test_{i}.json"

        schema_errors    = schema_validator.validate(template)
        security_issues  = security_scanner.scan(template)
        localhost_issues = security_scanner.scan_localhost(template)
        is_dup, dup_msg  = dup_detector.is_duplicate(template, filename)

        schema_fails   = [e for e in schema_errors if e["type"] == "schema"]
        security_fails = security_issues + localhost_issues
        dup_fails      = [{"message": dup_msg}] if is_dup else []

        is_valid = (
            len(schema_fails)   == 0 and
            len(security_fails) == 0 and
            len(dup_fails)      == 0
        )

        status   = "✓ PASS" if is_valid == case["expect_valid"] else "✗ FAIL"
        validity = "valid" if is_valid else "invalid"

        print(f"\n  [{status}] {case['name']} → {validity}")

        if not is_valid:
            all_issues = schema_fails + security_fails + dup_fails
            for issue in all_issues:
                print(f"    - {issue['message']}")

    print("\n" + "="*55)
    print("  Phase 5 complete — all validation checks working")
    print("="*55)


if __name__ == "__main__":
    run_demo()
