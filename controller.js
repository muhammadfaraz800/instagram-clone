export const signupPostController = (req, res) => {
  const { name, username, email, password } = req.body;

  console.log("Received signup:", req.body);

  // In real apps: hash password + validate + save
  res.send("Signup received successfully!");
};
