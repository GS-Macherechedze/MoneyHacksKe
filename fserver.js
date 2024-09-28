const dotenv = require('dotenv');
dotenv.config();

const app = require("./index");
const PORT = process.env.PORT || 10000;

const path = require("path");
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const bodyParser = require("body-parser");
const { Pool } = require("pg");

const { check, validationResult } = require("express-validator");

// Setting up middleware to handle incoming data
app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));

// Serving static files
app.use(express.static(path.join(__dirname, "public")));

// Configure session middleware
app.use(
  session({
    secret: "adce67654rrdxr",
    resave: false,
    saveUninitialized: false,
  })
);

// Connecting to the database
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: 5432, // Default PostgreSQL port
});

pool.connect((err, client, release) => {
  if (err) {
    console.error("Error connecting to PostgreSQL: " + err.stack);
  } else {
    console.log("Connected to PostgreSQL");

    // Check if the database exists
    client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [process.env.DB_NAME], (err, result) => {
      if (err) {
        console.error("Error checking database: " + err.stack);
      } else if (result.rows.length === 0) {
        // Create the database if it doesn't exist
        client.query(`CREATE DATABASE ${process.env.DB_NAME}`, (err) => {
          if (err) {
            console.error("Error creating database: " + err.stack);
          } else {
            console.log("Database created successfully");
          }
        });
      }

      // Check if the user table exists and create it if not
      client.query(`
        CREATE TABLE IF NOT EXISTS "user" (
          id SERIAL PRIMARY KEY,
          fullName VARCHAR(255) NOT NULL,
          username VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL,
          password VARCHAR(255) NOT NULL
        )
      `, (err) => {
        if (err) {
          console.error("Error creating table: " + err.stack);
        } else {
          console.log("Table created successfully");
        }
        release();
      });
    });
  }
});

// Import functions from index.js
const expenseHandlers = require("./index");

// Redirect root '/' to '/register'
app.get('/', (req, res) => {
  res.redirect('/register.html');
});

// Handling the Post request
// Extracting data from the register.html
app.post(
  "/register",
  // Validation middleware
  [
    check("email")
      .isEmail()
      .withMessage("Please provide a valid email address"),
    check("userName")
      .isAlphanumeric()
      .withMessage("Username needs to be alphanumeric"),
    check("email").custom(async (value) => {
      const { rows } = await pool.query('SELECT * FROM "user" WHERE email = $1', [value]);
      if (rows.length > 0) {
        throw new Error("Email already exists!");
      }
    }),
    check("userName").custom(async (value) => {
      const { rows } = await pool.query('SELECT * FROM "user" WHERE username = $1', [value]);
      if (rows.length > 0) {
        throw new Error("Username already exists!");
      }
    }),
  ],
  async (req, res) => {
    // Check for any validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Password hashing
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);

    // Create new user object
    const newUser = {
      fullName: req.body.fullName,
      username: req.body.userName,
      email: req.body.email,
      password: hashedPassword,
    };

    // Save the new user
    try {
      await pool.query(
        'INSERT INTO "user" (fullName, username, email, password) VALUES ($1, $2, $3, $4)',
        [newUser.fullName, newUser.username, newUser.email, newUser.password]
      );
      console.log("New user successfully created");
      res.redirect("/home");
    } catch (error) {
      console.error("Error inserting new user record: " + error.message);
      return res.status(500).json({ error: error.message });
    }
  }
);

// Route to serve the login page
app.post(
  "/login",
  [
    check("email").isEmail().withMessage("Please enter a valid email"),
    check("password").exists().withMessage("Password is required"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      // Find user by email
      const { rows } = await pool.query('SELECT * FROM "user" WHERE email = $1', [email]);

      if (rows.length === 0) {
        return res.status(400).json({ error: "Invalid email or password" });
      }

      const dbUser = rows[0];

      // Compare passwords
      const match = await bcrypt.compare(password, dbUser.password);
      if (!match) {
        return res.status(400).json({ error: "Invalid email or password" });
      }
      // Create session and Redirect to home page on success
      req.session.userId = dbUser.id;
      res.redirect("/home");
    } catch (error) {
      console.error("Login error: " + error.message);
      return res.status(500).json({ error: "An error occurred during login" });
    }
  }
);

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});

app.get("/home", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "home.html"));
});

// Starting the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});