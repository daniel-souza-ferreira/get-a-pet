const User = require('../models/User')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const createUserToken = require('../helpers/create-user-token')
const getToken = require('../helpers/get-token')
const getUserByToken = require('../helpers/get-user-by-token')

module.exports = class UserController {
    static async register(req, res) {
        const { name, email, password, confirmpassword, phone } = req.body
        
        // validations
        const fieldsToValidate = [
            "name",
            "email",
            "password",
            "confirmpassword",
            "phone"
        ]

        for (const fieldIdentifier of fieldsToValidate) {
            if (!req.body[fieldIdentifier]) {
                return res.status(422).json({
                    message: `O campo ${fieldIdentifier} é obrigatório`
                })
            }
        }

        if (password !== confirmpassword) {
            return res.status(422).json({
                message: 'A senha e a confirmação de senha precisam ser iguais!'
            })
        }

        // TODO: Validar email por meio de regex

        // check if user exists
        const userWithSentEmail = await User.findOne({ email: email })
        if (userWithSentEmail) {
            return res.status(422).json({
                message: 'Por favor, utilize outro e-mail!'
            })
        }

        // create a password
        const salt = await bcrypt.genSalt(12)
        const passwordHash = await bcrypt.hash(password, salt)

        // create a user
        const user = new User({
            name,
            email,
            phone,
            password: passwordHash
        })

        try {
            const newUser = await user.save()
            await createUserToken(newUser, req, res)
        } catch (error) {
            res.status(500).json({
                message: error
            })
        }
    }

    static async login(req, res) {
        const { email, password } = req.body

        // validations
        const fieldsToValidate = [
            "email",
            "password"
        ]

        for (const fieldIdentifier of fieldsToValidate) {
            if (!req.body[fieldIdentifier]) {
                return res.status(422).json({
                    message: `O campo ${fieldIdentifier} é obrigatório`
                })
            }
        }

        const user = await User.findOne({ email: email })
        if (!user) {
            return res.status(422).json({
                message: 'Não há usuário cadastrado com este e-mail'
            })
        }

        const checkPassword = await bcrypt.compare(password, user.password)
        if (!checkPassword) {
            return res.status(422).json({
                message: 'Senha inválida'
            })
        }

        await createUserToken(user, req, res)
    }

    static async checkUser(req, res) {
        let currentUser

        if (req.headers.authorization) {
            const token = getToken(req)
            const decoded = jwt.verify(token, 'oursecret')

            currentUser = await User.findById(decoded.id)
            currentUser.password = undefined

        } else {
            currentUser = null
        }

        res.status(200).send(currentUser)
    }

    static async getUserById(req, res) {
        const id = req.params.id
        const user = await User.findById(id).select("-password")

        if (!user) {
            return res.status(422).json({
                message: 'Usuário não encontrado'
            })
        }

        res.status(200).json({ user })
    }

    static async editUser(req, res) {
        const id = req.params.id
        const { name, email, phone, password, confirmpassword } = req.body

        const token = getToken(req)
        const user = await getUserByToken(token)

        // validations
        const fieldsToValidate = [
            "name",
            "email",
            "phone"
        ]

        for (const fieldIdentifier of fieldsToValidate) {
            if (!req.body[fieldIdentifier]) {
                return res.status(422).json({
                    message: `O campo ${fieldIdentifier} é obrigatório`
                })
            }
        }

        user.phone = phone
        user.name = name

        // check if email has already taken
        const userExists = await User.findOne({ email: email })
        if (userExists && user.email !== email) {
            return res.status(422).json({
                message: 'Utilize outro e-mail!'
            })
        }
        user.email = email

        if (password != confirmpassword) {
            return res.status(422).json({
                message: 'As senhas não conferem!'
            })
        } else if (password === confirmpassword && password != null) {
            const salt = await bcrypt.genSalt(12)
            const passwordHash = await bcrypt.hash(password, salt)

            user.password = passwordHash
        }

        if (req.file) {
            user.image = req.file.filename
        }
        
        try {
            // returns user updated data
            const updatedUser = await User.findOneAndUpdate(
                { _id: user._id },
                { $set: user },
                { new: true }
            )

            res.status(200).json({
                message: 'Usuário atualizado com sucesso!'
            })
        } catch (error) {
            return res.status(500).json({
                message: error
            })
        }
    }
}