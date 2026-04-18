import express from "express";
import generateRoute from "./routes/generateRoute.js";
import path from "path";

const app = express();

app.use(express.json());

// ✅ serve static files
app.use(express.static("public"));

app.use("/generate", generateRoute);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});