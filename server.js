// server.js
const express = require('express');
const path = require('path');
const app = express();
const PORT = 7017;

// Serve static files from the current directory (TopDog)
app.use(express.static(__dirname));

// Send index.html on root request
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`TopDog server running at http://localhost:${PORT}`);
});
