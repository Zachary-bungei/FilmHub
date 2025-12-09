require('dotenv').config();  
const express = require("express");
const bodyParser = require("body-parser"); //cookie-parser
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();
const cookieParser = require("cookie-parser");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Main API endpoint
app.post("/api", async (req, res) => {
  let { action, data } = req.body;

  try {
    let response;

    switch (action) {
      // ---------------- SIGNUP ----------------
      case "signup":
        response = await supabase.auth.admin.createUser({
          email: data.email,
          username: data.username,
          password: data.password,
        });
        if (response.error || !response.result?.user?.id) {
          // response = create;
          break;
        }
        const userId = response.result.user.id;
           let verify = await supabase.auth.admin.updateUserById(userId, {
           email_confirmed_at: new Date().toISOString()
        });
        break;

               // options: {
          //     emailRedirectTo: 'https://filmseller.netlify.app/verify' 
          //   }

      // ---------------- LOGIN ----------------
      case "login":
        response = await supabase.auth.signInWithPassword({
           email: data.email,
           password: data.password,
        });
        break;

      // ---------------- POST IDEA ----------------
      case "postIdea":
        response = await supabase
          .from("ideas")
          .insert([
            {
              user_id: data.user_id,
              title: data.title,
              content: data.content,
            },
          ])
          .select();
        break;

      // ---------------- DELETE IDEA ----------------
      case "deleteIdea":
        response = await supabase
          .from("ideas")
          .delete()
          .eq("id", data.idea_id)
          .select();
        break;

      // ---------------- FETCH IDEAS ----------------
      case "getIdeas":
        response = await supabase
          .from("ideas")
          .select("*")
          .eq("user_id", data.user_id)
          .order("id", { ascending: false });
        break;

      // ---------------- UNKNOWN ACTION ----------------
      default:
        return res.status(400).json({ error: "Unknown action" });
    }

    if (response.error) {
      return res.status(500).json({ success: false, error: response.error });
    }

    res.json({ success: true, result: response.data || response });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/check-session", async (req, res) => {
  const token = req.cookies.sb_token; 
  
  if (!token) {
    return res.json({ loggedIn: false });
  }

  // Verify token with Supabase
  const { data: user, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.json({ loggedIn: false });
  }
  
  res.json({ loggedIn: true, user: { id: user.id, email: user.email } });
});

// POST /logout
app.post("/logout", async (req, res) => {
  // Clear the HTTP-only cookie
  res.clearCookie("sb_token");

  // Optional: revoke the session in Supabase (server-side)
  const token = req.cookies.sb_token;
  if (token) {
    await supabase.auth.admin.invalidateSession(token); 
  }

  res.json({ success: true, message: "Logged out" });
});

app.post("/submit-idea", async (req, res) => {
  try {
    const user = req.cookies.user || "anonymous"; // own from cookie/session
    const {
      category, title, hook, describe, pdf, banner, rate, available, date
    } = req.body;

    // Rate validation (0–5)
    let rateNum = parseFloat(rate);
    if (rateNum < 0 || rateNum > 5) rateNum = null;

    // Insert into Supabase
    const { data, error } = await supabase
      .from("Ideas")
      .insert([
        {
          own: user,
          category,
          title,
          hook,
          describe,
          pdf,
          banner,
          rate: rateNum,
          available: available === true || available === "on",
          date
        }
      ])
      .select(); // returns inserted row

    if (error) throw error;

    res.json({ message: "Idea submitted!", id: data[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


app.listen(3000, () => console.log("Server running on port 3000"));
