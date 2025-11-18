import e from "express";
const app = e();
app.use(e.json());   

export const loginController = (req, res) => {
    const loginPage = `
    <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Login Page</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      font-family: Arial, sans-serif;
      background: #f2f2f2;
    }

    .container {
      width: 350px;
      padding: 20px;
      background: #fff;
      border-radius: 10px;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
    }

    h2 {
      text-align: center;
      margin-bottom: 20px;
    }

    input[type="text"], input[type="password"] {
      width: 100%;
      padding: 10px;
      margin: 10px 0;
      border: 1px solid #ccc;
      border-radius: 5px;
    }

    button {
      width: 100%;
      padding: 10px;
      border: none;
      background: #007bff;
      color: #fff;
      border-radius: 5px;
      cursor: pointer;
      font-size: 16px;
    }

    button:hover {
      background: #0056b3;
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>Login</h2>
    <form>
      <input type="text" placeholder="Username" required />
      <input type="password" placeholder="Password" required />
      <button type="submit">Sign In</button>
    </form>
  </div>
</body>
</html>
    `
  res.send(loginPage);
};

export const signupController = (req, res) => {
    const signupPage = `
    <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sign Up Page</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      font-family: Arial, sans-serif;
      background: #f2f2f2;
    }

    .container {
      width: 350px;
      padding: 20px;
      background: #fff;
      border-radius: 10px;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
    }

    h2 {
      text-align: center;
      margin-bottom: 20px;
    }

    input[type="text"], input[type="email"], input[type="password"] {
      width: 100%;
      padding: 10px;
      margin: 10px 0;
      border: 1px solid #ccc;
      border-radius: 5px;
    }

    button {
      width: 100%;
      padding: 10px;
      border: none;
      background: #007bff;
      color: #fff;
      border-radius: 5px;
      cursor: pointer;
      font-size: 16px;
    }

    button:hover {
      background: #0056b3;
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>Sign Up</h2>
    <form>
      <input type="text" placeholder="Full Name" required />
      <input type="text" placeholder="Username" required />
      <input type="email" placeholder="Email" required />
      <input type="password" placeholder="Password" required />
      <button type="submit">Create Account</button>
    </form>
    <script>
      const form = document.querySelector('form');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const data = {
          name: form.elements[0].value,
          username: form.elements[1].value,
          email: form.elements[2].value,
          password: form.elements[3].value,
        };

        try {
          const res = await fetch('/signup', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
          });

          const result = await res.text();
          alert(result);
        } catch (err) {
          alert('Error sending request');
        }
      });
    </script>
  </div>
</body>
</html>

    `
  res.send(signupPage);
}

export const signupPostController = (req, res) => {
  const { name, username, email, password } = req.body;

  console.log("Received signup:", req.body);

  // In real apps: hash password + validate + save
  res.send("Signup received successfully!");
};
