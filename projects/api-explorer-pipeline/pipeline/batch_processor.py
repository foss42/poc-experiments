#!/usr/bin/env python3
"""
API Explorer Pipeline - Batch Processor
Processes multiple OpenAPI files in batch and generates templates automatically.

Features:
- Scans folders for JSON/YAML OpenAPI files
- Processes files individually with error isolation
- Reuses existing parser and template generator logic
- Provides detailed logging and summary reports
- Supports recursive scanning and registry clearing
- Automatically generates templates after parsing
"""

import os
import sys
import argparse
import glob
from datetime import datetime

# Import existing modules
try:
    from parser import load_openapi_file, parse_openapi, normalize_data
    from template_generator import generate_templates
    from registry_manager import RegistryManager
except ImportError as e:
    print(f"[ERROR] Failed to import required modules: {e}")
    print("[FIX] Ensure parser.py, template_generator.py, and registry_manager.py are in the same directory")
    sys.exit(1)

# Handle Windows console encoding issues
if sys.platform == "win32":
    try:
        import codecs
        if hasattr(sys.stdout, 'detach'):
            sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())
            sys.stderr = codecs.getwriter("utf-8")(sys.stderr.detach())
    except:
        # Fallback for environments where detach() is not available
        pass


def find_openapi_files(folder_path, recursive=False):
    """
    Find all OpenAPI files in the specified folder.
    
    Args:
        folder_path (str): Path to folder to scan
        recursive (bool): Whether to scan subfolders recursively
        
    Returns:
        list: List of file paths found
    """
    try:
        if not os.path.exists(folder_path):
            print(f"[ERROR] Folder not found: {folder_path}")
            return []
        
        if not os.path.isdir(folder_path):
            print(f"[ERROR] Path is not a directory: {folder_path}")
            return []
        
        print(f"[BATCH] Scanning folder: {folder_path}")
        
        # Define file extensions to look for
        extensions = ['*.json', '*.yaml', '*.yml']
        files_found = []
        
        for extension in extensions:
            if recursive:
                # Recursive search using **/ pattern
                pattern = os.path.join(folder_path, '**', extension)
                files = glob.glob(pattern, recursive=True)
            else:
                # Non-recursive search
                pattern = os.path.join(folder_path, extension)
                files = glob.glob(pattern)
            
            files_found.extend(files)
        
        # Remove duplicates and sort
        files_found = sorted(list(set(files_found)))
        
        print(f"[BATCH] Found {len(files_found)} file(s)")
        
        if files_found:
            print("[BATCH] Files to process:")
            for i, file_path in enumerate(files_found, 1):
                rel_path = os.path.relpath(file_path, folder_path)
                print(f"   {i}. {rel_path}")
        
        return files_found
        
    except Exception as e:
        print(f"[ERROR] Failed to scan folder: {e}")
        return []


def process_single_file(file_path, registry_manager):
    """
    Process a single OpenAPI file using the new modular registry system.
    
    Args:
        file_path (str): Path to OpenAPI file
        registry_manager (RegistryManager): Registry manager instance
        
    Returns:
        tuple: (success: bool, error_message: str or None)
    """
    try:
        print(f"[BATCH] Processing file: {os.path.basename(file_path)}")
        
        # Step 1: Load OpenAPI file (reuse existing function)
        openapi_data = load_openapi_file(file_path)
        if not openapi_data:
            return False, "Failed to load OpenAPI file"
        
        # Step 2: Parse OpenAPI data (reuse existing function)
        api_data = parse_openapi(openapi_data)
        if not api_data:
            return False, "Failed to parse OpenAPI data"
        
        # Step 3: Normalize data (reuse existing function)
        normalized_data = normalize_data(api_data)
        
        # Step 4: Generate templates for endpoints
        endpoints_with_templates = []
        for endpoint in normalized_data.get('endpoints', []):
            # Generate templates using existing function
            templates = generate_templates(endpoint, normalized_data)
            endpoint['templates'] = templates
            endpoints_with_templates.append(endpoint)
        
        # Update normalized data with templates
        normalized_data['endpoints'] = endpoints_with_templates
        
        # Step 5: Save to modular registry
        api_id, operation = registry_manager.add_or_update_api(normalized_data, openapi_data)
        
        api_name = normalized_data.get('name', 'Unknown API')
        endpoint_count = len(normalized_data.get('endpoints', []))
        print(f"[SUCCESS] {operation} API: {api_name} ({endpoint_count} endpoints) -> {api_id}")
        return True, None
        
    except Exception as e:
        return False, str(e)


