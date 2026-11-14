import mongoose from "mongoose";
import { DB_name } from "../constants.js";

const ConnectionDB = async ()=>{
    try {
        if (!process.env.MONGO_URI) {
            throw new Error("MONGO_URI is not defined in environment variables");
        }
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            dbName: DB_name,
        });
        console.log(`MongoDB connected!! DB HOST: ${conn.connection.host}`)
        return conn
    } catch (error) {
        console.error("MONGODB CONNECTION FAILED",error)
        process.exit(1)
    }
}
export default ConnectionDB
