import { client } from "../index.js"
import { baseStats } from "../static/statObjects.js"
import { ObjectId } from "mongodb"

export default class StatController {

    async createTeam(req, res) {
        try {
            const teams = client.db("volleyball").collection("teams")
            const existingTeam = await teams.findOne({ teamname: req.body.teamname })
            if (existingTeam) {
                res.status(401).json({ message: 'team name taken' })
            } else {
                let r1 = Math.random() * 999999
                let r2 = Math.random() * 999999
                let r3 = Math.random() * 999999
                while (r1 === r2 || r2 === r3 || r1 === r3) {
                    r1 = Math.random() * 999999
                    r2 = Math.random() * 999999
                    r3 = Math.random() * 999999
                }
                const insertTeam = await teams.insertOne({
                    teamname: req.body.teamname,
                    admins: [req.body.admin],
                    editors: [],
                    viewers: [],
                    adminCode: r1,
                    editorCode: r2,
                    viewerCode: r3
                })
                res.status(200).send({ _id: insertTeam.insertedId, teamname: req.body.teamname, players: [], games: [] })
            }
        } catch (error) {
            console.log(error)
            res.status(500).json({ ...error, message: 'internal server error. try again later' })
        }
    }

    async joinTeam(req, res) {
        try {
            const teams = client.db("volleyball").collection("teams")
            const existingTeam = await teams.findOne({ teamname: req.body.teamname })
            if (existingTeam) {
                if (req.body.joinCode === existingTeam.adminCode) {
                    await teams.updateOne({ teamname: req.body.teamname }, {
                        $push: {
                            admins: req.body.username
                        }
                    })
                    existingTeam.admins.push(req.body.username)
                } else if (req.body.joinCode === existingTeam.editorCode) {
                    await teams.updateOne({ teamname: req.body.teamname }, {
                        $push: {
                            editors: req.body.username
                        }
                    })
                    existingTeam.editors.push(req.body.username)
                } else if (req.body.joinCode === existingTeam.viewerCode) {
                    await teams.updateOne({ teamname: req.body.teamname }, {
                        $push: {
                            viewers: req.body.username
                        }
                    })
                    existingTeam.viewers.push(req.body.username)
                } else {
                    return res.status(401).json({ message: 'Invalid invite code' })
                }
                const users = client.db("volleyball").collection("users")
                await users.updateOne({ username: req.body.username }, { teamname: req.body.teamname })
                const players = client.db("volleyball").collection("players")
                const games = client.db("volleyball").collection("games")
                const existingPlayers = await players.find({ teamid: existingTeam._id.toString() }).toArray()
                const existingGames = await games.find({ teamid: existingTeam._id.toString() }).toArray()
                res.status(200).json({ ...existingTeam, players: existingPlayers, games: existingGames })
            } else {
                res.status(404).json({ message: 'Team not found' })
            }
        } catch (error) {
            console.log(error)
            res.status(500).json({ ...error, message: 'internal server error. try again later' })
        }
    }

    async createPlayer(req, res) {
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
    }

    async editPlayer(req, res) {
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
    }

    async deletePlayer(req, res) {
        try {
            const players = client.db("volleyball").collection("players")
            const deletePlayer = await players.deleteOne({ _id: ObjectId.createFromHexString(req.query.playerid) })
            res.status(200).send(deletePlayer.acknowledged)
        } catch (error) {
            console.log(error)
            res.status(500).json({ ...error, message: 'internal server error. try again later' })
        }
    }

    async createGame(req, res) {
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
    }

    async deleteGame(req, res) {
        try {
            const games = client.db("volleyball").collection("games")
            const deleteGame = await games.deleteOne({ _id: ObjectId.createFromHexString(req.query.gameid) })
            res.status(200).send(deleteGame.acknowledged)
        } catch (error) {
            console.log(error)
            res.status(500).json({ ...error, message: 'internal server error. try again later' })
        }
    }

    async putPlay(req, res) {
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
    }

    async undo(req, res) {
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
    }

    async redo(req, res) {
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
}