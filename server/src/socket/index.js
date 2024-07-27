import mongoose from "mongoose";
import { Server as SocketIOServer } from "socket.io";

import { env } from "~/configs/environtment.config";
import ConversationModel from "~/models/conversation.model";
import MessageModel from "~/models/message.model";
import UserModel from "~/models/user.model";
import { getFileType, getMessageType } from "~/utils/algorithm";

const setupSocket = (server) => {
     const io = new SocketIOServer(server, {
          cors: {
               origin: env.CLIENT_DOMAIN,
               methods: ["GET", "POST"],
               credentials: true,
          },
     });

     const userSocketMap = new Map();

     const updateUserOnlineStatus = async (userId, isOnline) => {
          try {
               await UserModel.findByIdAndUpdate(
                    userId,
                    { isOnline },
                    { new: true }
               );
          } catch (error) {}
     };

     const createGroupConversation = async (message) => {
          try {
          } catch (error) {}
     };

     const getContatcs = async (message) => {
          const { userId } = message;
          const userSocketId = userSocketMap.get(userId);

          console.log(userId);

          try {
               const contacts = await ConversationModel.aggregate([
                    {
                         $match: {
                              $and: [
                                   {
                                        paticipants: {
                                             $in: [
                                                  new mongoose.Types.ObjectId(
                                                       userId
                                                  ),
                                             ],
                                        },
                                   },
                                   {
                                        isDeleted: false,
                                   },
                              ],
                         },
                    },
                    {
                         $lookup: {
                              from: "messages",
                              localField: "_id",
                              foreignField: "conversationId",
                              as: "messages",
                         },
                    },
                    {
                         $unwind: {
                              path: "$messages",
                         },
                    },
                    {
                         $group: {
                              _id: "$_id",
                              paticipants: { $last: "$paticipants" },
                              conversationType: { $last: "$conversationType" },
                              lastMessage: { $last: "$messages" },
                         },
                    },

                    {
                         $addFields: {
                              userContact: {
                                   $arrayElemAt: [
                                        {
                                             $filter: {
                                                  input: "$paticipants",
                                                  as: "participant",
                                                  cond: {
                                                       $ne: [
                                                            "$$participant",
                                                            new mongoose.Types.ObjectId(
                                                                 userId
                                                            ),
                                                       ],
                                                  },
                                             },
                                        },
                                        0,
                                   ],
                              },
                         },
                    },
                    {
                         $lookup: {
                              from: "users",
                              localField: "userContact",
                              foreignField: "_id",
                              as: "userContact",
                         },
                    },
                    {
                         $unwind: "$userContact",
                    },
                    {
                         $project: {
                              _id: 1,
                              conversationType: 1,
                              userContact: {
                                   _id: 1,
                                   firstname: 1,
                                   lastname: 1,
                                   email: 1,
                                   avatar: 1,
                              },
                              lastMessage: {
                                   _id: 1,
                                   senderId: 1,
                                   messageType: 1,
                                   messageContent: 1,
                                   fileType: 1,
                                   isSeen: 1,
                                   createdAt: 1,
                                   updatedAt: 1,
                              },
                         },
                    },
               ]);

               if (userSocketId) {
                    io.to(userSocketId).emit("recevieContacts", {
                         status: "success",
                         message: "Get contatcs successfully",
                         data: contacts,
                    });
               }
          } catch (error) {}
     };

     const getConversationDetail = async (message) => {
          const { conversationId, userId } = message;
          const userSocketId = userSocketMap.get(userId);

          try {
               const result = await MessageModel.aggregate([
                    {
                         $match: {
                              conversationId: new mongoose.Types.ObjectId(
                                   conversationId
                              ),
                              messageType: { $in: ["IMAGE", "FILE", "LINK"] },
                         },
                    },
                    { $sort: { createdAt: -1 } },
                    {
                         $group: {
                              _id: "$messageType",
                              count: { $sum: 1 },
                              messages: {
                                   $push: {
                                        _id: "$_id",
                                        conversationId: "$conversationId",
                                        senderId: "$senderId",
                                        messageContent: "$messageContent",
                                        messageType: "$messageType",
                                        fileType: "$fileType",
                                   },
                              },
                         },
                    },
                    {
                         $project: {
                              _id: 0,
                              messageType: "$_id",
                              count: 1,
                              messages: 1,
                         },
                    },
               ]);

               const order = ["LINK", "FILE", "IMAGE"];
               const sortedResult = result.sort(
                    (a, b) =>
                         order.indexOf(b.messageType) -
                         order.indexOf(a.messageType)
               );

               if (userSocketId) {
                    io.to(userSocketId).emit("receiveConversationDetail", {
                         status: "success",
                         message: "Get conversation messages successfully",
                         data: sortedResult,
                    });
               }
          } catch (error) {}
     };

     const getConversation = async (message) => {
          const { conversationId, userId } = message;

          try {
               const userSocketId = userSocketMap.get(userId);

               const conversation = await ConversationModel.findById(
                    conversationId
               ).populate("paticipants", "email");

               const messages = await MessageModel.find({
                    conversationId: conversation._id,
               });

               if (userSocketId) {
                    io.to(userSocketId).emit("receiveConversation", {
                         status: "success",
                         message: "",
                         data: {
                              conversation,
                              messages,
                         },
                    });
               }
          } catch (error) {}
     };

     const sendMessage = async (message) => {
          const { conversationId, senderId, recepientId, messageContent } =
               message;

          let currentConversationId = conversationId;

          try {
               const senderSocketId = userSocketMap.get(senderId);
               const recepientSocketId = userSocketMap.get(recepientId);

               const findConversation = await ConversationModel.findOne({
                    paticipants: { $all: [senderId, recepientId] },
               });

               if (!findConversation) {
                    const newConversation = await ConversationModel.create({
                         createtorId: senderId,
                         paticipants: [senderId, recepientId],
                    });

                    currentConversationId = newConversation._id;
               } else {
                    currentConversationId = findConversation._id;
               }

               const newMessage = new MessageModel({
                    conversationId: currentConversationId,
                    senderId,
                    messageContent,
                    messageType: getMessageType(messageContent),
               });

               if (getMessageType(messageContent) === "FILE") {
                    newMessage.fileType = getFileType(messageContent);
               }

               await newMessage.save();

               const findMessage = await MessageModel.findById(
                    newMessage._id
               ).populate({
                    path: "senderId",
                    select: "_id firstname lastname avatar email",
               });

               if (senderSocketId) {
                    io.to(senderSocketId).emit("receiveMessage", {
                         status: "success",
                         message: "Receive message is successfully",
                         data: findMessage,
                    });
               }
               if (recepientSocketId) {
                    io.to(recepientSocketId).emit("receiveMessage", {
                         status: "success",
                         message: "Receive message is successfully",
                         data: findMessage,
                    });
               }
          } catch (error) {
               console.log(error);
          }
     };

     const disconnect = async (socket) => {
          console.log(`Client disconected: ${socket.id}`);

          for (const [userId, socketId] of userSocketMap.entries()) {
               if (socketId === socket.id) {
                    userSocketMap.delete(userId);
                    await updateUserOnlineStatus(userId, false);
                    break;
               }
          }
     };

     io.on("connection", async (socket) => {
          const userId = socket.handshake.query.userId;

          if (userId) {
               userSocketMap.set(userId, socket.id);
               console.log(
                    `✅ User ${userId} connected socket is successfully with socket ID: ${socket.id}`
               );
               await updateUserOnlineStatus(userId, true);
          } else {
               console.log("User ID not provided during connection");
          }

          socket.on("getContacts", getContatcs);
          socket.on("getConversationDetail", getConversationDetail);
          socket.on("createGroup", createGroupConversation);
          socket.on("getConsersation", getConversation);
          socket.on("sendMessage", sendMessage);
          socket.on("disconnect", () => disconnect(socket));
     });
};

export default setupSocket;
