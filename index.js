const express = require("express")
const dotenv = require("dotenv")
const cors = require("cors")
const nodemailer = require("nodemailer");
dotenv.config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");

const port = process.env.PORT || 5000
const uri = process.env.MONGO_DB_URI;

const app = express()
app.use(cors({
    origin: [
        "http://localhost:3000",
        "https://design-vault-lovat.vercel.app"
    ],
    credentials: true // Better Auth এর কুকি/টোকেন পাস করার জন্য এটি বাধ্যতামূলক
}));
app.use(express.json())



//  নোডমেইলার ট্রান্সপোর্টার সেটআপ
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.USER_EMAIL,
        pass: process.env.USER_PASSWORD
    }
});

// ২. বডি থেকে ডেটা রিসিভ করা ইমেইল পাঠানোর আসল POST রাউট
app.post("/api/email-send", async (req, res) => {
    try {
        const { name, email } = req.body;

        if (!email || !name) {
            return res.status(400).json({ success: false, message: "Missing email or name in request body" });
        }

        const mailOptions = {
            from: `"Idea Vault" <${process.env.USER_EMAIL}>`,
            to: email,
            subject: "Welcome to Idea Vault! 🌸 Your creative journey starts here",
            html: `
        <div style="background-color: #f4f6f8; padding: 40px 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #eef2f5;">
                
                <div style="background: linear-gradient(135deg, #15508b 0%, #1c6ab7 50%, #f97316 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Idea Vault</h1>
                    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Where Ideas Meet Reality ✨</p>
                </div>

                <div style="padding: 40px 35px; background-color: #ffffff;">
                    <h2 style="color: #1e293b; margin-top: 0; margin-bottom: 16px; font-size: 22px; font-weight: 600;">Hello ${name}, 👋</h2>
                    
                    <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                        Thank you for creating an account at <strong>Idea Vault</strong>. We are absolutely thrilled to have you join our creative Idea and tech community!
                    </p>

                    <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 32px;">
                        Now you can unlock your full potential—explore mind-blowing ideas, share your unique thoughts, and collaborate with amazing developers around the world.
                    </p>

                    <div style="text-align: center; margin-bottom: 35px;">
                        <a href="${process.env.CLIENT_URI || 'http://localhost:3000'}" style="background: linear-gradient(135deg, #1c6ab7 0%, #15508b 100%); color: #ffffff; text-decoration: none; padding: 14px 35px; font-size: 16px; font-weight: 600; border-radius: 50px; display: inline-block; box-shadow: 0 4px 10px rgba(28, 106, 183, 0.3); transition: all 0.3s ease;">
                            Explore Dashboard
                        </a>
                    </div>

                    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-bottom: 25px;" />

                    <p style="color: #64748b; font-size: 14px; margin-bottom: 5px; line-height: 1.5;">Best regards,</p>
                    <p style="color: #1e293b; font-size: 15px; font-weight: 600; margin-top: 0;">Team Idea Vault</p>
                </div>

                <div style="background-color: #f8fafc; padding: 20px 35px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                        © 2026 Idea Vault. All rights reserved.
                    </p>
                    <p style="color: #94a3b8; font-size: 12px; margin: 5px 0 0 0;">
                        If you have any questions, feel free to reply to this email.
                    </p>
                </div>

            </div>
        </div>
    `
        };

        await transporter.sendMail(mailOptions);
        return res.status(200).json({ success: true, message: "Email sent successfully" });

    } catch (error) {
        console.error("Nodemailer Error:", error);
        return res.status(500).json({ success: false, message: "Failed to send email" });
    }
});


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
    new URL(`${process.env.CLIENT_URI}/api/auth/jwks`)
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
        // await client.connect();

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

        // // my idea data get 
        // app.get("/ideas/:userId", async (req, res) => {
        //     const { userId } = req.params;

        //     const result = await ideasCollection
        //         .find({ userId })
        //         .toArray();

        //     res.json(result);
        // });


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
        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}

run().catch(console.dir);




app.get("/", (req, res) => {
    res.send("IdeaVault server is running fine~!")
})

app.listen(port, () => {
    console.log(`Server is running ${port}`)
})