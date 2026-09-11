// GitHub Pages serves 404.html for unknown paths; the SPA needs it to route.
// Written in Node so the build works on Windows as well as CI.

import { copyFileSync } from "node:fs";
import path from "node:path";

const dist = path.resolve(process.cwd(), "dist");
copyFileSync(path.join(dist, "index.html"), path.join(dist, "404.html"));
