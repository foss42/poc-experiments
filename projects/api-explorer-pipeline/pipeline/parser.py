#!/usr/bin/env python3
"""
API Explorer Pipeline - Enhanced OpenAPI Parser
A robust Python script to parse OpenAPI JSON and YAML files with modular registry management.
"""

import json
import os
import sys
import uuid
from datetime import datetime
from pathlib import Path

# Import registry manager
sys.path.append(str(Path(__file__).parent))
from registry_manager import RegistryManager

# Import YAML support with fallback
try:
    import yaml
    YAML_SUPPORT = True
    print("[INIT] YAML support enabled")
except ImportError:
    YAML_SUPPORT = False
    print("[WARN] YAML support disabled - install PyYAML for YAML file support")

# Handle Windows console encoding issues
if sys.platform == "win32":
    try:
        import codecs
        if hasattr(sys.stdout, 'detach'):
            sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())
            sys.stderr = codecs.getwriter("utf-8")(sys.stderr.detach())
    except:
        pass


def categorize_api_simple(api_name, description, endpoints):
    """Simple keyword-based categorization for demo"""
    text = f"{api_name} {description}".lower()
    
    # Add endpoint paths
    for endpoint in endpoints:
        if 'path' in endpoint:
            text += f" {endpoint['path']}"
        if 'summary' in endpoint:
            text += f" {endpoint['summary']}"
    
    # Simple keyword matching
    if any(word in text for word in ['ai', 'gpt', 'language', 'chat', 'model']):
        return 'AI'
    elif any(word in text for word in ['weather', 'forecast', 'climate']):
        return 'Weather'  
    elif any(word in text for word in ['user', 'profile', 'social', 'friend']):
        return 'Social'
    elif any(word in text for word in ['payment', 'finance', 'bank', 'money']):
        return 'Finance'
    else:
        return 'General'


def extract_tags_simple(api_name, endpoints):
    """Extract simple tags for demo"""
    tags = set()
    
    # Add HTTP methods
    for endpoint in endpoints:
        if 'method' in endpoint:
            tags.add(endpoint['method'])
    
    # Add path segments
    for endpoint in endpoints:
        if 'path' in endpoint:
            parts = endpoint['path'].strip('/').split('/')
            for part in parts:
                if part and not part.startswith('{') and len(part) > 2:
                    tags.add(part.capitalize())
    
    return sorted(list(tags))[:5]  # Limit to 5 tags


def load_openapi_file(file_path):
    """Load and validate an OpenAPI JSON or YAML file."""
    try:
        print(f"[LOAD] Loading OpenAPI file: {file_path}")
        
        # Determine file type by extension
        file_ext = os.path.splitext(file_path)[1].lower()
        is_yaml = file_ext in ['.yaml', '.yml']
        
        if is_yaml and not YAML_SUPPORT:
            print("[ERROR] YAML file detected but PyYAML not installed")
            print("[FIX] Run: pip install PyYAML")
            return None
        
        with open(file_path, 'r', encoding='utf-8') as file:
            if is_yaml:
                print("[LOAD] Parsing YAML format...")
                openapi_data = yaml.safe_load(file)
            else:
                print("[LOAD] Parsing JSON format...")
                openapi_data = json.load(file)
        
        print(f"[LOAD] Successfully loaded OpenAPI file ({file_ext[1:].upper()})")
        
        # Basic validation
        if not isinstance(openapi_data, dict):
            print("[ERROR] OpenAPI file must contain a valid object")
            return None
            
        if 'info' not in openapi_data:
            print("[ERROR] OpenAPI file missing 'info' section")
            return None
            
        return openapi_data
        
    except FileNotFoundError:
        print(f"[ERROR] File not found - {file_path}")
        return None
    except json.JSONDecodeError as e:
        print(f"[ERROR] Invalid JSON format - {e}")
        return None
    except Exception as e:
        print(f"[ERROR] Failed to load OpenAPI file - {e}")
        return None


