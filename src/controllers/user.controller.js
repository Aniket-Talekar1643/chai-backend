import { User } from '../models/user.models.js';
import { ApiError } from '../utils/ApiError.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js'
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

export const generateAccessAndRefreshToken = async function (userId) {
  try {
    const user = await User.findById(userId)
    const accessToken = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()

    user.refreshToken = refreshToken
    await user.save({
      validateBeforeSave: false
    });

    return { accessToken, refreshToken };
  } catch (err) {

    throw new ApiError(400, "something went wrong while generating refresh or access token");
  }
}


export const registerUser = async (req, res, next) => {
  //validation not empty
  //check user already exists :username,email
  //check for imgaes ,check for avatar
  //upload to cloudinary,avatar
  //crrate user in db -create entry in d
  //remove password and refresh token from response
  //check user creation success
  try {
    const { username, email, fullname, password } = req.body;

    if (!fullname || !email || !password || !username) {
      throw new ApiError(400, "All fields are required");
    }
    // console.log(req.body)

    const existedUser = await User.findOne({
      $or: [{ username }, { email }],
    });
    if (existedUser) {
      throw new ApiError(409, "User with email or username already exists");
    }



    // console.log(req.body);
    // console.log("---------",req.files);

    const avatarLocalPath = req.files.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;
    // console.log("avatarLocalPath, avatarLocalPath",avatarLocalPath, req.files.avatar[0])

    if (!avatarLocalPath) {
      throw new ApiError(400, "Avatars file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    console.log("avatar", avatar)

    if (!avatar) {
      throw new ApiError(400, "Avatars file is required")
    }

    const user = await User.create({

      fullname,
      avatar: avatar.url,
      coverImage: coverImage?.url || "",
      email,
      password,
      username: username.toLowerCase()
    })
    const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
    )
    if (!createdUser) {
      throw new ApiError(500, "Something went wrong while registration the user")
    }
    return res.status(201).json(
      new ApiResponse(200, createdUser, "User registerd Successfully")
    )
  } catch (err) {
    next(err);
  }
};

//req.body
//username or mail
//find the user
//password check  
//access token
//send cookies
//res successfully
export const loginUser = async (req, res) => {
  try {
    const { email, username, password } = req.body;
    console.log("Request body:", req.body);

    if ((!username && !email) || !password) {
      throw new ApiError(400, "Username/email and password are required");
    }

    const user = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (!user) {
      throw new ApiError(404, "User does not exist");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
      throw new ApiError(401, "Incorrect password");
    }

    // const validpassword =user.password === password;
    // if(!validpassword){
    //   throw new ApiError(400,json({
    //     measaage :"password incorrect"
    //   }))
    // }
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
      httpOnly: true,
      secure: true
    }

    return res.status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            user: loggedInUser, accessToken, refreshToken
          },
          "User logged in Successfully"
        )
      );

  } catch (err) {
    console.error("Login error:", err);

  }
};



export const logoutUser = async function (req, res) {
  try {
    await User.findByIdAndUpdate
      (
        req.user._id,
        {
          $set: {
            refreshToken: undefined
          }
        },
        {
          new: true
        }

      )

    const options = {
      httpOnly: true,
      secure: true
    }
    res.status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .josn({
        message: "user Logout "
      })
  } catch (err) {

  }
}
export const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request")
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    )

    const user = await User.findById(decodedToken?._id)

    if (!user) {
      throw new ApiError(401, "Invalid refresh token")
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used")

    }

    const options = {
      httpOnly: true,
      secure: true
    }

    const { accessToken, newRefreshToken } = await generateAccessAndRefereshTokens(user._id)

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed"
        )
      )
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token")
  }
})
export const changeCurrentPassword = async function () {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body

    const user = User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
      throw new ApiError(400, "invalid password");
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave });

    if (newPassword !== confirmPassword) {
      throw new ApiError(400, "Invalid  newPassword and confirmPassword");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, {}, 'password change successfully'))


  } catch (err) {

  }
}
export const getCurrentUser = async function () {
  return res.status(200).json(200, req.user, "Current user fetched");

}
export const updateAccountDetails = async function () {
  try {
    const { fullname, email } = req.body

    if (!(fullname && email)) {
      throw new ApiError(400, "fullname and email is required");
    }

    const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
        $set: {
          fullname: fullname,
          email: email
        }
      },
      { new: true }
    ).select("-password");

    return res
      .status(200)
      .json(new ApiResponse(200, user, "Account details updated successfully"));
  }
  catch (err) {

  }
}

export const getUserChannelProfile = async function (req, res) {
  try {
    const channel = await User.aggregate([
      { $match: { username: username?.toLowerCase() } },
      {
        $lookup: {
          from: "subscriptions",
          localField: "_id",
          foreignField: "channel",
          as: "subscribers"
        }
      },
      {
        $lookup: {
          from: "subscriptions",
          localField: "_id",
          foreignField: "subscriber",
          as: "subscribedTo"
        }
      },
      {
        $addFields: {
          subscriberCount: { $size: "$subscribers" },
          channelSubscribedToCount: { $size: "$subscribedTo" },
          isSubscribe: {
            $cond: {
              if: { $in: [req.user?._id, "$subscribers.subscriber"] },
              then: true,
              else: false
            }
          }
        }
      },
      {
        $project: {
          fullname: 1,
          username: 1,
          avatar: 1,
          coverImage: 1,
          isSubscribe: 1,
          subscriberCount: 1,
          channelSubscribedToCount: 1,
          email: 1
        }
      }
    ]);

    if (!channel?.length) {
      throw new ApiError(400, "Channel does not exist");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, channel[0], "User channel fetched successfully"));
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
export const getWatchHistory = async function (req,res) {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id)
      }
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "History",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullname: 1,
                    avatar: 1,
                    username: 1
                  }
                }
              ]
            }
          }
        ]
      }
    },

  ])
  return res.status(200)
  .json(
    new ApiResponse(200,user[0].watchHistory,"watch history Successfully fetched")
  )
}
