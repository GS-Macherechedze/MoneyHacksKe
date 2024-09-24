const app = require("./index");
const PORT = process.env.PORT || 3000;

const path = require("path");

const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const bodyParser = require("body-parser");
const mysql = require("mysql2");

const { check, validationResult } = require("express-validator");

//setting up middleware to handle incoming data
app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));

//Serving static files
app.use(express.static(path.join(__dirname, "public")));

//configure session middleware
app.use(
  session({
    secret: "adce67654rrdxr",
    resave: false,
    saveUninitialized: false,
  })
);

//connecting to the database
const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "sheila",
  database: "plp_expense",
});

connection.connect((err) => {
  if (err) {
    console.error("Error connecting to MSQL: " + err.stack);
  }
  console.log("Connected successfully to the db server");
});

// Import functions from index.js
const expenseHandlers = require("./index");

// Redirect root '/' to '/register'
app.get('/', (req, res) => {
  res.redirect('/register.html');
});

//handling the Post request
//extracting data from the register.html
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
      return new Promise((resolve, reject) => {
        user.getUserByEmail(value, (error, results) => {
          if (error) return reject(error);
          if (results.length > 0)
            return reject(new Error("Email already exists!"));
          resolve();
        });
      });
    }),
    check("userName").custom(async (value) => {
      return new Promise((resolve, reject) => {
        user.getUserByUsername(value, (error, results) => {
          if (error) return reject(error);
          if (results.length > 0)
            return reject(new Error("Username already exists!"));
          resolve();
        });
      });
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
    user.createUser(newUser, (error, results) => {
      if (error) {
        console.error("Error inserting new user record: " + error.message);
        return res.status(500).json({ error: error.message });
      }

      console.log("New user successfully created");
      // Redirect to home page on success
      res.redirect("/home");
    });
  }
);

//registering the user object
const user = {
  tableName: "user",
  createUser: function (newUser, callback) {
    connection.query(`INSERT INTO ${this.tableName} SET ?`, newUser, callback);
  },
  getUserByEmail: function (email, callback) {
    connection.query(
      `SELECT * FROM ${this.tableName} WHERE email = ?`,
      [email],
      callback
    );
  },
  getUserByUsername: function (userName, callback) {
    connection.query(
      `SELECT * FROM ${this.tableName} WHERE userName = ?`,
      [userName],
      callback
    );
  },
};
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

    // Find user by email
    user.getUserByEmail(email, async (error, results) => {
      if (error || results.length === 0) {
        return res.status(400).json({ error: "Invalid email or password" });
      }

      const dbUser = results[0];

      // Compare passwords
      const match = await bcrypt.compare(password, dbUser.password);
      if (!match) {
        return res.status(400).json({ error: "Invalid email or password" });
      }
      // Create session and Redirect to home page on success
      req.session.userId = dbUser.id;
      res.redirect("/home");
    });
  }
);

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});

app.get("/home", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "home.html"));
});

//starting the server
app.listen(3000, () => {
  console.log("Server running on port 3000");
});
