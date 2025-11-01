import mongoose, { Schema } from "mongoose";;

const messageSchema = new Schema({
    senderId: {type: mongoose.Schema.Types.ObjectId, ref: "User", requried: true},
    receiverId: {type: mongoose.Schema.Types.ObjectId, ref: "User", requried: true},
    text: {type: String},
    image: {type: String},
    seen: {type: Boolean, default: false},
}, {timestamps: true});

const Message = mongoose.model("Message", messageSchema);

export default Message;