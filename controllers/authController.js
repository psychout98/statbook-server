import { client } from "../index.js"
import * as bcrypt from "bcrypt"
import jwt from "jsonwebtoken"

export default class AuthController {

    async register(req, res) {
        if (!/^(?=.{8,20}$)(?![_.])(?!.*[_.]{2})[a-zA-Z0-9._]+(?<![_.])$/.test(req.body.username)) {
            return res.status(401).send()
        }
        bcrypt.hash(req.body.password, 10)
            .then(async (hashedPassword) => {
                const username = req.body.username.toLowerCase()
                const users = client.db("volleyball").collection("users")
                const existingUser = await users.findOne({ username })
                if (existingUser) {
                    res.status(401).send()
                } else {
                    await users.insertOne({
                        username,
                        password: hashedPassword
                    })
                    const token = jwt.sign(
                        {
                            username
                        },
                        "RANDOM-TOKEN",
                        { expiresIn: "24h" }
                    )
                    res.status(200).json({ token })
                }
            })
            .catch((error) => {
                console.log(error)
                res.status(500).send()
            })
    }

    async login(req, res) {
        const users = client.db("volleyball").collection("users")
        const existingUser = await users.findOne({ username: req.body.username })
        if (existingUser) {
            bcrypt.compare(req.body.password, existingUser.password)
                .then(async (passwordCheck) => {
                    if (!passwordCheck) {
                        return res.status(400).send()
                    }
                    if (existingUser.teamid) {
                        const teams = client.db("volleyball").collection("teams")
                        const existingTeam = await teams.findOne({ _id: existingUser.teamid })
                        const players = client.db("volleyball").collection("players")
                        const games = client.db("volleyball").collection("games")
                        const existingPlayers = await players.find({ teamid: existingTeam._id.toString() }).toArray()
                        const existingGames = await games.find({ teamid: existingTeam._id.toString() }).toArray()
                        const teamData = { ...existingTeam, players: existingPlayers, games: existingGames }
                        const token = jwt.sign(
                            {
                                username: req.body.username,
                                canEdit: existingTeam.editors.includes(req.body.username)
                            },
                            "RANDOM-TOKEN",
                            { expiresIn: "24h" }
                        )
                        res.status(200).json({ token, teamData })
                    } else {
                        const token = jwt.sign(
                            {
                                username: req.body.username
                            },
                            "RANDOM-TOKEN",
                            { expiresIn: "24h" }
                        )
                        res.status(200).json({ token })
                    }
                })
        } else {
            res.status(404).send()
        }
    }
}