def extract_auth(openapi_data, endpoint_security=None):
    """Extract authentication information from OpenAPI specification."""
    try:
        print("[AUTH] Extracting authentication information...")
        
        # Default: no authentication
        auth_result = {
            'authType': 'none',
            'authDetails': {}
        }
        
        # Check if components.securitySchemes exists
        components = openapi_data.get('components', {})
        security_schemes = components.get('securitySchemes', {})
        
        if not security_schemes:
            print("[AUTH] No security schemes found")
            return auth_result
        
        # Priority-based selection: apiKey > http > oauth2 > first available
        selected_scheme = None
        selected_name = None
        
        # Priority 1: API Key
        for name, scheme in security_schemes.items():
            if scheme.get('type', '').lower() == 'apikey':
                selected_scheme = scheme
                selected_name = name
                break
        
        # Priority 2: HTTP (Bearer)
        if not selected_scheme:
            for name, scheme in security_schemes.items():
                if scheme.get('type', '').lower() == 'http':
                    selected_scheme = scheme
                    selected_name = name
                    break
        
        # Priority 3: OAuth2
        if not selected_scheme:
            for name, scheme in security_schemes.items():
                if scheme.get('type', '').lower() == 'oauth2':
                    selected_scheme = scheme
                    selected_name = name
                    break
        
        # Fallback: First available
        if not selected_scheme:
            selected_name = list(security_schemes.keys())[0]
            selected_scheme = security_schemes[selected_name]
        
        print(f"[AUTH] Selected security scheme: {selected_name} (type: {selected_scheme.get('type', 'unknown')})")
        
        # Extract authentication details based on type
        auth_type = selected_scheme.get('type', '').lower()
        
        if auth_type == 'apikey':
            # API Key authentication
            auth_result = {
                'authType': 'apiKey',
                'authDetails': {
                    'type': 'apiKey',
                    'name': selected_scheme.get('name', 'X-API-Key'),
                    'in': selected_scheme.get('in', 'header'),
                    'schemeName': selected_name
                }
            }
            
        elif auth_type == 'http':
            # HTTP authentication (Bearer, Basic, etc.)
            scheme = selected_scheme.get('scheme', 'bearer').lower()
            
            # NORMALIZE: http+bearer becomes "bearer" for consistency
            if scheme == 'bearer':
                normalized_auth_type = 'bearer'
            else:
                normalized_auth_type = 'http'
            
            auth_result = {
                'authType': normalized_auth_type,
                'authDetails': {
                    'type': 'http',
                    'scheme': scheme,
                    'schemeName': selected_name
                }
            }
            
            # Add bearer format if available
            if scheme == 'bearer' and 'bearerFormat' in selected_scheme:
                auth_result['authDetails']['bearerFormat'] = selected_scheme['bearerFormat']
            
        elif auth_type == 'oauth2':
            # OAuth2 authentication (basic extraction)
            flows = selected_scheme.get('flows', {})
            flow_types = list(flows.keys())
            
            auth_result = {
                'authType': 'oauth2',
                'authDetails': {
                    'type': 'oauth2',
                    'flows': flow_types,
                    'schemeName': selected_name
                }
            }
            
            # Extract first flow details for simplicity
            if flow_types:
                first_flow = flows[flow_types[0]]
                if 'authorizationUrl' in first_flow:
                    auth_result['authDetails']['authorizationUrl'] = first_flow['authorizationUrl']
                if 'tokenUrl' in first_flow:
                    auth_result['authDetails']['tokenUrl'] = first_flow['tokenUrl']
        
        return auth_result
        
    except Exception as e:
        print(f"[WARN] Failed to extract authentication - {e}")
        return {
            'authType': 'none',
            'authDetails': {}
        }


