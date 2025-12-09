require('dotenv').config();  
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

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
          email_confirmed_at: new Date().toISOString(),
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
    const { data: verifiedUser, error: verifyError } = await supabase.auth.admin.updateUserById(data.email, {
      email_confirmed_at: new Date().toISOString()
    });

    res.json({ success: true, result: response.data || response });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(3000, () => console.log("Server running on port 3000"));
