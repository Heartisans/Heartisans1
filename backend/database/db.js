import mongoose from "mongoose";
import dotenv from 'dotenv'


dotenv.config()
const URI = process.env.MONGO_URI

export const connectDB = async()=> {
  try{
    await mongoose.connect(URI);
    console.log("Database Connection successful");
  }
  catch(err){
    console.error("Database connection failed:", err.message);
    process.exit(0);
  }
}