import json
import os
from fetch_local_sources import process_local_sources
from fetch_github_issues import process_github_issues

def main():
    os.makedirs("output", exist_ok=True)
    print("--- Starting 6-Hour Parse Pipeline (Merge/Upsert Mode) ---")
    
    # 1. Process Local Sources First
    local_templates, local_reports = process_local_sources()

    # 2. Process GitHub Issues Second
    github_templates, github_reports = process_github_issues()

    new_templates = local_templates + github_templates
    all_reports = local_reports + github_reports

    templates_file = "output/templates.json"
    merged_templates_dict = {}

    # 3. Load historical templates to preserve past successful runs
    if os.path.exists(templates_file):
        try:
            with open(templates_file, "r") as f:
                existing_templates = json.load(f)
                for t in existing_templates:
                    url = t.get("_original_url")
                    if url:
                        # Store old data safely in the dictionary
                        merged_templates_dict[url] = t
            print(f"[*] Loaded {len(merged_templates_dict)} existing APIs from cache.")
        except Exception as e:
            print(f"[!] Could not read existing templates (starting fresh): {e}")

    # 4. Merge new validations (Additions or Updates)
    for t in new_templates:
        url = t.get("_original_url")
        if url:
            # This overwrites the old JSON with the newly formatted one.
            # If an API failed to fetch in this run, it won't be in `new_templates`,
            # thereby keeping the historical data perfectly safe in the dictionary!
            if url in merged_templates_dict:
                old_data = merged_templates_dict[url]

                # Preserve dynamic fields
                t["community_score"] = old_data.get("community_score", {})

                # You can preserve more fields here if needed

                merged_templates_dict[url] = t
            else:
                merged_templates_dict[url] = t

    # Convert the dictionary map back into a flat JSON list
    final_templates_list = list(merged_templates_dict.values())

    # 5. Save everything back to disk
    with open(templates_file, "w") as f:
        json.dump(final_templates_list, f, indent=2)
        
    # We still overwrite reports so you can see the latest status of broken endpoints
    with open("output/pipeline_report.json", "w") as f:
        json.dump(all_reports, f, indent=2)

    print("\n✅ Heavy Pipeline Complete!")
    print(f"[*] Successes this run: {len(new_templates)}")
    print(f"[*] Total APIs now in database: {len(final_templates_list)}")

if __name__ == "__main__":
    main()