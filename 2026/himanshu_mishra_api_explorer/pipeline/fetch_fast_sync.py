import json
import os
import requests
import re

GITHUB_REPO_OWNER = "himanshumishra1309"
GITHUB_REPO_NAME = "apidash-apiexplorer-poc"
TEMPLATES_FILE = "output/templates.json"

def fetch_issue_comments(comments_url, headers):
    """Hits the GitHub API to fetch the actual comments and their reactions."""
    try:
        response = requests.get(comments_url, headers=headers, timeout=10)
        if response.status_code == 200:
            return response.json()
    except Exception as e:
        print(f"  [!] Failed to fetch comments: {e}")
    return []

def main():
    print("\n--- Running 1-Hour Fast Sync (Deep Interactions Fetcher) ---")
    if not os.path.exists(TEMPLATES_FILE):
        print("❌ templates.json missing. Run main_pipeline.py first.")
        return

    url = f"https://api.github.com/repos/{GITHUB_REPO_OWNER}/{GITHUB_REPO_NAME}/issues"
    headers = {"Accept": "application/vnd.github.squirrel-girl-preview+json"}
    params = {"labels": "community-api", "state": "all"}
    
    print(f"[*] Fetching top-level issues from GitHub...")
    try:
        response = requests.get(url, headers=headers, params=params, timeout=10)
        issues = response.json() if response.status_code == 200 else []
    except Exception as e:
        print(f"❌ Failed to reach GitHub: {e}")
        return

    if isinstance(issues, dict):
        print(f"❌ API Error / Rate Limit: {issues}")
        return

    latest_scores = {}
    for issue in issues:
        body = issue.get("body", "")
        if not body: continue
        
        url_match = re.search(r"### Raw OpenAPI URL[\r\n]+([^\r\n]+)", body)
        if url_match:
            api_url = url_match.group(1).strip()
            
            # 1. Get Top-Level Issue Likes
            issue_reactions = issue.get("reactions", {})
            issue_upvotes = issue_reactions.get("+1", 0) + issue_reactions.get("heart", 0)
            
            # 2. Get Deep Comment Interactions
            comments_count = issue.get("comments", 0)
            comments_detail = []
            
            if comments_count > 0:
                comments_url = issue.get("comments_url")
                print(f"  [*] Extracting {comments_count} comments for issue: {issue.get('title')}")
                raw_comments = fetch_issue_comments(comments_url, headers)
                
                for c in raw_comments:
                    c_reactions = c.get("reactions", {})
                    comments_detail.append({
                        "user": c.get("user", {}).get("login", "Unknown"),
                        "body": c.get("body", ""),
                        "upvotes": c_reactions.get("+1", 0) + c_reactions.get("heart", 0),
                        "created_at": c.get("created_at")
                    })
            
            # Calculate total comment likes
            total_comment_upvotes = sum(c["upvotes"] for c in comments_detail)
            
            # Store the full interaction map
            latest_scores[api_url] = {
                "issue_upvotes": issue_upvotes,
                "total_comments": comments_count,
                "comment_upvotes": total_comment_upvotes,
                "overall_popularity_score": issue_upvotes + total_comment_upvotes + (comments_count * 2), 
                "interactions": comments_detail
            }

    # Load existing heavy-parsed data
    with open(TEMPLATES_FILE, "r") as f:
        templates = json.load(f)

    # Quickly update the JSON with deep interaction data
    updated_count = 0
    for spec in templates:
        url = spec.get("_original_url")
        if url in latest_scores:
            spec["community_score"] = latest_scores[url]
            updated_count += 1

    # Save it back
    with open(TEMPLATES_FILE, "w") as f:
        json.dump(templates, f, indent=2)
        
    print(f"✅ Fast Sync Complete: Updated deep interactions & comments for {updated_count} APIs!")

if __name__ == "__main__":
    main()