def clear_registry(registry_manager):
    """
    Clear the existing registry by migrating old data and starting fresh.
    
    Args:
        registry_manager (RegistryManager): Registry manager instance
        
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        print(f"[BATCH] Clearing existing registry...")
        
        # Create backup of old registry if it exists
        old_registry_file = "registry/apis.json"
        if os.path.exists(old_registry_file):
            backup_path = f"{old_registry_file}.backup.{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            import shutil
            shutil.copy2(old_registry_file, backup_path)
            print(f"[BATCH] Created backup: {backup_path}")
        
        # Clear modular registry by creating fresh files
        empty_global_index = {
            "metadata": {
                "version": "1.0.0",
                "lastUpdated": datetime.now().isoformat(),
                "totalAPIs": 0,
                "totalEndpoints": 0,
                "generatedBy": "API Explorer Pipeline v1.0"
            },
            "apis": []
        }
        
        registry_manager.save_global_index(empty_global_index)
        print(f"[BATCH] Registry cleared successfully")
        return True
        
    except Exception as e:
        print(f"[ERROR] Failed to clear registry: {e}")
        return False


def process_batch(folder_path, recursive=False, clear_first=False):
    """
    Process multiple OpenAPI files in batch using the modular registry system.
    
    Args:
        folder_path (str): Path to folder containing OpenAPI files
        recursive (bool): Whether to scan subfolders recursively
        clear_first (bool): Whether to clear registry before processing
        
    Returns:
        dict: Processing statistics
    """
    stats = {
        'total_files': 0,
        'successful': 0,
        'failed': 0,
        'errors': []
    }
    
    try:
        print("API Explorer Pipeline - Batch Processor (Modular Registry)")
        print("=" * 60)
        print(f"Folder: {folder_path}")
        print(f"Recursive: {recursive}")
        print(f"Clear first: {clear_first}")
        print("=" * 60)
        
        # Initialize registry manager
        registry_manager = RegistryManager()
        
        # Clear registry if requested
        if clear_first:
            if not clear_registry(registry_manager):
                print("[ERROR] Failed to clear registry, aborting batch processing")
                return stats
        
        # Find all OpenAPI files
        files_found = find_openapi_files(folder_path, recursive)
        stats['total_files'] = len(files_found)
        
        if not files_found:
            print("[WARN] No OpenAPI files found to process")
            return stats
        
        print(f"\n[BATCH] Starting batch processing...")
        print("-" * 40)
        
        # Process each file individually
        for i, file_path in enumerate(files_found, 1):
            rel_path = os.path.relpath(file_path, folder_path)
            print(f"\n[{i}/{len(files_found)}] Processing: {rel_path}")
            
            success, error_msg = process_single_file(file_path, registry_manager)
            
            if success:
                stats['successful'] += 1
            else:
                stats['failed'] += 1
                error_info = f"{rel_path}: {error_msg}"
                stats['errors'].append(error_info)
                print(f"[ERROR] Failed to process {rel_path} - {error_msg}")
        
        return stats
        
    except Exception as e:
        print(f"[ERROR] Batch processing failed: {e}")
        return stats


def generate_batch_templates(registry_manager):
    """
    Templates are now generated during processing, so this function just reports status.
    
    Args:
        registry_manager (RegistryManager): Registry manager instance
        
    Returns:
        tuple: (success: bool, template_count: int)
    """
    try:
        print(f"\n[BATCH] Templates generated during processing...")
        print("-" * 40)
        
        # Get statistics from registry
        stats = registry_manager.get_registry_stats()
        template_count = stats.get('totalEndpoints', 0)
        
        print(f"[SUCCESS] Templates available for {template_count} endpoints")
        return True, template_count
        
    except Exception as e:
        print(f"[ERROR] Failed to get template statistics: {e}")
        return False, 0


def print_batch_summary(stats, template_count):
    """
    Print a comprehensive summary of batch processing results.
    
    Args:
        stats (dict): Processing statistics
        template_count (int): Number of templates generated
    """
    print(f"\n[BATCH SUMMARY]")
    print("=" * 60)
    print(f"Total files processed: {stats['total_files']}")
    print(f"Successful: {stats['successful']}")
    print(f"Failed: {stats['failed']}")
    
    if stats['failed'] > 0:
        print(f"\nErrors encountered:")
        for i, error in enumerate(stats['errors'], 1):
            print(f"   {i}. {error}")
    
    # Get registry statistics
    try:
        registry_manager = RegistryManager()
        registry_stats = registry_manager.get_registry_stats()
        total_apis = registry_stats.get('totalAPIs', 0)
        print(f"\nTotal APIs in registry: {total_apis}")
        print(f"Templates generated: {template_count}")
        print(f"Registry location: modular system (registry/, apis/, api_templates/)")
    except:
        print(f"\nRegistry location: modular system (registry/, apis/, api_templates/)")
    
    print("=" * 60)
    
    if stats['successful'] > 0:
        print("[SUCCESS] Batch processing completed!")
    else:
        print("[WARN] No files were processed successfully")


def main():
    """
    Main function for batch processing with command line interface.
    """
    parser = argparse.ArgumentParser(
        description="Batch process multiple OpenAPI files and generate templates",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python batch_processor.py data/
  python batch_processor.py data/ --recursive
  python batch_processor.py data/ --clear
  python batch_processor.py /path/to/specs --recursive --clear
        """
    )
    
    parser.add_argument(
        'folder_path',
        help='Path to folder containing OpenAPI files'
    )
    
    parser.add_argument(
        '--recursive', '-r',
        action='store_true',
        help='Scan subfolders recursively'
    )
    
    parser.add_argument(
        '--clear', '-c',
        action='store_true',
        help='Clear registry before processing'
    )
    
    args = parser.parse_args()
    
    # Validate folder path
    if not os.path.exists(args.folder_path):
        print(f"[ERROR] Folder not found: {args.folder_path}")
        sys.exit(1)
    
    # Process batch
    stats = process_batch(
        folder_path=args.folder_path,
        recursive=args.recursive,
        clear_first=args.clear
    )
    
    # Generate templates (now handled during processing)
    template_count = 0
    if stats['successful'] > 0:
        registry_manager = RegistryManager()
        success, template_count = generate_batch_templates(registry_manager)
        if not success:
            print("[WARN] Template statistics unavailable, but APIs were processed")
    
    # Print summary
    print_batch_summary(stats, template_count)
    
    # Exit with appropriate code
    if stats['total_files'] == 0:
        sys.exit(2)  # No files found
    elif stats['successful'] == 0:
        sys.exit(1)  # All files failed
    else:
        sys.exit(0)  # At least some files succeeded


if __name__ == "__main__":
    main()