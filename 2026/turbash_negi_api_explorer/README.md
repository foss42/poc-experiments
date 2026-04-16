# API Explorer MCP POC

This is a small MCP app for exploring APIs, endpoint templates, and prefilled request examples.

It is my attempt to showcase an example of implementation of features for my api explorer project like discover, search, etc. Right now, it does not have import one but it will soon. It has been extended now to the community features that were discussed in the idea.

It is largely inspired by the sample chat flow I got from the APIDash maintainer.

Run it with:

```bash
npm install
npm run dev
```

MCP endpoint:

`http://localhost:3333/mcp`

Main tools:

- `discover-apis`
- `get-api-categories`
- `featured-apis`
- `browse-api-endpoints`
- `search-api-endpoints`
- `get-api-template`
- `rate-api`
- `add-api-review`
- `list-api-reviews`
- `suggest-api-change`

The UI is for picking inputs and the useful result goes back into chat context. To test, you can just fork the repo, run the server and then use these commands in your copilot right way.

Community persistence:

- Ratings and reviews are persisted in `data/database.json` for now.