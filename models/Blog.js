const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const blogSchema = new Schema({
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    content: { type: String, required: true },
    coverImageUrl: { type: String, default: '' },
    tags: { type: [String], default: [] },
    author: {
        id: { type: String, required: true },
        name: { type: String, required: true }
    },
}, { timestamps: true });

module.exports = mongoose.model("Blog", blogSchema, "blogs");