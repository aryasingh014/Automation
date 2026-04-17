import mongoose, { Schema, Document } from 'mongoose';

export interface ILlmConfig extends Document {
  provider: string;
  model: string;
  inputCost: number;
  outputCost: number;
  tokenLimit: number;
  rateLimit: number;
}

const LlmConfigSchema: Schema = new Schema({
  provider: { type: String, required: true },
  model: { type: String, required: true },
  inputCost: { type: Number, required: true },
  outputCost: { type: Number, required: true },
  tokenLimit: { type: Number, default: 0 }, // 0 = unlimited
  rateLimit: { type: Number, default: 0 }    // 0 = unlimited
});

// Compound index to ensure uniqueness per provider/model
LlmConfigSchema.index({ provider: 1, model: 1 }, { unique: true });

export default mongoose.model<ILlmConfig>('LlmConfig', LlmConfigSchema);
