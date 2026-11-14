import "dotenv/config"
import ConnectionDB from "./db/index.js"
import { app } from "./app.js"

ConnectionDB()
.then(()=>{
    const port = process.env.PORT || process.env.Port || 5000;

    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
    console.log("Database connected successfully");
})
.catch((error) => {
    console.error("Database connection failed:", error);
    process.exit(1);
});
