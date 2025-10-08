const registerUser = async (req, res, next) => {
    try {
        res.status(201).json({ message: "User registered" });
    } catch (err) {
        next(err);
        console.log(err);
    }
};
export default registerUser;