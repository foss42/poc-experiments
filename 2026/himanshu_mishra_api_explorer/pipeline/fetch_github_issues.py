import requests
import re
from openapi_parser_logic import parse_single_api

GITHUB_REPO_OWNER = "himanshumishra1309"
GITHUB_REPO_NAME = "apidash-apiexplorer-poc"

def process_github_issues():
    print("\n--- Running GitHub Issues Fetcher ---")
    url = f"https://api.github.com/repos/{GITHUB_REPO_OWNER}/{GITHUB_REPO_NAME}/issues"
    headers = {"Accept": "application/vnd.github.squirrel-girl-preview+json"}
    params = {"labels": "community-api", "state": "all"}
    
    print(f"[*] Hitting GitHub API: {url}")
    try:
        response = requests.get(url, headers=headers, params=params, timeout=10)
        issues = response.json() if response.status_code == 200 else []
    except Exception as e:
        print(f"[*] Connection failed: {e}")
        issues = []

    if isinstance(issues, dict) or len(issues) == 0:
        print("[!] No issues found or Rate Limited. Returning empty.")
        return [], []
    else:
        print(f"[*] SUCCESSFULLY found {len(issues)} issues on GitHub!")

    valid_templates = []
    pipeline_reports = []

    for issue in issues:
        body = issue.get("body", "")
        if not body: continue
        
        name_match = re.search(r"### API Name[\r\n]+([^\r\n]+)", body)
        url_match = re.search(r"### Raw OpenAPI URL[\r\n]+([^\r\n]+)", body)
        
        if name_match and url_match:
            api_name = name_match.group(1).strip()
            api_url = url_match.group(1).strip()
            
            reactions = issue.get("reactions", {})
            score = {
                "upvotes": reactions.get("+1", 0) + reactions.get("heart", 0),
                "comments": issue.get("comments", 0)
            }
            
            source_dict = {"name": api_name, "url": api_url}
            result = parse_single_api(source_dict, score)
            
            if result["status"] == "success":
                valid_templates.append(result["data"])
            else:
                pipeline_reports.append(result["data"])
        else:
            issue_title = issue.get("title", "Unknown")
            print(f"[!] Skipped issue '{issue_title}': Markdown format didn't match exactly.")

    return valid_templates, pipeline_reports