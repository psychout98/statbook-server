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
            const existingPlayers = await players.find({ teamid: existingTeam._id.toString() }).toArray()
            const existingGames = await games.find({ teamid: existingTeam._id.toString() }).toArray()
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

app.put("/player", async (req, res) => {
    try {
        const players = client.db("chess").collection("players")
        const updatePlayer = await players.updateOne({ _id: new ObjectId(req.query.playerid) },
            {
                $set: {
                    name: req.query.name
                }
            })
        res.status(200).json(updatePlayer.acknowledged)
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
        const newGame = {
            teamid: req.query.teamid,
            opponent: req.query.opponent,
            game: req.query.game,
            set: req.query.set,
            date: new Date().getTime(),
            history: [],
            undos: []
        }
        const insertGame = await games.insertOne(newGame)
        res.status(200).json({
            ...newGame,
            _id: insertGame.insertedId
        })
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

app.put("/game", async (req, res) => {
    try {
        const games = client.db("chess").collection("games")
        const updateGame = await games.updateOne({ _id: new ObjectId(req.query.gameid) },
            {
                $set: {
                    opponent: req.query.opponent,
                    game: req.query.game,
                    set: req.query.set
                }
            })
        res.status(200).json(updateGame.acknowledged)
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
        const games = client.db("chess").collection("games")
        const updateGame = await games.findOneAndUpdate({ _id: new ObjectId(req.query.gameid) },
            {
                $push: {
                    history: {
                        playerid: req.query.playerid,
                        play1: req.query.play1,
                        play2: req.query.play2
                    }
                }
            }, {
            returnDocument: "after"
        })
        if (updateGame) {
            const stats = client.db("chess").collection("stats")
            const existingStat = await stats.findOne({
                gameid: req.query.gameid,
                playerid: req.query.playerid
            })
            const inc = { ...baseStats }
            inc[req.query.play1] = 1
            if (req.query.play2) {
                inc[req.query.play2] = 1
            }
            if (existingStat) {
                await stats.updateOne({
                    gameid: req.query.gameid,
                    playerid: req.query.playerid
                },
                    {
                        $inc: inc
                    })
            } else {
                await stats.insertOne({
                    ...inc,
                    gameid: req.query.gameid,
                    playerid: req.query.playerid
                })
            }
            res.status(200).json(updateGame)
        } else {
            res.status(404).send('Game not found')
        }
    } catch (error) {
        console.log(error)
        res.status(500).json(error)
    }
})

app.put("/undo", async (req, res) => {
    try {
        const lastPlay = req.body.lastPlay
        const games = client.db("chess").collection("games")
        const updateGame = await games.findOneAndUpdate({ _id: new ObjectId(req.query.gameid) }, {
            $pop: {
                history: 1
            }
        }, {
            returnDocument: "after"
        })
        if (updateGame) {
            const stats = client.db("chess").collection("stats")
            const inc = { ...baseStats }
            inc[lastPlay.play1] = -1
            if (lastPlay.play2) {
                inc[lastPlay.play2] = -1
            }
            const dec = await stats.updateOne({
                gameid: req.query.gameid,
                playerid: lastPlay.playerid
            },
                {
                    $inc: inc
                })
            if (dec.acknowledged) {
                res.status(200).json(updateGame)
            } else {
                res.status(500).send('Failed to undo')
            }
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
        const lastUndo = req.body.lastUndo
        const games = client.db("chess").collection("games")
        const updateGame = await games.findOneAndUpdate({ _id: new ObjectId(req.query.gameid) },
            {
                $push: {
                    history: lastUndo
                }
            }, {
            returnDocument: "after"
        })
        if (updateGame) {
            const stats = client.db("chess").collection("stats")
            const inc = { ...baseStats }
            inc[lastUndo.play1] = 1
            if (lastUndo.play2) {
                inc[lastUndo.play2] = 1
            }
            const dec = await stats.updateOne({
                gameid: req.query.gameid,
                playerid: lastUndo.playerid
            },
                {
                    $inc: inc
                })
            if (dec.acknowledged) {
                res.status(200).json(updateGame)
            } else {
                res.status(500).send('Failed to redo')
            }
        } else {
            res.status(404).send('Invalid game id')
        }
    } catch (error) {
        console.log(error)
        res.status(500).json(error)
    }
})

app.post("/stats", async (req, res) => {
    try {
        const stats = client.db("chess").collection("stats")
        const statData = await stats.find({ $and: [{ playerid: { $in: req.body.players } }, { gameid: { $in: req.body.games } }] }).toArray()
        const statsByPlayer = req.body.players.map(playerid => {
            const allStatsForPlayer = statData.filter(stat => stat.playerid === playerid).reduce((a, b) => {
                Object.keys(baseStats).forEach(stat => {
                    a[stat] += b[stat]
                })
                return a
            }, { ...baseStats })
            return {
                ...allStatsForPlayer,
                playerid: playerid
            }
        })
        res.status(200).json(statsByPlayer)
    } catch (error) {
        console.log(error)
        res.status(500).json(error)
    }
})

app.get("/stats", async (req, res) => {
    try {
        const players = client.db("chess").collection("players")
        const existingPlayers = (await players
            .find({ teamid: req.query.teamid })
            .toArray())
            .map((player) => player._id)
        const stats = client.db("chess").collection("stats")
        const statData = await stats.find({ playerid: { $in: existingPlayers } }).toArray()
        const totals = { ...baseStats }
        statData.forEach((stat) => {
            Object.keys(baseStats).forEach((code) => {
                totals[code] += stat[code]
            })
        })
        res.status(200).json(totals)
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