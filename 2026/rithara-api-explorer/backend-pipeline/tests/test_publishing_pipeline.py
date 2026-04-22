import json
import os
import sys

# Add the project root to sys.path to allow imports from the 'pipeline' package
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pipeline.validator import validate
from pipeline.publisher import publish
from pipeline.template_generator import GeneratedAPITemplates, EndpointTemplate
from pipeline.enricher import EnrichedAPI

def test_secret_scanning():
    print("\n--- Testing Secret Scanning ---")
    mock_ep = EndpointTemplate(
        id="test-secret",
        name="Test Secret",
        description="Leaked key here: sk_test_MOCK_SECRET_KEY_1234567890",
        method="GET",
        url="https://api.example.com",
        headers={"Authorization": "Bearer sk_test_MOCK_SECRET_KEY_1234567890"},
        query_params={},
        body=None,
        sample_response={},
        auth_placeholders=[],
        notes="Don't leak me"
    )
    
    mock_generated = GeneratedAPITemplates(
        api_id="test-api",
        endpoint_count=1,
        templates=[mock_ep]
    )
    
    mock_enriched = EnrichedAPI(
        api_id="test-api",
        name="Test API",
        provider="Test",
        categories=["Other"],
        auth_type="none",
        auth_placeholders=[],
        verified=False,
        source="manual",
        endpoints=[], # Not used in validator
        security_schemes={},
        enrich_warnings=[]
    )
    
    result = validate(mock_generated, mock_enriched)
    print(f"Passed: {result.passed}")
    print(f"Rejected IDs: {result.rejected_templates}")
    
    if "test-secret" in result.rejected_templates:
        print("SUCCESS: Secret was detected and template rejected.")
    else:
        print("FAILURE: Secret was NOT detected!")
        assert "test-secret" in result.rejected_templates

def test_placeholder_autofix():
    print("\n--- Testing Placeholder Auto-fix ---")
    mock_ep = EndpointTemplate(
        id="test-placeholder",
        name="Test Placeholder",
        description=None,
        method="GET",
        url="https://api.example.com/{{USER_ID}}",
        headers={},
        query_params={},
        body=None,
        sample_response={},
        auth_placeholders=[], # MISSING {{USER_ID}}
        notes="..."
    )
    
    mock_generated = GeneratedAPITemplates(
        api_id="test-api",
        endpoint_count=1,
        templates=[mock_ep]
    )
    
    mock_enriched = EnrichedAPI(
       api_id="test-api", name="Test", provider="Test", categories=["Other"],
       auth_type="none", auth_placeholders=[], verified=False, source="manual",
       endpoints=[], security_schemes={}, enrich_warnings=[]
    )
    
    result = validate(mock_generated, mock_enriched)
    updated_placeholders = result.valid_templates[0].auth_placeholders
    print(f"Updated placeholders: {updated_placeholders}")
    if "{{USER_ID}}" in updated_placeholders:
        print("SUCCESS: {{USER_ID}} was auto-added to auth_placeholders.")

def test_index_merge():
    print("\n--- Testing Index Merge ---")
    # This test will look at marketplace/index.json which should now have 2 entries
    index_path = "marketplace/index.json"
    if os.path.exists(index_path):
        with open(index_path, "r") as f:
            data = json.load(f)
            ids = [a["id"] for a in data["apis"]]
            print(f"Current APIs in index: {ids}")
            if "httpbin.org" in ids and "adyen.com_CheckoutService" in ids:
                print("SUCCESS: index.json contains both APIs without wiping.")
            else:
                print("FAILURE: index.json does not contain expected IDs.")

if __name__ == "__main__":
    test_secret_scanning()
    test_placeholder_autofix()
    test_index_merge()
