#!/bin/bash
# ══════════════════════════════════════════════════════════
#  APIDash CLI — Full E2E Test Suite  v2.0.0
#  Tests: help, info, langs, list, run, codegen, env, set,
#         request (GET/POST), graphql, ai (error path),
#         save, providers
# ══════════════════════════════════════════════════════════

set -e
cd "$(dirname "$0")"
CMD="npx tsx src/index.ts"

PASS=0
FAIL=0
TOTAL=0

pass() { echo "  ✅ $1"; PASS=$((PASS+1)); TOTAL=$((TOTAL+1)); }
fail() { echo "  ❌ FAILED: $1"; FAIL=$((FAIL+1)); TOTAL=$((TOTAL+1)); }

run_test() {
  local label="$1"; shift
  if "$@" > /dev/null 2>&1; then
    pass "$label"
  else
    fail "$label"
  fi
}

section() {
  echo ""
  echo "── $1 ──────────────────────────────────────────────"
}

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║   APIDash CLI  E2E Test Suite  v2.0.0               ║"
echo "║   HTTP · GraphQL · AI · Saved & Ad-Hoc              ║"
echo "╚══════════════════════════════════════════════════════╝"

# ── SAVED-REQUEST COMMANDS ────────────────────────────────
section "SAVED-REQUEST COMMANDS"

echo -e "\n[1] help"
run_test "help renders banner" $CMD help

echo -e "\n[2] info"
run_test "info shows workspace stats" bash -c "$CMD info | grep -i 'Workspace Info'"

echo -e "\n[3] langs"
run_test "langs lists python-requests" bash -c "$CMD langs | grep -i 'python-requests'"
run_test "langs lists curl" bash -c "$CMD langs | grep -i 'curl'"

echo -e "\n[4] list"
run_test "list shows saved requests" bash -c "$CMD list | grep -Ei 'get-posts|request'"

echo -e "\n[5] run (by index)"
run_test "run 1 returns HTTP 200" bash -c "$CMD run 1 | grep -Ei '200|OK'"

echo -e "\n[6] run (by ID)"
run_test "run get-post returns HTTP 200" bash -c "$CMD run get-post | grep -Ei '200|OK'"

echo -e "\n[7] codegen (index)"
run_test "codegen 1 python-requests has requests.get" bash -c "$CMD codegen 1 python-requests | grep 'requests.get'"
run_test "codegen 1 curl has curl -X" bash -c "$CMD codegen 1 curl | grep 'curl -X'"
run_test "codegen 1 javascript-fetch has fetch(" bash -c "$CMD codegen 1 javascript-fetch | grep 'fetch('"
run_test "codegen 2 dart-http has http.get" bash -c "$CMD codegen 2 dart-http | grep 'http.get'"

echo -e "\n[8] set + env"
run_test "set creates env var" bash -c "$CMD set test_scope CLI_TEST_KEY testvalue123 > /dev/null"
run_test "env reads back var" bash -c "$CMD env test_scope | grep 'CLI_TEST_KEY'"
run_test "set --secret masks value" bash -c "$CMD set test_scope SECRET_KEY hidden_val --secret > /dev/null && $CMD env test_scope | grep '●'"

# ── AD-HOC COMMANDS ───────────────────────────────────────
section "AD-HOC: request (HTTP)"

echo -e "\n[9] request GET"
run_test "GET jsonplaceholder returns 200" bash -c "$CMD request GET https://jsonplaceholder.typicode.com/posts/1 | grep '200'"
run_test "GET shows response body" bash -c "$CMD request GET https://jsonplaceholder.typicode.com/posts/1 | grep 'userId'"

echo -e "\n[10] request POST with body"
run_test "POST jsonplaceholder returns 201" bash -c "$CMD request POST https://jsonplaceholder.typicode.com/posts --header 'Content-Type: application/json' --body '{\"title\":\"test\",\"userId\":1}' | grep '201'"

echo -e "\n[11] request + codegen flag"
run_test "request --codegen curl prints curl snippet" bash -c "$CMD request GET https://jsonplaceholder.typicode.com/users/1 --codegen curl | grep 'curl -X'"

