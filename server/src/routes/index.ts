import type { IncomingMessage, ServerResponse } from "http";
import { handleCreateGame } from "./createGame";

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk: Buffer) => {
      body += chunk.toString();
    });
    req.on("end", () => resolve(body));
  });
}

export async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const url = req.url ?? "/";
  const method = req.method ?? "GET";

  res.setHeader("Content-Type", "application/json");

  if (method === "POST" && url === "/game/create") {
    const raw = await readBody(req);
    const body = JSON.parse(raw) as Record<string, unknown>;
    const result = handleCreateGame(body);

    if (result.cookie) {
      res.setHeader("Set-Cookie", result.cookie);
    }
    res.statusCode = result.status;
    res.end(JSON.stringify(result.body));
    return;
  }

  res.statusCode = 404;
  res.end(JSON.stringify({ error: "not_found" }));
}