def parse_openapi(openapi_data):
    """Parse OpenAPI data and extract structured API information."""
    try:
        # Extract API name from info.title
        info = openapi_data.get('info', {})
        api_name = info.get('title', 'Unknown API').strip()
        
        # Extract base URL from servers[0].url (handle missing servers)
        servers = openapi_data.get('servers', [])
        base_url = ''
        if servers and isinstance(servers, list) and len(servers) > 0:
            base_url = servers[0].get('url', '').strip()
        
        # Extract endpoints from paths
        paths = openapi_data.get('paths', {})
        if not paths:
            print("[WARN] No paths found in OpenAPI file")
            return None
        
        endpoints = []
        
        print(f"[PARSE] Processing {len(paths)} path(s)...")
        
        # Extract authentication information FIRST
        auth_info = extract_auth(openapi_data)
        global_auth_type = auth_info['authType']
        
        for path, path_data in paths.items():
            if not isinstance(path_data, dict):
                continue
                
            # Handle multiple HTTP methods under one path
            for method, method_data in path_data.items():
                # Skip non-HTTP method keys
                method_upper = method.upper()
                if method_upper not in ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']:
                    continue
                
                if not isinstance(method_data, dict):
                    continue
                
                # Extract summary/description
                summary = method_data.get('summary', '').strip()
                if not summary:
                    summary = method_data.get('description', '').strip()
                
                if not isinstance(summary, str):
                    summary = ''
                
                endpoint = {
                    'path': path.strip(),
                    'method': method_upper,
                    'summary': summary,
                    'authType': global_auth_type  # Use global auth for simplicity
                }
                
                endpoints.append(endpoint)
        
        # Create structured output
        api_data = {
            'id': str(uuid.uuid4()),
            'name': api_name,
            'baseUrl': base_url,
            'authType': auth_info['authType'],
            'authDetails': auth_info['authDetails'],
            'endpoints': endpoints,
            'lastUpdated': datetime.now().isoformat()
        }
        
        # Add enrichment data
        description = info.get('description', '')
        if not description:
            description = f"{api_name} - REST API with {len(endpoints)} endpoints"
        
        api_data['description'] = description
        api_data['category'] = categorize_api_simple(api_name, description, endpoints)
        api_data['tags'] = extract_tags_simple(api_name, endpoints)
        api_data['rating'] = round(3.5 + (hash(api_name) % 15) / 10, 1)  # Demo rating
        
        print(f"[PARSE] Parsed API: {api_name}")
        print(f"[PARSE] Category: {api_data['category']}")
        print(f"[PARSE] Tags: {', '.join(api_data['tags'])}")
        print(f"[PARSE] Found {len(endpoints)} endpoint(s)")
        
        return api_data
        
    except Exception as e:
        print(f"[ERROR] Failed to parse OpenAPI data - {e}")
        return None


