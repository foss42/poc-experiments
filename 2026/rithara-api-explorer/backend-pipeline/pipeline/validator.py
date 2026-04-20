import os
import json
import re
import logging
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import jsonschema

# Import models from previous phases
from pipeline.enricher import EnrichedAPI
from pipeline.template_generator import GeneratedAPITemplates, EndpointTemplate

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

# --- Models ---

class ValidationResult(BaseModel):
    api_id: str
    passed: bool
    valid_templates: List[EndpointTemplate]
    rejected_templates: List[str]  # list of rejected template IDs
    warnings: List[str]

# --- Validator Logic ---

class APIValidator:
    """Validates generated API templates for schema compliance, secrets, and placeholders."""

    SECRET_PATTERNS = {
        "AWS Key": r"AKIA[A-Z0-9]{16}",
        "GitHub Token": r"gh[pous]_[a-zA-Z0-9]{36,40}",
        "Stripe Key": r"[ps]k_(?:live|test)_[a-zA-Z0-9]{20,}",  # Caught both live and test keys
        "Slack Token": r"xox[bpa]-[a-zA-Z0-9-]+",
        "JWT Token": r"ey[a-zA-Z0-9_-]+\.ey[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+",
        "Generic Secret": r"\b[a-zA-Z0-9]{32,}\b"
    }

    def __init__(self, schema_path: str):
        self.schema_path = schema_path
        self.schema = self._load_schema()

    def _load_schema(self) -> Dict[str, Any]:
        """Loads the JSON schema from config."""
        try:
            with open(self.schema_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError) as e:
            logger.error("Failed to load validation schema from %s: %s", self.schema_path, e)
            return {}
        except Exception as e:
            logger.error("Unexpected error loading schema: %s", e)
            return {}

    def _contains_secret(self, text: str) -> Optional[str]:
        """Checks if a string contains anything that looks like a secret."""
        if not text or not isinstance(text, str):
            return None

        for name, pattern in self.SECRET_PATTERNS.items():
            matches = re.finditer(pattern, text)
            for match in matches:
                # Special check for generic secrets: ensure it's not a placeholder
                if name == "Generic Secret":
                    # Check if it's wrapped in {{ }}
                    start, end = match.span()
                    if start >= 2 and text[start-2:start] == "{{" and text[end:end+2] == "}}":
                        continue
                return f"{name} detected"
        return None

    def _scan_obj_for_secrets(self, obj: Any) -> Optional[str]:
        """Recursively scans an object (dict/list/str) for secrets."""
        if isinstance(obj, str):
            return self._contains_secret(obj)
        elif isinstance(obj, dict):
            for v in obj.values():
                res = self._scan_obj_for_secrets(v)
                if res: return res
        elif isinstance(obj, list):
            for item in obj:
                res = self._scan_obj_for_secrets(item)
                if res: return res
        return None

    def _validate_placeholders(self, template: EndpointTemplate, warnings: List[str]) -> List[str]:
        """
        Ensures all {{PLACEHOLDERS}} in the template are present in auth_placeholders.
        Returns the updated auth_placeholders list.
        """
        # Collect all used placeholders
        used = set()
        
        # Helper to extract from string
        def extract(text):
            if isinstance(text, str):
                for match in re.findall(r"\{\{([^}]+)\}\}", text):
                    used.add(f"{{{{{match}}}}}")

        # Check URL, Headers, Query Params, Body
        extract(template.url)
        for _, v in template.headers.items(): extract(v)
        for _, v in template.query_params.items(): extract(v)
        
        # For body, we need to handle it based on type
        if isinstance(template.body, str):
            extract(template.body)
        elif isinstance(template.body, (dict, list)):
            extract(json.dumps(template.body))

        current_auth_placeholders = set(template.auth_placeholders)
        updated = list(current_auth_placeholders)
        
        for u in used:
            if u not in current_auth_placeholders:
                warnings.append(f"Auto-adding missing placeholder {u} to template {template.id}")
                updated.append(u)
        
        return updated

    def validate(self, generated: GeneratedAPITemplates, enriched_api: EnrichedAPI) -> ValidationResult:
        """
        Validates the generated templates.
        """
        valid_templates = []
        rejected_templates = []
        warnings = []

        if enriched_api.auth_type != "none" and not enriched_api.auth_placeholders:
            warnings.append(f"API {generated.api_id} has auth_type '{enriched_api.auth_type}' but auth_placeholders is empty.")

        for template in generated.templates:
            try:
                # 1. Schema Validation
                # We use model_dump to get raw dict for jsonschema
                jsonschema.validate(instance=template.model_dump(), schema=self.schema)

                # 2. Secret Scanning
                # Build a search string or scan nested objects
                secret_found = self._scan_obj_for_secrets(template.model_dump())
                if secret_found:
                    logger.warning("Rejecting template %s in API %s: %s", template.id, generated.api_id, secret_found)
                    rejected_templates.append(template.id)
                    continue

                # 3. Placeholder Validation & Auto-fix
                template.auth_placeholders = self._validate_placeholders(template, warnings)

                valid_templates.append(template)

            except jsonschema.ValidationError as e:
                logger.warning("Template %s failed schema validation: %s", template.id, e.message)
                rejected_templates.append(template.id)
            except Exception as e:
                logger.error("Error validating template %s: %s", template.id, e)
                rejected_templates.append(template.id)

        return ValidationResult(
            api_id=generated.api_id,
            passed=len(valid_templates) > 0,
            valid_templates=valid_templates,
            rejected_templates=rejected_templates,
            warnings=warnings
        )

# --- Entry Point ---

def validate(generated: GeneratedAPITemplates, enriched: EnrichedAPI) -> ValidationResult:
    """
    Validates a GeneratedAPITemplates object.
    
    Args:
        generated: The generated templates from Phase 4.
        enriched: The enriched API metadata from Phase 3.
        
    Returns:
        A ValidationResult object.
    """
    # Use absolute path to find schema.json
    base_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    schema_path = os.path.join(base_path, "config", "schema.json")
    
    validator = APIValidator(schema_path)
    return validator.validate(generated, enriched)
