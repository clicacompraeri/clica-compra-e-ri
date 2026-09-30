const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const publicPath = path.join(__dirname, "public");

app.use(express.static(publicPath));

app.use((req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Clica, Compra e Ri rodando na porta ${PORT}`);
});
