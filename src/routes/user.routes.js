import {Router} from 'express';
import {registerUser,loginUser, logoutUser,refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, getUserChannelProfile} from '../controllers/user.controller.js';
import {upload} from '../middleware/multer.middleware.js';
import { verifyJWT } from '../middleware/auth.middleware.js';
;

const router=Router();

router.route("/register").post(
    upload.fields([
        {
            name:"avatar",
            maxCount:1
        },
        {
            name:"coverImage",
            maxCount:1
        }
    ]),
    registerUser);

router.route("/login").post(loginUser)
// secured routes

router.route("/loout").post(
    verifyJWT,
    logoutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/change-password").post(changeCurrentPassword);
router.route("/current-user").get(getCurrentUser);
router.route("/update-account").patch(verifyJWT,updateAccountDetails);
router.route("/c/:username").get(getUserChannelProfile);



export default router;