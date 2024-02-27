import { client } from "../index.js"
import { baseStats } from "../static/statObjects.js"
import { ObjectId } from "mongodb"
import jwt from "jsonwebtoken"

export default class StatController {

    async createTeam(req, res) {
        try {
            const username = req.body.username.toLowerCase()
            const teams = client.db("volleyball").collection("teams")
            const existingTeam = await teams.findOne({ teamname: req.body.teamname })
            if (existingTeam) {
                res.status(401).send()
            } else {
                let r1 = Math.random() * 999999
                let r2 = Math.random() * 999999
                while (r1 === r2 || r1 < 100000 || r2 < 100000) {
                    r1 = Math.random() * 999999
                    r2 = Math.random() * 999999
                }
                const newTeam = {
                    teamname: req.body.teamname,
                    editors: [username],
                    viewers: [],
                    editorCode: Math.floor(r1).toString(),
                    viewerCode: Math.floor(r2).toString()
                }
                const insertTeam = await teams.insertOne(newTeam)
                const users = client.db("volleyball").collection("users")
                await users.updateOne({ username }, { $set: { teamid: insertTeam.insertedId } })
                const token = jwt.sign(
                    {
                        username,
                        canEdit: true
                    },
                    "RANDOM-TOKEN",
                    { expiresIn: "24h" }
                )
                res.status(200).send({ token, teamData: { ...newTeam, _id: insertTeam.insertedId, players: [], games: [] } })
            }
        } catch (error) {
            console.log(error)
            res.status(500).send()
        }
    }

    async joinTeam(req, res) {
        try {
            const teams = client.db("volleyball").collection("teams")
            const existingTeam = await teams.findOne({ teamname: req.body.teamname })
            let canEdit = true
            if (existingTeam) {
                const username = req.body.username.toLowerCase()
                if (req.body.joinCode === existingTeam.editorCode) {
                    await teams.updateOne({ teamname: req.body.teamname }, {
                        $push: {
                            editors: username
                        }
                    })
                    existingTeam.editors.push(username)
                } else if (req.body.joinCode === existingTeam.viewerCode) {
                    await teams.updateOne({ teamname: req.body.teamname }, {
                        $push: {
                            viewers: username
                        }
                    })
                    existingTeam.viewers.push(username)
                    canEdit = false
                } else {
                    return res.status(401).json({ message: 'Invalid invite code' })
                }
                const users = client.db("volleyball").collection("users")
                await users.updateOne({ username: req.body.username }, { $set: { teamid: existingTeam._id } })
                const players = client.db("volleyball").collection("players")
                const games = client.db("volleyball").collection("games")
                const existingPlayers = await players.find({ teamid: existingTeam._id.toString() }).toArray()
                const existingGames = await games.find({ teamid: existingTeam._id.toString() }).toArray()
                const token = jwt.sign(
                    {
                        username,
                        canEdit
                    },
                    "RANDOM-TOKEN",
                    { expiresIn: "24h" }
                )
                res.status(200).json({
                    token,
                    teamData: {
                        ...existingTeam,
                        players: existingPlayers,
                        games: existingGames
                    }
                })
            } else {
                res.status(404).json({ message: 'Team not found' })
            }
        } catch (error) {
            console.log(error)
            res.status(500).json({ ...error, message: 'internal server error. try again later' })
        }
    }

    async createPlayer(req, res) {
        if (req.user.canEdit) {
            try {
                const players = client.db("volleyball").collection("players")
                const insertPlayer = await players.insertOne({
                    name: req.query.playername,
                    teamid: req.query.teamid
                })
                res.status(200).send(insertPlayer.insertedId)
            } catch (error) {
                console.log(error)
                res.status(500).json({ ...error, message: 'internal server error. try again later' })
            }
        } else {
            res.status(401).send()
        }
    }

    async editPlayer(req, res) {
        if (req.user.canEdit) {
            try {
                const players = client.db("volleyball").collection("players")
                const updatePlayer = await players.updateOne({ _id: ObjectId.createFromHexString(req.query.playerid) },
                    {
                        $set: {
                            name: req.query.name
                        }
                    })
                res.status(200).json(updatePlayer.acknowledged)
            } catch (error) {
                console.log(error)
                res.status(500).json({ ...error, message: 'internal server error. try again later' })
            }
        } else {
            res.status(401).send()
        }
    }

    async deletePlayer(req, res) {
        if (req.user.canEdit) {
            try {
                const players = client.db("volleyball").collection("players")
                const deletePlayer = await players.deleteOne({ _id: ObjectId.createFromHexString(req.query.playerid) })
                res.status(200).send(deletePlayer.acknowledged)
            } catch (error) {
                console.log(error)
                res.status(500).json({ ...error, message: 'internal server error. try again later' })
            }
        } else {
            res.status(401).send()
        }
    }

