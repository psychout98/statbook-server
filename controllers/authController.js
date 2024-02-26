import { client } from "../index.js"
import * as bcrypt from "bcrypt"
import * as jwt from "jsonwebtoken"
import { ObjectId } from "mongodb"

export default class AuthController {

    async register(req, res) {
        bcrypt.hash(request.body.password, 10)
            .then(async (hashedPassword) => {
                const users = client.db("volleyball").collection("users")
                const existingUser = await users.findOne({ username: req.body.username })
                if (existingUser) {
                    res.status(400).json({ message: 'Username taken' })
                } else {
                    const insertUser = await users.insertOne({
                        username: req.body.username,
                        password: hashedPassword
                    })
                    const token = jwt.sign(
                        {
                            userId: insertUser.insertedId,
                            username: req.body.username,
                        },
                        "RANDOM-TOKEN",
                        { expiresIn: "24h" }
                    )
                    res.status(200).json({ token })
                }
            })
            .catch((error) => {
                response.status(500).json({
                    message: "Password was not hashed successfully",
                    error
                })
            })
    }

    async login(req, res) {
        const users = client.db("volleyball").collection("users")
        const existingUser = await users.findOne({ username: req.body.username })
        if (existingUser) {
            bcrypt.compare(req.body.password, existingUser.password)
                .then(async (passwordCheck) => {
                    if (!passwordCheck) {
                        return res.status(400).json({
                            message: "Password does not match",
                            error,
                        })
                    }
                    const token = jwt.sign(
                        {
                            userId: existingUser._id,
                            username: req.body.username,
                        },
                        "RANDOM-TOKEN",
                        { expiresIn: "24h" }
                    )
                    let teamData
                    if (existingUser.teamid) {
                        const teams = client.db("volleyball").collection("teams")
                        const existingTeam = await teams.findOne({ _id: ObjectId.createFromHexString(existingUser.teamid) })
                        const players = client.db("volleyball").collection("players")
                        const games = client.db("volleyball").collection("games")
                        const existingPlayers = await players.find({ teamid: existingTeam._id.toString() }).toArray()
                        const existingGames = await games.find({ teamid: existingTeam._id.toString() }).toArray()
                        teamData = { ...existingTeam, players: existingPlayers, games: existingGames }
                    }
                    res.status(200).json({ token, teamData })
                })
        }
    }
}