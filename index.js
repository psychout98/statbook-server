const express = require('express')
const app = express()
var cors = require('cors');
require('dotenv').config()
const baseStats = {
    'svace': 0,
    'svatt': 0,
    'sverr': 0,
    'srdig': 0,
    'sratt': 0,
    'srerr': 0,
    'dfdig': 0,
    'dfatt': 0,
    'dferr': 0,
    'spkll': 0,
    'spatt': 0,
    'sperr': 0,
    'block': 0,
    'bktch': 0,
    'bkerr': 0,
    'stast': 0,
    'stdmp': 0,
    'sterr': 0
}

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://psychout09:${process.env.GOOGLE_PASSWORD}@chess.nibctnb.mongodb.net/?retryWrites=true&w=majority`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
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

app.post("/team", async (req, res) => {
    try {
        const teams = client.db("chess").collection("teams")
        const existingTeam = await teams.findOne({ teamname: req.query.teamname })
        if (existingTeam) {
            const players = client.db("chess").collection("players")
            const games = client.db("chess").collection("games")
            const existingPlayers = (await players.find({ teamid: existingTeam._id.toString() }).toArray()).map(player => { return { id: player._id.toString(), name: player.name } })
            const existingGames = (await games.find({ teamid: existingTeam._id.toString() }).toArray()).map(game => game._id)
            res.status(200).json({ ...existingTeam, players: existingPlayers, games: existingGames })
        } else {
            const insertTeam = await teams.insertOne({
                teamname: req.query.teamname,
            })
            res.status(200).send(insertTeam.insertedId)
        }
    } catch (error) {
        console.log(error)
        res.status(500).json(error)
    }
})

app.post("/player", async (req, res) => {
    try {
        const players = client.db("chess").collection("players")
        const insertPlayer = await players.insertOne({
            name: req.query.playername,
            teamid: req.query.teamid
        })
        res.status(200).send(insertPlayer.insertedId)
    } catch (error) {
        console.log(error)
        res.status(500).json(error)
    }
})

app.delete("/player", async (req, res) => {
    try {
        const players = client.db("chess").collection("players")
        const deletePlayer = await players.deleteOne({ _id: new ObjectId(req.query.playerid) })
        res.status(200).send(deletePlayer.acknowledged)
    } catch (error) {
        console.log(error)
        res.status(500).json(error)
    }
})

app.post("/game", async (req, res) => {
    try {
        const games = client.db("chess").collection("games")
        const insertGame = await games.insertOne({
            teamid: req.query.teamid,
            opponent: req.query.opponent,
            game: req.query.game,
            set: req.query.set,
            date: new Date().getTime(),
            history: [],
            undos: []
        })
        res.status(200).json(insertGame.insertedId)
    } catch (error) {
        console.log(error)
        res.status(500).json(error)
    }
})

app.get("/game", async (req, res) => {
    try {
        const games = client.db("chess").collection("games")
        const existingGame = await games.findOne({ _id: new ObjectId(req.query.gameid) })
        res.status(200).json(existingGame)
    } catch (error) {
        console.log(error)
        res.status(500).json(error)
    }
})

app.delete("/game", async (req, res) => {
    try {
        const games = client.db("chess").collection("games")
        const deleteGame = await games.deleteOne({ _id: new ObjectId(req.query.gameid) })
        res.status(200).send(deleteGame.acknowledged)
    } catch (error) {
        console.log(error)
        res.status(500).json(error)
    }
})

app.put("/play", async (req, res) => {
    try {
        const stats = client.db("chess").collection("stats")
        const existingStat = await stats.findOne({
            gameid: req.query.gameid,
            playerid: req.query.playerid
        })
        if (existingStat) {
            const inc = await stats.updateOne({
                gameid: req.query.gameid,
                playerid: req.query.playerid
            },
                {
                    $inc: req.query.play2 ? {
                        [req.query.play]: 1,
                        [req.query.play2]: 1
                    } : {
                        [req.query.play] : 1
                    },
                    $push: {
                        history: {
                            playerid: req.query.playerid,
                            play1: req.query.play1,
                            play2: req.query.play2
                        }
                    }
                })
            res.status(200).send(inc.acknowledged)
        } else {
            const insertStat = await stats.insertOne({
                ...baseStats,
                gameid: req.query.gameid,
                playerid: req.query.playerid
            })
            res.status(200).send(insertStat.acknowledged)
        }
    } catch (error) {
        console.log(error)
        res.status(500).json(error)
    }
})

app.put("/undo", async (req, res) => {
    try {
        const games = client.db("chess").collection("games")
        const existingGame = await games.findOne({ _id: new ObjectId(req.query.gameid) })
        if (existingGame && existingGame.history.length > 0) {
            const lastPlay = existingGame.history[existingGame.history.length - 1]
            const stats = client.db("chess").collection("stats")
            const dec = await stats.updateOne({
                gameid: req.query.gameid,
                playerid: lastPlay.playerid
            },
            {
                $inc: lastPlay.play2 ? {
                    [lastPlay.play]: -1,
                    [lastPlay.play2]: -1
                } : {
                    [lastPlay.play]: -1
                },
                $push: {
                    undos: lastPlay
                },
                $pop: {
                    history: 1
                }
            })
            res.status(200).json(dec.acknowledged)
        } else {
            res.status(404).send('Invalid game id')
        }
    } catch (error) {
        console.log(error)
        res.status(500).json(error)
    }
})

app.put("/redo", async (req, res) => {
    try {
        const games = client.db("chess").collection("games")
        const existingGame = await games.findOne({ _id: new ObjectId(req.query.gameid) })
        if (existingGame && existingGame.undos.length > 0) {
            const lastUndo = existingGame.undos[existingGame.history.length - 1]
            const stats = client.db("chess").collection("stats")
            const dec = await stats.updateOne({
                gameid: req.query.gameid,
                playerid: lastUndo.playerid
            },
            {
                $inc: lastUndo.play2 ? {
                    [lastUndo.play]: 1,
                    [lastUndo.play2]: 1
                } : {
                    [lastUndo.play]: 1
                },
                $push: {
                    history: lastUndo
                },
                $pop: {
                    undos: 1
                }
            })
            res.status(200).json(dec.acknowledged)
        } else {
            res.status(404).send('Invalid game id')
        }
    } catch (error) {
        console.log(error)
        res.status(500).json(error)
    }
})


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