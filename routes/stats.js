import StatController from "../controllers/statController.js";
import express from "express";
import * as jwt from "jsonwebtoken"

export const router = express.Router()

router.use(async (req, res, next) => {
    try {
        const token = req.headers.authorization.split(" ")[1]
        const decodedToken = jwt.verify(token, "RANDOM-TOKEN")
        req.user = decodedToken
        next()
      } catch (error) {
        res.status(401).json({
          error: new Error("Invalid request!"),
        })
      }
})

const statController = new StatController()

router.post("/team/create", statController.createTeam.bind(statController))

router.post("/team/join", statController.joinTeam.bind(statController))

router.post("/player", statController.createPlayer.bind(statController))

router.put("/player", statController.editPlayer.bind(statController))

router.delete("/player", statController.deletePlayer.bind(statController))

router.post("/game", statController.createGame.bind(statController))

router.get("/game", statController.getGame.bind(statController))

router.put("/game", statController.editGame.bind(statController))

router.delete("/game", statController.deleteGame.bind(statController))

router.put("/play", statController.putPlay.bind(statController))

router.put("/undo", statController.undo.bind(statController))

router.put("/redo", statController.redo.bind(statController))

router.post("/stats", statController.getStats.bind(statController))