// server/lib/db.js
import mongoose from "mongoose";

const connectDB = async () => {
    try {
        mongoose.connection.on("connected", () => console.log("Database connected"))
        await mongoose.connect(`${process.env.MONGODB_URI}/Chat_Application`, {
            // MODIFIED: Added connection pooling configuration
            maxPoolSize: 10,
            minPoolSize: 2,
            socketTimeoutMS: 45000,
            serverSelectionTimeoutMS: 5000
        })
    } catch (error) {
        console.log(error);
    }
};

export default connectDB;