echo -e "\n[12] request + save flag"
run_test "request --save persists to workspace" bash -c "$CMD request GET https://httpbin.org/uuid --save 'HTTPBin UUID' | grep 'Saved request'"
run_test "saved request appears in list" bash -c "$CMD list | grep 'HTTPBin UUID'"

echo -e "\n[13] request DELETE"
run_test "DELETE returns 200" bash -c "$CMD request DELETE https://jsonplaceholder.typicode.com/posts/1 | grep '200'"

echo -e "\n[14] request with multiple headers"
run_test "multiple --header flags work" bash -c "$CMD request GET https://httpbin.org/headers --header 'X-Test: hello' --header 'Accept: application/json' | grep '200'"

# ── AD-HOC: graphql ───────────────────────────────────────
section "AD-HOC: graphql"

echo -e "\n[15] graphql basic query"
run_test "graphql countries query returns 200" bash -c "$CMD graphql https://countries.trevorblades.com --query 'query { countries { code name } }' | grep '200'"
run_test "graphql returns country data" bash -c "$CMD graphql https://countries.trevorblades.com --query 'query { countries { code } }' | grep 'code'"

echo -e "\n[16] graphql with variable"
run_test "graphql with variable returns India" bash -c "$CMD graphql https://countries.trevorblades.com --query 'query GetCountry(\$code: ID!) { country(code: \$code) { name capital } }' --variable 'code=IN' | grep 'India'"
run_test "graphql with variable returns capital" bash -c "$CMD graphql https://countries.trevorblades.com --query 'query GetCountry(\$code: ID!) { country(code: \$code) { name capital } }' --variable 'code=IN' | grep 'New Delhi'"

echo -e "\n[17] graphql + save"
run_test "graphql --save persists to workspace" bash -c "$CMD graphql https://countries.trevorblades.com --query 'query { countries { code } }' --save 'Countries GraphQL' | grep 'Saved request'"

# ── AD-HOC: ai ────────────────────────────────────────────
section "AD-HOC: ai"

echo -e "\n[18] ai — missing key gives auth error (not crash)"
# Expect the CLI to handle 401 gracefully and exit with code 1
run_test "ai without key exits with error (not crash)" bash -c "$CMD ai openai --prompt 'hi' --model gpt-4o 2>&1 | grep -Ei '401|api key|failed'"

echo -e "\n[19] ai — missing prompt shows usage"
run_test "ai without --prompt shows usage hint" bash -c "$CMD ai openai 2>&1 | grep -i 'prompt'"

echo -e "\n[20] providers"
run_test "providers lists openai" bash -c "$CMD providers | grep -i 'openai'"
run_test "providers lists groq" bash -c "$CMD providers | grep -i 'groq'"
run_test "providers lists ollama" bash -c "$CMD providers | grep -i 'ollama'"
run_test "providers lists gemini" bash -c "$CMD providers | grep -i 'gemini'"

# ── save command ──────────────────────────────────────────
section "save command"

echo -e "\n[21] save standalone"
run_test "save GET with name" bash -c "$CMD save GET https://api.example.com/health --name 'Health Check' | grep 'Saved request'"
run_test "save POST with body + header" bash -c "$CMD save POST https://api.example.com/users --name 'Create User' --header 'Content-Type: application/json' --body '{\"name\":\"Alice\"}' | grep 'Saved request'"
run_test "saved entries appear in list" bash -c "$CMD list | grep 'Health Check'"

# ── Error handling ────────────────────────────────────────
section "Error handling"

echo -e "\n[22] unknown command"
run_test "unknown command prints error message" bash -c "$CMD foobar 2>&1 | grep -i 'Unknown command'"

echo -e "\n[23] run missing ID"
run_test "run without ID prints error" bash -c "$CMD run 2>&1 | grep -iE 'Missing|Usage'"

echo -e "\n[24] request missing URL"
run_test "request without URL prints error" bash -c "$CMD request GET 2>&1 | grep -i 'Missing'"

echo -e "\n[25] graphql missing query"
run_test "graphql without --query prints error" bash -c "$CMD graphql https://example.com 2>&1 | grep -i 'query'"

# ── Summary ───────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════╗"
printf "║  Tests: %-4s  ✅ Passed: %-4s  ❌ Failed: %-4s      ║\n" "$TOTAL" "$PASS" "$FAIL"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
