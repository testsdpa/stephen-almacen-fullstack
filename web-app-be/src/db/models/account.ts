// src/models/Account.ts
import { Schema, model } from "mongoose";

const accountSchema = new Schema({
  address: { type: String, required: true, unique: true },
  balance: { type: Number, required: true },
  lastUpdated: { type: Date, default: Date.now },
});

export const Account = model("Account", accountSchema);
