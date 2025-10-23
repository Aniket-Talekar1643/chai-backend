import { User } from '../models/user.models.js';
import jwt from 'jsonwebtoken';

export const verifyJWT = async function(req, res, next){
    try{
        // Use 'req.cookies' (plural)
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

        // console.log(req.cookies);
        
        if(!token){
            return res.status(401).json({ message: "Unauthorized request" });
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        const user = await User.findById(decodedToken?._id).select("-password -refreshToken");

        if(!user){
            return res.status(401).json({ message: "Invalid access token" });
        }

        req.user = user;
        next();
    }catch(err){
        return res.status(401).json({ message: err?.message || "Invalid access token" });
    }
};
