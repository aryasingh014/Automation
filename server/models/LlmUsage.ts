import mongoose, { Schema, Document } from 'mongoose';

export interface ILlmUsage extends Document {
  userId: string;
  userName: string;
  email: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  timestamp: Date;
}

const LlmUsageSchema: Schema = new Schema({
  userId: { type: String, required: true },
  userName: { type: String, default: 'Unknown User' },
  email: { type: String, required: true },
  provider: { type: String, required: true },
  model: { type: String, required: true },
  inputTokens: { type: Number, default: 0 },
  outputTokens: { type: Number, default: 0 },
  cost: { type: Number, default: 0 },
  timestamp: { type: Date, default: Date.now }
});

export default mongoose.model<ILlmUsage>('LlmUsage', LlmUsageSchema);