def normalize_data(api_data):
    """Clean and normalize API data, ensuring all required fields exist."""
    try:
        print("[NORM] Normalizing data...")
        
        # Ensure all required fields exist with proper defaults
        normalized = {
            'id': api_data.get('id', str(uuid.uuid4())),
            'name': str(api_data.get('name', 'Unknown API')).strip(),
            'baseUrl': str(api_data.get('baseUrl', '')).strip(),
            'authType': api_data.get('authType', 'none'),
            'authDetails': api_data.get('authDetails', {}),
            'endpoints': [],
            'lastUpdated': api_data.get('lastUpdated', datetime.now().isoformat()),
            # CRITICAL: Preserve enriched fields from parser
            'description': api_data.get('description', ''),
            'category': api_data.get('category', 'General'),
            'tags': api_data.get('tags', []),
            'rating': api_data.get('rating', 4.0),
            'reviews': api_data.get('reviews', []),
            'version': api_data.get('version', '1.0.0')
        }
        
        # Debug: Show what enriched data we're preserving
        print(f"[NORM] Preserving enriched data: category={normalized['category']}, tags={normalized['tags']}")
        
        # Validate authType
        valid_auth_types = ['none', 'apiKey', 'http', 'bearer', 'oauth2']
        if normalized['authType'] not in valid_auth_types:
            print(f"[NORM] Invalid authType '{normalized['authType']}', defaulting to 'none'")
            normalized['authType'] = 'none'
            normalized['authDetails'] = {}
        
        # Ensure authDetails is a dict
        if not isinstance(normalized['authDetails'], dict):
            print("[NORM] Invalid authDetails format, defaulting to empty dict")
            normalized['authDetails'] = {}
        
        # Normalize endpoints
        endpoints = api_data.get('endpoints', [])
        for endpoint in endpoints:
            if not isinstance(endpoint, dict):
                continue
                
            normalized_endpoint = {
                'path': str(endpoint.get('path', '')).strip(),
                'method': str(endpoint.get('method', 'GET')).upper(),
                'summary': str(endpoint.get('summary', '')).strip(),
                'authType': endpoint.get('authType', normalized['authType'])
            }
            
            # Validate endpoint authType
            if normalized_endpoint['authType'] not in valid_auth_types:
                print(f"[NORM] Invalid endpoint authType '{normalized_endpoint['authType']}', using global")
                normalized_endpoint['authType'] = normalized['authType']
            
            # Only add valid endpoints
            if normalized_endpoint['path'] and normalized_endpoint['method']:
                normalized['endpoints'].append(normalized_endpoint)
        
        # Sort endpoints alphabetically by path, then by method
        normalized['endpoints'].sort(key=lambda x: (x['path'], x['method']))
        
        print(f"[NORM] Normalized {len(normalized['endpoints'])} endpoint(s)")
        print(f"[NORM] Auth type: {normalized['authType']}")
        
        return normalized
        
    except Exception as e:
        print(f"[ERROR] Failed to normalize data - {e}")
        # Return safe defaults if normalization fails
        return {
            'id': str(uuid.uuid4()),
            'name': 'Unknown API',
            'baseUrl': '',
            'authType': 'none',
            'authDetails': {},
            'endpoints': [],
            'lastUpdated': datetime.now().isoformat(),
            # Include enrichment defaults even in error case
            'description': '',
            'category': 'General',
            'tags': [],
            'rating': 4.0,
            'reviews': [],
            'version': '1.0.0'
        }


def save_to_registry(api_data, registry_path=None, openapi_data=None):
    """Save API data to modular registry system."""
    try:
        print("[REGISTRY] Saving to modular registry system...")
        
        # Create registry manager
        manager = RegistryManager()
        
        # Add or update API
        api_id, operation = manager.add_or_update_api(api_data, openapi_data)
        
        print(f"[REGISTRY] {operation} API: {api_data['name']} (ID: {api_id})")
        
        # Get updated statistics
        stats = manager.get_registry_stats()
        print(f"[REGISTRY] Total APIs: {stats['totalAPIs']}, Total Endpoints: {stats['totalEndpoints']}")
        
        return True, operation
        
    except Exception as e:
        print(f"[ERROR] Failed to save to registry - {e}")
        return False, "Failed"


if __name__ == "__main__":
    print("API Explorer Pipeline - Enhanced OpenAPI Parser v2.0")
    print("=" * 60)
    
    # Check command line arguments
    if len(sys.argv) != 2:
        print("\n[ERROR] Usage: python parser.py <openapi_file>")
        sys.exit(1)
    
    input_file = sys.argv[1]
    
    # Step 1: Load OpenAPI file
    openapi_data = load_openapi_file(input_file)
    if not openapi_data:
        print("[FAIL] Pipeline failed at loading stage!")
        sys.exit(1)
    
    # Step 2: Parse OpenAPI data
    api_data = parse_openapi(openapi_data)
    if not api_data:
        print("[FAIL] Pipeline failed at parsing stage!")
        sys.exit(1)
    
    # Step 3: Normalize data
    normalized_data = normalize_data(api_data)
    
    # Step 4: Save to modular registry
    success, operation = save_to_registry(normalized_data, None, openapi_data)
    
    if success:
        print("\n[SUCCESS] Pipeline completed successfully!")
        print(f"API: {normalized_data['name']}")
        print(f"Category: {normalized_data['category']}")
        print(f"Tags: {', '.join(normalized_data['tags'])}")
        print(f"Endpoints: {len(normalized_data['endpoints'])}")
    else:
        print("\n[FAIL] Pipeline failed at saving stage!")
        sys.exit(1)