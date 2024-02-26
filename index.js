import express from 'express'
const app = express()
import cors from 'cors'
import dotenv from 'dotenv'
dotenv.config()
import { router as statRoutes } from "./routes/stats.js"
import { router as authRoutes } from "./routes/auth.js"

import { MongoClient, ServerApiVersion } from 'mongodb';
const uri = `mongodb+srv://psychout09:${process.env.MONGO_PASSWORD}@statbook.lzrum1z.mongodb.net/?retryWrites=true&w=majority`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
export const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


app.use(cors({
    origin: "*",
    credentials: true
}));

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.get("/", (req, res) => {
    res.send("hello there")
})

app.use((req, res, next) => {
    res.setHeader(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content, Accept, Content-Type, Authorization"
    );
    res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, PATCH, OPTIONS"
    );
    next()
})

app.use("/api/v2/app", statRoutes)
app.use("/api/v2/auth", authRoutes)

async function run() {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
    app.listen(process.env.PORT, () => {
        console.log('Running')
    })
}
run().catch(console.dir);