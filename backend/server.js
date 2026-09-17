import http from "node:http";
import { readFileSync, writeFileSync } from "node:fs";
import { json } from "co-body";

const file = "./data.json";
const readUsers = () => JSON.parse(readFileSync(file, "utf8"));
const send = (res, status, data) => {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
};

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.writeHead(204).end();
  }

  try {
    if (req.method === "GET" && req.url === "/") {
      res.writeHead(200, { "Content-Type": "text/plain" });
      return res.end("Cinema Nexus API is running");
    }

    if (req.method === "GET" && req.url === "/users") {
      return send(res, 200, readUsers());
    }

    if (req.method === "POST" && ["/register", "/login"].includes(req.url)) {
      const body = await json(req);
      const users = readUsers();

      if (req.url === "/register") {
        users.push(body);
        writeFileSync(file, JSON.stringify(users, null, 2));
        return send(res, 201, { message: "User registered successfully" });
      }

      const valid = users.some(user =>
        user.username === body.username && user.password === body.password
      );
      return send(res, valid ? 200 : 401, {
        message: valid ? "Login successful" : "Invalid username or password"
      });
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Route not found");
  } catch (error) {
    console.error(error);
    send(res, 500, { message: "Internal server error" });
  }
});

server.listen(5001, () => {
  console.log("Server is running on http://localhost:5001");
});
