const express = require("express")
const dotenv = require("dotenv")
const cors = require("cors")
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");
const port = process.env.PORT || 8000
dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

const uri = process.env.MONGO_DB_URI;


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


// jtw token verify

const JWKS = createRemoteJWKSet(
    new URL(`http://localhost:3000/api/auth/jwks`)
)

const verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized Access",
            });
        }

        const token = authHeader.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Token not found",
            });
        }

        const { payload } = await jwtVerify(token, JWKS);
        // console.log(payload)
        req.user = payload;

        next();
    } catch (error) {
        // console.error("JWT Verify Error:", error);
        return res.status(401).json({
            success: false,
            message: "Forbidden Access",
        });
    }
};


async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const db = client.db("ideaVault")
        const ideasCollection = db.collection("ideas")
        const commentCollection = db.collection("comments")


        // all ideas data api
        // app.get("/ideas", async (req, res) => {
        //     const result = await ideasCollection.find().toArray()
        //     res.json(result)
        // })
        // all ideas data and search or filter
        app.get("/ideas", async (req, res) => {
            const { search, category } = req.query;

            let query = {};

            if (search) {
                query.title = {
                    $regex: search,
                    $options: "i",
                };
            }

            if (category) {
                query.category = category;
            }

            const result = await ideasCollection.find(query).toArray();

            res.json(result);
        });



        // ideas post (add-idea)
        app.post("/ideas", verifyToken, async (req, res) => {
            const ideasData = req.body
            const result = await ideasCollection.insertOne(ideasData);
            // console.log(result,"idea added")
            res.json(result)
        })

        // ideas details data id only one data read
        app.get("/ideas/:id", verifyToken, async (req, res) => {
            const { id } = req.params
            const result = await ideasCollection.findOne({ _id: new ObjectId(id) })
            // console.log(result)
            res.json(result)
        })

        // user comment data post and get
        app.post("/comments", async (req, res) => {
            const commentData = req.body
            // console.log(commentData, "body comments")
            const result = await commentCollection.insertOne(commentData)
            // console.log(result, "comments")
            res.json(result)
        })

        // get commentData all
        app.get("/comments/:id", async (req, res) => {
            const { id } = req.params
            const result = await commentCollection.find({ ideaId: id }).toArray()
            res.json(result)
        })

        // update comment 
        app.patch("/comments/:id", async (req, res) => {
            const { id } = req.params;
            const updatedData = req.body;
            // console.log(updatedData, "req data")
            const result = await commentCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updatedData }
            )
            // console.log(result, "after update")
            res.json(result)
        })

        // comment delete
        app.delete("/comments/:id", async (req, res) => {
            const { id } = req.params
            const result = await commentCollection.deleteOne({ _id: new ObjectId(id) })
            res.json(result)
        })


        // my ideas update data edit button
        app.patch("/ideas/:id", async (req, res) => {
            const { id } = req.params
            const updatedData = req.body
            const result = await ideasCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updatedData }
            )
            res.json(result)
        })

        // my idea page DELETE button
        app.delete("/ideas/:id", async (req, res) => {
            const { id } = req.params
            const result = await ideasCollection.deleteOne({ _id: new ObjectId(id) })
            console.log(result, "delete idea")
            res.json(result)
        })


        // my interaction page user comment get 
        app.get("/comments/user/:userId", verifyToken, async (req, res) => {
            const { userId } = req.params;

            const result = await commentCollection
                .find({ userId })
                .toArray();

            res.json(result);
        });






        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);




app.get("/", (req, res) => {
    res.send("designVault server is running fine~!")
})

app.listen(port, () => {
    console.log(`Server is running ${port}`)
})