    async createGame(req, res) {
        if (req.user.canEdit) {
            try {
                const games = client.db("volleyball").collection("games")
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
                res.status(500).json({ ...error, message: 'internal server error. try again later' })
            }
        } else {
            res.status(401).send()
        }
    }

    async getGame(req, res) {
        try {
            const games = client.db("volleyball").collection("games")
            const existingGame = await games.findOne({ _id: ObjectId.createFromHexString(req.query.gameid) })
            res.status(200).json(existingGame)
        } catch (error) {
            console.log(error)
            res.status(500).json({ ...error, message: 'internal server error. try again later' })
        }
    }

    async editGame(req, res) {
        if (req.user.canEdit) {
            try {
                const games = client.db("volleyball").collection("games")
                const updateGame = await games.updateOne({ _id: ObjectId.createFromHexString(req.query.gameid) },
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
                res.status(500).json({ ...error, message: 'internal server error. try again later' })
            }
        } else {
            res.status(401).send()
        }
    }

    async deleteGame(req, res) {
        if (req.user.canEdit) {
            try {
                const games = client.db("volleyball").collection("games")
                const deleteGame = await games.deleteOne({ _id: ObjectId.createFromHexString(req.query.gameid) })
                res.status(200).send(deleteGame.acknowledged)
            } catch (error) {
                console.log(error)
                res.status(500).json({ ...error, message: 'internal server error. try again later' })
            }
        } else {
            res.status(401).send()
        }
    }

    async putPlay(req, res) {
        if (req.user.canEdit) {
            try {
                const games = client.db("volleyball").collection("games")
                const updateGame = await games.findOneAndUpdate({ _id: ObjectId.createFromHexString(req.query.gameid) },
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
                    const stats = client.db("volleyball").collection("stats")
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
                    res.status(404).json({ message: 'Game not found' })
                }
            } catch (error) {
                console.log(error)
                res.status(500).json({ ...error, message: 'internal server error. try again later' })
            }
        } else {
            res.status(401).send()
        }
    }

    async undo(req, res) {
        if (req.user.canEdit) {
            try {
                const lastPlay = req.body.lastPlay
                const games = client.db("volleyball").collection("games")
                const updateGame = await games.findOneAndUpdate({ _id: ObjectId.createFromHexString(req.query.gameid) }, {
                    $pop: {
                        history: 1
                    }
                }, {
                    returnDocument: "after"
                })
                if (updateGame) {
                    const stats = client.db("volleyball").collection("stats")
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
                        res.status(500).json({ message: 'Failed to undo' })
                    }
                } else {
                    res.status(404).json({ message: 'Invalid game id' })
                }
            } catch (error) {
                console.log(error)
                res.status(500).json({ ...error, message: 'internal server error. try again later' })
            }
        } else {
            res.status(401).send()
        }
    }

    async redo(req, res) {
        if (req.user.canEdit) {
            try {
                const lastUndo = req.body.lastUndo
                const games = client.db("volleyball").collection("games")
                const updateGame = await games.findOneAndUpdate({ _id: ObjectId.createFromHexString(req.query.gameid) },
                    {
                        $push: {
                            history: lastUndo
                        }
                    }, {
                    returnDocument: "after"
                })
                if (updateGame) {
                    const stats = client.db("volleyball").collection("stats")
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
                        res.status(500).json({ message: 'Failed to redo' })
                    }
                } else {
                    res.status(404).json({ message: 'Invalid game id' })
                }
            } catch (error) {
                console.log(error)
                res.status(500).json({ ...error, message: 'internal server error. try again later' })
            }
        } else {
            res.status(401).send()
        }
    }

    async getStats(req, res) {
        try {
            const stats = client.db("volleyball").collection("stats")
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
            res.status(500).json({ ...error, message: 'internal server error. try again later' })
        }
    }

    async updateAccess(req, res) {
        if (req.user.canEdit) {
            const teams = client.db("volleyball").collection("teams")
            const existingTeam = await teams.findOne({ teamname: req.query.teamname })
            if (existingTeam) {
                const viewers = existingTeam.viewers
                const editors = existingTeam.editors
                if (req.query.canEdit === "true" && viewers.includes(req.query.member) && !editors.includes(req.query.member)) {
                    viewers.splice(viewers.findIndex(m => m === req.query.member), 1)
                    editors.push(req.query.member)
                } else if (req.query.canEdit === "false" && !viewers.includes(req.query.member) && editors.includes(req.query.member)) {
                    editors.splice(viewers.findIndex(m => m === req.query.member), 1)
                    viewers.push(req.query.member)
                } else {
                    return res.status(400).send()
                }
                const updateTeam = await teams.updateOne({ teamname: req.query.teamname }, {
                    $set: {
                        viewers,
                        editors
                    }
                })
                res.status(200).send(updateTeam)
            } else {
                res.status(404).send()
            }
        } else {
            res.status(401).send()
        }
    }
}