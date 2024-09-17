const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: false }));

// Middleware to parse JSON bodies

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

let expenses = [];

//creating a new expense
app.post("/api/expenses", (req, res) => {
  console.log("Request body:", req.body);
  try {
    const { description, amount } = req.body;
    if (!description || !amount) {
      return res.status(400).json({ error: "Kindly fill the form" });
    }
    // Calculate new ID based on the last expense, if any
    const newId =
      expenses.length > 0 ? expenses[expenses.length - 1].id + 1 : 1;
    const newExpense = {
      id: expenses.length + 1,
      description,
      amount: parseFloat(amount),
    };
    console.log("New expense added:", newExpense);
    expenses.push(newExpense);
    res.status(201).json(newExpense);
  } catch (error) {
    console.error("Error processing request:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Serve the home.html file when visiting the root URL
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "home"));
});

// read all expense
app.get("/api/expenses", (req, res) => {
  res.json(expenses);
});

// read a single expense
app.get("/api/expenses/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const expense = expenses.find((expense) => expense.id === id);
  if (!expense) {
    return res.status(404).send("Expense not found");
  }

  res.json(expense);
});

//updating a single expense
app.put("/api/expenses/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const { description, amount } = req.body;

  const expenseIndex = expenses.findIndex((expense) => expense.id === id);
  if (expenseIndex === -1) {
    return res.status(404).send("Expense not found");
  }

  // Validating the updated data
  if (!description || isNaN(amount)) {
    return res.status(400).json({ error: "Invalid input data" });
  }

  const updatedExpense = {
    id: id,
    description: description,
    amount: parseFloat(amount),
  };
  expenses[expenseIndex] = updatedExpense;

  console.log("Expense updated:", updatedExpense);


  res.json(updatedExpense);
});


//deleting a single expense
app.delete("/api/expenses/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const expenseIndex = expenses.findIndex((expense) => expense.id === id);
  if (expenseIndex == -1) {
    return res.status(404).send("Expense not found");
  }

  expenses = expenses.filter((expense) => expense.id !== id);
  res.json({ message: "Expense deleted" });
});

// Calculate the total expense
app.get("/api/expense", (req, res) => {
  const totalExpense = expenses.reduce(
    (total, expense) => total + expense.amount,
    0
  );
  res.json({ totalExpense });
});

module.exports = app;
