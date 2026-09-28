import http from "node:http";
import { json } from "co-body";
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  host: process.env.PGHOST || "localhost",
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || "nazerke",
  password: process.env.PGPASSWORD || undefined,
  database: process.env.PGDATABASE || "cinema_nexus"
});

const send = (res, status, data) => {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8"
  });
  res.end(JSON.stringify(data));
};

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return send(res, 204, null);

  try {
    const path = new URL(req.url, "http://localhost").pathname;

    if (req.method === "GET" && path === "/")
      return send(res, 200, { message: "Cinema Nexus API is running" });

    if (req.method === "GET" && path === "/users") {
      const { rows } = await pool.query(`
        SELECT id, username, full_name AS "fullName", email
        FROM users
        ORDER BY id
      `);

      return send(res, 200, rows);
    }

    if (req.method === "POST" && path === "/register") {
      const { username, fullName, email, password } = await json(req);

      if (!username || !password)
        return send(res, 400, { message: "Username and password are required" });

      try {
        const { rows } = await pool.query(`
          INSERT INTO users (username, full_name, email, password)
          VALUES ($1, $2, $3, $4)
          RETURNING id
        `, [username, fullName || null, email || null, password]);

        return send(res, 201, {
          message: "User registered successfully",
          id: rows[0].id
        });
      } catch (error) {
        if (error.code === "23505")
          return send(res, 409, { message: "Username already exists" });
        throw error;
      }
    }

    if (req.method === "POST" && path === "/login") {
      const body = await json(req);

      const { rowCount } = await pool.query(`
        SELECT id
        FROM users
        WHERE username = $1 AND password = $2
      `, [body.username, body.password]);

      

      return send(res, rowCount ? 200 : 401, {
        message: rowCount ? "Login successful" : "Invalid username or password"
      });
    }

    const match = path.match(/^\/users\/(\d+)$/);

    if (match && req.method === "PUT") {
      const userId = Number(match[1]);
      const { username } = await json(req);

      if (!username?.trim())
        return send(res, 400, { message: "Username is required" });

      try {
        const { rows, rowCount } = await pool.query(`
          UPDATE users
          SET username = $1
          WHERE id = $2
          RETURNING id, username, full_name AS "fullName", email
        `, [username.trim(), userId]);

        if (!rowCount)
          return send(res, 404, { message: "User not found" });

        return send(res, 200, {
          message: "Username updated successfully",
          user: rows[0]
        });
      } catch (error) {
        if (error.code === "23505")
          return send(res, 409, { message: "Username already exists" });
        throw error;
      }
    }

    if (match && req.method === "DELETE") {
      const { rows, rowCount } = await pool.query(
        "DELETE FROM users WHERE id = $1 RETURNING id",
        [Number(match[1])]
      );

      if (!rowCount)
        return send(res, 404, { message: "User not found" });

      return send(res, 200, {
        message: "User deleted successfully",
        id: rows[0].id
      });
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Route not found");

  } catch (error) {
    console.error(error);
    send(res, 500, { message: "Internal server error" });
  }
});

server.listen(5001, () =>
  console.log("Server is running on http://localhost:5001")
);

process.on("SIGINT", async () => {
  await pool.end();
  process.exit(0);
});