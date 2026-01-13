
require('dotenv').config();  
const express = require("express");
const bodyParser = require("body-parser"); 
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
const cookieParser = require("cookie-parser");

const app = express();
app.use(bodyParser.json());
app.use(cookieParser());


// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
app.use(cors({
  origin: 'https://filmseller.netlify.app'
}));

const allowedOrigins = ['https://filmseller.netlify.app'];

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});
app.get('/protected', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Missing token' })

  const { data: { user }, error } =
    await supabase.auth.getUser(token)

  if (error || !user) {
    return res.status(401).json({ error: 'Invalid token' })
  }

  res.json({ message: 'Authorized', user })
});

// Main API endpoint
app.post("/auth", async (req, res) => {
  let { action, data } = req.body;
  
  try {
    let response;
    switch (action) {
      // ---------------- SIGNUP ----------------
      case "signup":
        response = await supabase.auth.admin.createUser({
          email: data.email,
          password: data.password,
          user_metadata: {
            name: data.username,
            rating: data.rating  || null,
          }
        });
        if (response.error || !response.result?.user?.id) {
          // response = create;
          break;
        }
        const userId = response.result.user.id;
           await supabase.auth.admin.updateUserById(userId, {
           email_confirmed_at: new Date().toISOString()
        });
        break;


      // ---------------- LOGIN ----------------
      case "login":
        response = await supabase.auth.signInWithPassword({
           email: data.email,
           password: data.password,
        });
        if (response.error || !response.data?.session) {
          break;
        }

        const {
          access_token,
          refresh_token,
          expires_at,
          user
        } = response.data.session;
        
        res.json({
          access_token,
          refresh_token,
          expires_at,
          user: {
            id: user.id,
            email: user.email
          }
        });

        // const { access_token, refresh_token } = response.data.session;
        
        // res.json({
        //   access_token: data.session.access_token,
        //   refresh_token: data.session.refresh_token,
        //   expires_at: data.expires_at,
        //   user: {
        //     id: data.user.id,
        //     email: data.user.email
        //   }
        // });
        break;
        
      default:
        return res.status(400).json({ error: "Unknown action" });
    }

    if (response.error) {
      return res.status(500).json({ success: false, error: response.error });
      // return res.json({ success: false });
    }

    res.json({data: response.data});
    return res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
      // return res.json({ success: false });
  }
});


app.post("/logout", async (req, res) => {
  const refreshToken = req.cookies["sb-refresh-token"];

  res.clearCookie("sb-access-token", { path: "/" });
  res.clearCookie("sb-refresh-token", { path: "/" });

  if (refreshToken) {
    await supabase.auth.admin.signOutUserWithRefreshToken(refreshToken);
  }

  res.json({ success: true });
});


app.post("/checksession", async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.json({ loggedIn: false });
  }

  const token = authHeader.replace("Bearer ", "");

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return res.json({ loggedIn: false });
  }

  res.json({
    loggedIn: true,
    },
  });
});

app.post("/submitidea", async (req, res) => {
  // const userId = req.user.id;
// requireAuth
  const {userId, title, hook, describe, pdf, banner, date } = req.body;

  const { data, error } = await supabase
    .from("Ideas")
    .insert([
      {
        own: userId,
        title,
        hook,
        describe,
        pdf,
        banner,
        rate: 0,
        available: true,
        date
      }
    ])
    .select();

  if (error) {
    return res.status(500).json({ error: "Database error" });
  }

  res.json({ success: true, id: data[0].id });
});



// app.post("/checksession", async (req, res) => {
//   const token = req.cookies['sb-access-token']; // fixed name

//   if (!token) return res.json({ loggedIn: false });

//   const supa = createClient(SUPABASE_URL, SUPABASE_ANON, {
//     global: { headers: { Authorization: `Bearer ${token}` } }
//   });

//   const { data, error } = await supa.auth.getUser();

//   if (error || !data.user) return res.json({ loggedIn: false });

//   res.json({
//     loggedIn: true,
//     user: {
//       id: data.user.id,
//       email: data.user.email,
//       name: data.user.user_metadata.name,
//       profile_img: data.user.user_metadata.profile_img || null
//     }
//   });
// });



// POST /logout
// app.post("/logout", async (req, res) => {
//   const refreshToken = req.cookies['sb-refresh-token'];

//   // Clear cookies
//   res.clearCookie('sb-access-token', { path: '/' });
//   res.clearCookie('sb-refresh-token', { path: '/' });

//   // Optionally invalidate session on Supabase
//   if (refreshToken) {
//     try {
//       await supabase.auth.admin.signOutUserWithRefreshToken(refreshToken);
//     } catch (err) {
//       console.error("Failed to invalidate Supabase session:", err.message);
//     }
//   }

//   res.json({ success: true, message: "Logged out" });
// });




// app.post("/submit-idea", async (req, res) => {
//   try {
//     const user = req.cookies.user || "anonymous"; // own from cookie/session
//     const {
//       category, title, hook, describe, pdf, banner, rate, available, date
//     } = req.body;

//     // Rate validation (0–5)
//     let rateNum = parseFloat(rate);
//     if (rateNum < 0 || rateNum > 5) rateNum = null;

//     // Insert into Supabase
//     const { data, error } = await supabase
//       .from("Ideas")
//       .insert([
//         {
//           own: "zaxharr",
//           category: "action",
//           title,
//           hook,
//           describe,
//           pdf,
//           banner,
//           rate: 0,
//           available: true,
//           date
//         }
//       ])
//       .select(); // returns inserted row

//     if (error) throw error;

//     res.json({ message: "Idea submitted!", id: data[0].id });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Server error" });
//   }
// });


app.listen(3000, () => console.log("Server running on port 3000"));
