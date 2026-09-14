import "dotenv/config";
import { createApp } from "./src/createApp.js";

const PORT = process.env.PORT || 8888;
const app = createApp();

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
